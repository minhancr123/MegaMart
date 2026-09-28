import { VoucherGovernanceService } from "./voucher-governance.service";

const PROPOSAL = {
  id: "a-1",
  entityId: "SALE10",
  oldData: JSON.stringify({
    actor: "system:agent-crew",
    action: "extend",
    params: { days: 7 },
    reason: "voucher tốt sắp hết hạn",
    status: "PENDING_ADMIN_REVIEW",
  }),
  createdAt: new Date(),
};

function buildService(appliedMarks: any[] = []) {
  const prisma = {
    auditLog: {
      findMany: async (a: any) =>
        a?.where?.action === "VOUCHER_GOVERNANCE_PROPOSAL"
          ? [PROPOSAL]
          : appliedMarks,
    },
    voucher: {
      findUnique: async () => ({
        id: "v-1",
        code: "SALE10",
        endDate: new Date("2026-09-20T00:00:00Z"),
        usageLimit: 100,
        usedCount: 10,
        minOrderValue: 200000,
        active: true,
        updatedAt: new Date("2026-09-17T00:00:00Z"),
      }),
      updateMany: async () => ({ count: 1 }),
    },
  } as any;
  const audit = { log: async () => ({}) } as any;
  return new VoucherGovernanceService(prisma, audit);
}

describe("VoucherGovernanceService", () => {
  it("list proposals + cờ applied", async () => {
    const out = await buildService().listProposals();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      code: "SALE10",
      action: "extend",
      applied: false,
    });

    const out2 = await buildService([
      { oldData: JSON.stringify({ proposalAuditId: "a-1" }) },
    ]).listProposals();
    expect(out2[0].applied).toBe(true);
  });

  it("apply extend: cộng đúng số ngày, clamp 14", async () => {
    const svc = buildService();
    const out = await svc.applyProposal("a-1", "admin-1");
    expect(out.applied).toBe(true);
    const endDate = (out.changes as any).endDate as Date;
    // 20/09 + 7 ngày = 27/09
    expect(endDate.toISOString().slice(0, 10)).toBe("2026-09-27");
  });

  it("apply lần 2 thì từ chối ALREADY_APPLIED", async () => {
    const svc = buildService([
      { oldData: JSON.stringify({ proposalAuditId: "a-1" }) },
    ]);
    const out = await svc.applyProposal("a-1", "admin-1");
    expect(out).toMatchObject({ applied: false, reason: "ALREADY_APPLIED" });
  });
});
