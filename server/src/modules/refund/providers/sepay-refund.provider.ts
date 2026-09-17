import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { IRefundProvider, RefundContext, RefundResult } from '../interfaces/refund-provider.interface';

/**
 * SePay Refund API v2: POST {BASE}/v2/transactions/{id}/refund + X-Idempotency-Key.
 * - SEPAY_REFUND_ENABLED=false -> bỏ qua round-trip, fallback MANUAL ngay.
 * - SEPAY_REFUND_MOCK_SUCCESS=true (dev) -> giả lập COMPLETED để test luồng tự động.
 * - Bắt riêng 422/unsupported_bank + lỗi mạng -> fallback MANUAL, không văng 500.
 */
@Injectable()
export class SepayRefundProvider implements IRefundProvider {
  readonly code = 'SEPAY' as const;
  private readonly logger = new Logger(SepayRefundProvider.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  canHandle(order: any, _request: any): boolean {
    const providers = (order?.payments || []).map((p: any) => String(p?.provider));
    return providers.includes('BANK_TRANSFER');
  }

  private toManualFallback(reason: string, raw?: any): RefundResult {
    return {
      ok: false,
      status: 'APPROVED',
      channel: 'MANUAL',
      needsManualFallback: true,
      failureReason: reason,
      rawResponse: raw,
    };
  }

  /** Trích transaction gốc: Payment.raw (webhook đã lưu) -> fallback query SePay GET /v2/transactions. */
  private async resolveOriginTransactionId(order: any): Promise<{ id: string | null; raw: any }> {
    const payments = order?.payments || [];
    for (const p of payments) {
      try {
        const raw = typeof p?.raw === 'string' ? JSON.parse(p.raw) : p?.raw;
        const cand =
          raw?.id || raw?.transaction_id || raw?.transactionId || raw?.referenceCode || raw?.reference_code || null;
        if (cand) return { id: String(cand), raw };
      } catch {
        /* raw string không parse được -> thử tiếp */
      }
    }
    // Fallback: query SePay theo mã đơn (best-effort, không chặn luồng)
    try {
      const base = this.config.get<string>('SEPAY_API_BASE_URL') || 'https://userapi.sepay.vn';
      const key = this.config.get<string>('SEPAY_API_KEY');
      if (!key) return { id: null, raw: null };
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${base}/v2/transactions?reference=${encodeURIComponent(order.code)}`, {
        headers: { Authorization: `Apikey ${key}` },
        signal: ctrl.signal,
      }).finally(() => clearTimeout(t));
      const json: any = await res.json().catch(() => null);
      const first = json?.data?.[0] || json?.transactions?.[0] || json?.[0];
      const cand = first?.id || first?.transaction_id || null;
      return { id: cand ? String(cand) : null, raw: json };
    } catch (e: any) {
      this.logger.warn(`Resolve SePay origin tx failed: ${e?.message}`);
      return { id: null, raw: null };
    }
  }

  async refund(ctx: RefundContext): Promise<RefundResult> {
    const { request, order } = ctx;
    const enabled = String(this.config.get('SEPAY_REFUND_ENABLED') || 'false').toLowerCase() === 'true';
    if (!enabled) {
      return this.toManualFallback(
        'Hoàn tự động qua SePay đang tắt (SEPAY_REFUND_ENABLED=false). Chuyển sang hoàn thủ công',
      );
    }
    const mockOk = String(this.config.get('SEPAY_REFUND_MOCK_SUCCESS') || 'false').toLowerCase() === 'true';
    if (mockOk) {
      return {
        ok: true,
        status: 'COMPLETED',
        channel: 'SEPAY',
        externalRefundId: `mock-${request.id}`,
        rawResponse: { mocked: true },
      };
    }

    const { id: originId, raw: originRaw } = await this.resolveOriginTransactionId(order);
    if (!originId) {
      return this.toManualFallback('Không tìm thấy giao dịch gốc SePay để hoàn tự động. Chuyển sang hoàn thủ công', originRaw);
    }

    // X-Idempotency-Key: refund-{orderCode}-{seq}, <= 100 ký tự
    const seq = String(request.id || '').slice(-6);
    let idemKey = `refund-${order.code}-${seq}`;
    if (idemKey.length > 100) idemKey = idemKey.slice(0, 100);

    try {
      const base = this.config.get<string>('SEPAY_API_BASE_URL') || 'https://userapi.sepay.vn';
      const key = this.config.get<string>('SEPAY_API_KEY');
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(`${base}/v2/transactions/${encodeURIComponent(originId)}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Apikey ${key}`,
          'X-Idempotency-Key': idemKey,
        },
        body: JSON.stringify({ amount: Number(request.amount || 0), reason: String(request.reason || '').slice(0, 500) }),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(t));
      const json: any = await res.json().catch(() => null);

      if (res.ok) {
        const extId = json?.id || json?.refund_id || json?.data?.id || null;
        return {
          ok: true,
          status: 'COMPLETED',
          channel: 'SEPAY',
          externalRefundId: extId ? String(extId) : undefined,
          rawResponse: json,
        };
      }
      const bodyStr = JSON.stringify(json || {});
      const isUnsupported =
        res.status === 422 || /unsupported_bank/i.test(bodyStr) || /unsupported/i.test(bodyStr);
      if (isUnsupported) {
        return this.toManualFallback(
          `Ngân hàng chưa hỗ trợ hoàn tự động qua SePay (${res.status} unsupported_bank). Chuyển sang hoàn thủ công`,
          { status: res.status, body: json },
        );
      }
      // Lỗi khác (500/timeout...): giữ APPROVED để admin đối soát, không cộng sổ bừa
      return this.toManualFallback(`SePay trả lỗi ${res.status}. Chuyển sang hoàn thủ công để đối soát`, {
        status: res.status,
        body: json,
      });
    } catch (e: any) {
      const msg = e?.name === 'AbortError' ? 'SePay timeout' : e?.message || 'Lỗi mạng SePay';
      this.logger.warn(`SePay refund network error ${request.id}: ${msg}`);
      return this.toManualFallback(`Gọi SePay thất bại (${msg}). Chuyển sang hoàn thủ công`, { error: msg });
    }
  }
}
