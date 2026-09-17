import {
  SALE_ORDER_STATUSES,
  aggregateDaySales,
  clampLoyaltyVoucher,
  clampSaleItem,
  daysToExpiry,
  dedupeRankings,
  isExpired,
  utcDayStart,
} from './job-guards';
import { isJobEnabled } from '../job-flags';

describe('job-guards (lưới an toàn bằng code)', () => {
  it('isExpired bắt voucher vừa hết hạn trong ngày (bẫy Math.ceil -0)', () => {
    const now = new Date('2026-09-17T03:45:00Z');
    const end = new Date('2026-09-17T00:00:00Z');
    // Math.ceil cho ra -0, và (-0 < 0) === false → logic cũ lọt voucher.
    expect(Math.ceil((end.getTime() - now.getTime()) / 86400000)).toBe(-0);
    expect(-0 < 0).toBe(false);
    // Guard mới phải bắt được.
    expect(isExpired(end, now)).toBe(true);
    expect(isExpired(null, now)).toBe(false);
    expect(isExpired(new Date('2026-09-20T00:00:00Z'), now)).toBe(false);
    expect(daysToExpiry(end, now)).toBe(-0);
  });

  it('clampSaleItem loại pct/salePrice/quantity sai', () => {
    expect(
      clampSaleItem({ price: 500000, discountPct: 20, quantity: 30, available: 100 }),
    ).toEqual({ salePrice: 400000, quantity: 30 });
    // pct ngoài [5..25] → default 10
    expect(
      clampSaleItem({ price: 500000, discountPct: 90, quantity: 5, available: 100 }),
    ).toEqual({ salePrice: 450000, quantity: 5 });
    // salePrice < 1000 → loại
    expect(
      clampSaleItem({ price: 1000, discountPct: 25, quantity: 5, available: 100 }),
    ).toBeNull();
    // hết hàng → loại
    expect(
      clampSaleItem({ price: 500000, discountPct: 10, quantity: 5, available: 0 }),
    ).toBeNull();
  });

  it('dedupeRankings giữ score cao nhất, chống P2002', () => {
    const out = dedupeRankings([
      { productId: 'p-1', score: 80, reason: 'a' },
      { productId: 'p-1', score: 95, reason: 'b' },
      { productId: 'p-2', score: 70, reason: 'c' },
    ]);
    expect(out).toEqual([
      { productId: 'p-1', score: 95, reason: 'b' },
      { productId: 'p-2', score: 70, reason: 'c' },
    ]);
  });

  it('clampLoyaltyVoucher ép về trần 50k/300k/7-14 ngày', () => {
    expect(
      clampLoyaltyVoucher({ value: 200000, minOrderValue: 100000, validityDays: 30 }),
    ).toEqual({ value: 50000, minOrderValue: 300000, validityDays: 14 });
    expect(
      clampLoyaltyVoucher({ value: 30000, minOrderValue: 500000, validityDays: 10 }),
    ).toEqual({ value: 30000, minOrderValue: 500000, validityDays: 10 });
  });
});

describe('sales ingest helpers', () => {
  it('SALE_ORDER_STATUSES gồm đơn chốt, loại đơn rác', () => {
    expect(SALE_ORDER_STATUSES).toContain('DELIVERED');
    expect(SALE_ORDER_STATUSES).toContain('COMPLETED');
    expect(SALE_ORDER_STATUSES).not.toContain('PENDING');
    expect(SALE_ORDER_STATUSES).not.toContain('CANCELED');
    expect(SALE_ORDER_STATUSES).not.toContain('REFUNDED');
    expect(SALE_ORDER_STATUSES).not.toContain('FAILED');
  });

  it('utcDayStart về 00:00 UTC', () => {
    const d = utcDayStart(new Date('2026-09-17T15:30:00+07:00'));
    expect(d.toISOString()).toBe('2026-09-17T00:00:00.000Z');
  });

  it('aggregateDaySales gom đúng qty/revenue (kể cả BigInt price)', () => {
    const out = aggregateDaySales([
      { variantId: 'v1', price: BigInt(500000), quantity: 2 },
      { variantId: 'v1', price: BigInt(500000), quantity: 1 },
      { variantId: 'v2', price: 100000, quantity: 5 },
    ]);
    expect(out).toEqual([
      { variantId: 'v1', qty: 3, revenue: 1500000 },
      { variantId: 'v2', qty: 5, revenue: 500000 },
    ]);
  });
});
describe('isJobEnabled (công tắc job)', () => {
  const KEY = 'JOB_TEST_FLAG_TMP';
  afterEach(() => {
    delete process.env[KEY];
  });

  it('thiếu/rỗng → default (mặc định bật)', () => {
    expect(isJobEnabled(KEY)).toBe(true);
    expect(isJobEnabled(KEY, false)).toBe(false);
    process.env[KEY] = '   ';
    expect(isJobEnabled(KEY)).toBe(true);
  });

  it('nhận 1/true/yes/on (case-insensitive), còn lại là tắt', () => {
    for (const v of ['1', 'true', 'TRUE', 'yes', 'on', ' True ']) {
      process.env[KEY] = v;
      expect(isJobEnabled(KEY)).toBe(true);
    }
    for (const v of ['0', 'false', 'no', 'off', 'tắt']) {
      process.env[KEY] = v;
      expect(isJobEnabled(KEY)).toBe(false);
    }
  });
});
