import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prismaClient/prisma.service";

export interface GhnTrackLog {
  status: string;
  statusName: string;
  time: string | null;
}

export interface ShippingTracking {
  found: boolean;
  orderCode: string;
  carrier: string;
  trackingCode?: string;
  status?: string;
  statusName?: string;
  expectedDelivery?: string | null;
  logs?: GhnTrackLog[];
  message?: string;
}

const GHN_STATUS_NAMES: Record<string, string> = {
  ready_to_pick: "Chờ lấy hàng",
  picking: "Đang lấy hàng",
  cancel: "Đã hủy",
  money_collect_picking: "Đang thu tiền lấy hàng",
  picked: "Đã lấy hàng",
  storing: "Lưu kho",
  transporting: "Đang luân chuyển",
  sorting: "Đang phân loại",
  delivering: "Đang giao hàng",
  money_collect_delivering: "Đang thu tiền giao hàng",
  delivered: "Giao thành công",
  delivery_fail: "Giao thất bại",
  waiting_to_return: "Chờ trả hàng",
  return: "Trả hàng",
  return_transporting: "Đang trả hàng",
  return_sorting: "Đang phân loại trả hàng",
  returning: "Đang hoàn hàng",
  return_fail: "Hoàn hàng thất bại",
  returned: "Đã hoàn hàng",
  exception: "Ngoại lệ",
  damage: "Hư hỏng",
  lost: "Thất lạc",
};

