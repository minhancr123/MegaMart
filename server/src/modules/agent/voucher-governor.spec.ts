import { FakeListChatModel } from "@langchain/core/utils/testing";
import { VoucherGovernorService } from "./voucher-governor.workflow";
import type { VoucherSummary } from "./nodes/voucher-governor.nodes";

const SUMMARIES: VoucherSummary[] = [
  {
    code: "HET-HAN",
    type: "FIXED",
    value: 20000,
    maxDiscount: null,
    minOrderValue: 100000,
    usageLimit: 100,
    usagePerUser: 1,
    usedCount: 10,
    daysToExpiry: -2,
    isExpired: true,
    ageDays: 40,
    exhausted: false,
    abusers: [],
  },
  {
    code: "NGON",
    type: "PERCENT",
    value: 10,
    maxDiscount: 50000,
    minOrderValue: 300000,
    usageLimit: 1000,
    usagePerUser: 1,
    usedCount: 500,
    daysToExpiry: 20,
    isExpired: false,
    ageDays: 10,
    exhausted: false,
    abusers: [],
  },
];

function buildService() {
  const config = { get: () => undefined } as any;
  const prisma = {} as any;
  return new VoucherGovernorService(config, prisma);
}

describe("VoucherGovernorService", () => {
  it("phân loại đúng + chỉ auto-deactivate voucher hết hạn", async () => {
    const models = {
      auditor: new FakeListChatModel({
        responses: [
          '{"findings": [{"code": "HET-HAN", "issue": "expiring_soon", "detail": "hết hạn 2 ngày"}, {"code": "NGON", "issue": "healthy", "detail": "chạy tốt"}]}',
        ],
      }),
      optimizer: new FakeListChatModel({
        responses: [
          '{"actions": [{"code": "HET-HAN", "action": "deactivate", "params": {}, "reason": "hết hạn"}]}',
        ],
      }),
      reviewer: new FakeListChatModel({
        responses: [
          '{"approvedAuto": [{"code": "HET-HAN", "action": "deactivate"}], "proposals": [], "rejected": [], "notes": "ok"}',
        ],
      }),
    };

    const verdict = await buildService().runGovernance(SUMMARIES, models);

    expect(verdict.approvedAuto).toEqual([
      { code: "HET-HAN", action: "deactivate" },
    ]);
    expect(verdict.proposals).toEqual([]);
  });
});