function toIsoString(value: unknown): string | null {
  if (value == null || value === "") return null;
  try {
    const num = typeof value === "number" ? value : Number(value);
    if (value != null && value !== "" && !isNaN(num) && num > 0) {
      // GHN lúc trả giây, lúc mili-giây (số hoặc chuỗi số)
      const ms = num < 1e12 ? num * 1000 : num;
      return new Date(ms).toISOString();
    }
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly shopId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.baseUrl = (
      this.configService.get<string>("GHN_BASE_URL") ||
      "https://dev-online-gateway.ghn.vn"
    ).replace(/\/$/, "");
    this.token = this.configService.get<string>("GHN_TOKEN") || "";
    this.shopId = this.configService.get<string>("GHN_SHOP_ID") || "";
  }

  // Cache RAM cho master-data GHN (địa giới ít đổi), TTL 24h
  private readonly masterCache = new Map<string, { time: number; data: any }>();
  private static readonly MASTER_TTL = 24 * 60 * 60 * 1000;
  private static readonly MAX_INSURANCE_STAGING = 5000000;

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      Token: this.token,
    };
    if (this.shopId) h["ShopId"] = this.shopId;
    return h;
  }

  private async ghnGet(path: string): Promise<any> {
    const cached = this.masterCache.get(path);
    if (cached && Date.now() - cached.time < ShippingService.MASTER_TTL) {
      return cached.data;
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || body.code !== 200) {
      throw new Error(body?.message || `GHN master-data lỗi (${path})`);
    }
    this.masterCache.set(path, { time: Date.now(), data: body.data });
    return body.data;
  }

  getProvinces() {
    return this.ghnGet("/shiip/public-api/master-data/province");
  }

  getDistricts(provinceId: number) {
    return this.ghnGet(
      `/shiip/public-api/master-data/district?province_id=${provinceId}`,
    );
  }

  getWards(districtId: number) {
    return this.ghnGet(
      `/shiip/public-api/master-data/ward?district_id=${districtId}`,
    );
  }

  /**
   * Tính phí ship GHN. weight tính bằng gram.
   */
  async calculateFee(dto: {
    toDistrictId: number;
    toWardCode: string;
    weight?: number;
    insuranceValue?: number;
    serviceTypeId?: number;
  }) {
    if (!this.token) throw new Error("Chưa cấu hình GHN");
    const fromDistrictId = Number(
      this.configService.get<string>("GHN_FROM_DISTRICT_ID") || 1454,
    );
    const insurance = Math.min(
      Math.max(0, Number(dto.insuranceValue || 0)),
      ShippingService.MAX_INSURANCE_STAGING,
    );
    const body = await this.ghnPost("/shiip/public-api/v2/shipping-order/fee", {
      from_district_id: fromDistrictId,
      to_district_id: Number(dto.toDistrictId),
      to_ward_code: String(dto.toWardCode),
      service_type_id: Number(dto.serviceTypeId || 2),
      weight: Math.max(50, Math.round(Number(dto.weight || 500))),
      insurance_value: insurance,
    });
    if (!body || body.code !== 200 || body.data == null) {
      throw new Error(
        body?.message || "GHN không tính được phí cho địa chỉ này",
      );
    }
    const total = Number(body.data.total ?? body.data.service_fee ?? 0);
    return {
      fee: total,
      breakdown: {
        serviceFee: Number(body.data.service_fee ?? 0),
        insuranceFee: Number(body.data.insurance_fee ?? 0),
        surcharges: body.data,
      },
    };
  }

  private async ghnPost(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    return res.json().catch(() => null);
  }

  /**
   * Tra cứu có kiểm tra sở hữu: user chỉ xem được đơn của mình (ADMIN xem tất cả).
   */
  async trackOrderForUser(
    orderCode: string,
    user: { userId?: string; role?: string },
  ): Promise<ShippingTracking> {
    const code = (orderCode || "").trim();
    let order = code
      ? await this.prisma.order.findUnique({
          where: { code },
          select: { userId: true, code: true },
        })
      : null;
    if (!order && code) {
      order = await this.prisma.order.findFirst({
        where: { shippingOrderCode: code },
        select: { userId: true, code: true },
      });
    }
    if (!order) {
      return {
        found: false,
        orderCode: code,
        carrier: "GHN Express",
        message: "Không tìm thấy đơn hàng",
      };
    }
    if (order.userId !== user?.userId && user?.role !== "ADMIN") {
      throw new ForbiddenException("Bạn không có quyền xem vận đơn này");
    }
    return this.trackOrder(code);
  }

  private ghnErrorMessage(body: any, fallback: string): string {
    const msg =
      body?.message ||
      body?.data?.message ||
      (typeof body?.data === "string" ? body.data : "");
    return msg ? `Lỗi gọi API: ${msg}` : fallback;
  }

  /**
   * Tạo đơn vận chuyển trên GHN cho đơn MegaMart (admin bấm tay).
   * Trả về mã vận đơn GHN + phí thực tế. Ném lỗi với message GHN để UI hiện.
   */
  async createGhnOrder(
    order: {
      id: string;
      code: string;
      total: number | bigint;
      shippingAddress: any;
      payments: Array<{
        provider: string;
        status: string;
        amount?: number | bigint;
      }>;
      items: Array<{
        quantity: number;
        variant?: { product?: { name?: string } | null } | null;
        price: number | bigint;
      }>;
    },
    opts: { weight?: number; note?: string; requiredNote?: string } = {},
  ) {
    if (!this.token) throw new Error("Chưa cấu hình GHN");
    const addr = order.shippingAddress || {};
    const toDistrictId = Number(addr.districtId);
    const toWardCode = String(addr.wardCode || "");
    if (!toDistrictId || !toWardCode) {
      throw new Error(
        "Địa chỉ giao hàng thiếu Quận/Huyện hoặc Phường/Xã (mã GHN). Vui lòng bổ sung trước khi tạo đơn.",
      );
    }

    const codAmount = (order.payments || []).reduce((sum, p) => {
      const provider = String(p.provider || "").toUpperCase();
      const status = String(p.status || "").toUpperCase();
      if (["COD", "OTHER"].includes(provider) && status !== "PAID") {
        return sum + Number(p.amount || 0);
      }
      return sum;
    }, 0);
    const itemCount = order.items.reduce(
      (s, i) => s + Number(i.quantity || 0),
      0,
    );
    const weight = Math.min(
      20000,
      Math.max(300, Math.round(Number(opts.weight || 0)) || itemCount * 500),
    );
    const clientCode =
      order.code.length > 50 ? order.code.slice(0, 50) : order.code;

    const body = await this.ghnPost(
      "/shiip/public-api/v2/shipping-order/create",
      {
        payment_type_id: 1,
        required_note: opts.requiredNote || "CHOXEMHANGKHONGTHU",
        to_name: String(addr.fullName || "Khách hàng").slice(0, 100),
        to_phone: String(addr.phone || "")
          .replace(/\D/g, "")
          .slice(0, 11),
        to_address: String(addr.address || "").slice(0, 200),
        to_district_id: toDistrictId,
        to_ward_code: toWardCode,
        cod_amount: codAmount,
        weight,
        length: 20,
        width: 15,
        height: 10,
        service_type_id: 2,
        client_order_code: clientCode,
        insurance_value: Math.min(
          Math.max(0, Math.round(Number(order.total))),
          ShippingService.MAX_INSURANCE_STAGING,
        ),
        note: opts.note ? String(opts.note).slice(0, 200) : undefined,
        content: `Don hang ${order.code} - MegaMart`,
        items: order.items.slice(0, 20).map((i) => ({
          name: String(i.variant?.product?.name || "San pham").slice(0, 100),
          quantity: Number(i.quantity),
          price: Math.max(0, Math.round(Number(i.price || 0))),
          weight: 500,
        })),
      },
    );

    if (!body || body.code !== 200 || !body.data?.order_code) {
      throw new Error(this.ghnErrorMessage(body, "GHN từ chối tạo đơn"));
    }
    const fee = await this.calculateFee({
      toDistrictId,
      toWardCode,
      weight,
      insuranceValue: Math.min(
        Math.max(0, Math.round(Number(order.total))),
        ShippingService.MAX_INSURANCE_STAGING,
      ),
    }).catch(() => ({ fee: 0, breakdown: {} }));

    return {
      orderCode: body.data.order_code as string,
      fee: fee.fee,
      expectedDelivery: toIsoString(body.data.leadtime),
      metadata: body.data,
    };
  }

  /**
   * Tạo link in vận đơn A5 từ GHN. Frontend mở link này ở tab mới để admin in phiếu.
   */
  async printGhnOrder(orderCode: string) {
    if (!this.token) throw new Error("Chưa cấu hình GHN");
    const code = String(orderCode || "").trim();
    if (!code) throw new Error("Thiếu mã vận đơn GHN");

    const body = await this.ghnPost("/shiip/public-api/v2/a5/gen-token", {
      order_codes: [code],
    });
    const token = body?.data?.token || body?.data;
    if (!body || body.code !== 200 || !token) {
      throw new Error(
        this.ghnErrorMessage(body, "GHN không tạo được token in vận đơn"),
      );
    }

    return {
      token: String(token),
      printUrl: `${this.baseUrl}/a5/public-api/printA5?token=${encodeURIComponent(String(token))}`,
    };
  }

  /**
   * Hủy đơn vận chuyển trên GHN (dọn cước staging).
   */
  async cancelGhnOrder(ghnOrderCodes: string[]) {
    if (!this.token) throw new Error("Chưa cấu hình GHN");
    const body = await this.ghnPost(
      "/shiip/public-api/v2/switch-status/cancel",
      {
        order_codes: ghnOrderCodes,
      },
    );
    if (!body || body.code !== 200) {
      throw new Error(this.ghnErrorMessage(body, "GHN từ chối hủy đơn"));
    }
    return true;
  }

  /**
   * Tra cứu hành trình đơn hàng trên GHN theo mã vận đơn / mã đơn shop.
   * Luôn resolve (không ném lỗi): không tìm thấy -> { found: false } để
   * frontend hiển thị empty state trung thực, và để axiosClient không reject.
   */
  async trackOrder(orderCode: string): Promise<ShippingTracking> {
    const code = (orderCode || "").trim();
    if (!code) {
      return {
        found: false,
        orderCode: code,
        carrier: "GHN Express",
        message: "Thiếu mã đơn hàng",
      };
    }
    if (!this.token) {
      this.logger.warn("GHN_TOKEN chưa cấu hình, bỏ qua tra cứu GHN");
      return {
        found: false,
        orderCode: code,
        carrier: "GHN Express",
        message: "Chưa cấu hình GHN",
      };
    }

    try {
      // Bước 1: thử mã vận đơn GHN. Bước 2: fallback mã đơn shop
      // (client_order_code) vì đơn MegaMart tạo trên GHN lưu code ở đó.
      let body = await this.ghnPost(
        "/shiip/public-api/v2/shipping-order/detail",
        {
          order_code: code,
        },
      );
      if (!body || body.code !== 200 || !body.data) {
        body = await this.ghnPost(
          "/shiip/public-api/v2/shipping-order/detail-by-client-code",
          {
            client_order_code: code,
          },
        );
      }

      // GHN báo không tồn tại: code != 200 hoặc data null
      if (!body || body.code !== 200 || !body.data) {
        return {
          found: false,
          orderCode: code,
          carrier: "GHN Express",
          message: "Chưa có thông tin vận đơn trên GHN",
        };
      }

      const data = body.data;
      const status: string = data.status || "";
      // GHN trả log cũ nhất trước -> đảo để mới nhất lên đầu cho UI.
      const logs: GhnTrackLog[] = Array.isArray(data.log)
        ? data.log
            .map((l: any) => ({
              status: String(l.status || ""),
              statusName:
                GHN_STATUS_NAMES[String(l.status || "")] ||
                String(l.status || ""),
              time: toIsoString(l.updated_date ?? l.created_date),
            }))
            .reverse()
        : [];

      return {
        found: true,
        orderCode: code,
        carrier: "GHN Express",
        trackingCode: data.order_code || code,
        status,
        statusName: GHN_STATUS_NAMES[status] || status,
        expectedDelivery: toIsoString(data.leadtime),
        logs,
      };
    } catch (error) {
      this.logger.warn(
        `GHN tracking thất bại cho ${code}: ${(error as Error).message}`,
      );
      return {
        found: false,
        orderCode: code,
        carrier: "GHN Express",
        message: "Không thể kết nối GHN lúc này",
      };
    }
  }
}
