import { AgentJobsService } from "./agent-jobs.service";
import { getJobRuntime } from "../inngest/agent-job-runtime";

function buildService(rows: any[] = []) {
  const prisma = {
    agentJobConfig: {
      findMany: async () => rows,
      findUnique: async ({ where }: any) =>
        rows.find((r) => r.jobId === where.jobId) ?? null,
      upsert: async (a: any) => ({
        jobId: a.where.jobId,
        enabled: a.create.enabled,
        batchSize: a.create.batchSize,
        updatedAt: new Date(),
        ...a.update,
      }),
    },
  } as any;
  const audit = { log: async () => ({}) } as any;
  return new AgentJobsService(prisma, audit);
}

describe("AgentJobsService", () => {
  it("list gộp meta + DB (thiếu row → default bật)", async () => {
    const out = await buildService([
      {
        jobId: "voucher-governance",
        enabled: false,
        batchSize: null,
        updatedAt: new Date(),
      },
    ]).list();
    expect(out).toHaveLength(6);
    const gov = out.find((r) => r.id === "voucher-governance")!;
    expect(gov.enabled).toBe(false);
    expect(gov.effectiveOn).toBe(false);
    const enrich = out.find((r) => r.id === "product-enrichment")!;
    expect(enrich.enabled).toBe(true);
    expect(enrich.batchSize).toBe(3);
  });

  it("update job lạ → 404; batch cho job không-batch → 400", async () => {
    const svc = buildService();
    await expect(svc.update("job-ma", {}, "admin-1")).rejects.toThrow();
    await expect(
      svc.update("voucher-governance", { batchSize: 5 }, "admin-1"),
    ).rejects.toThrow();
  });

  it("update batch hợp lệ", async () => {
    const out = await buildService().update(
      "product-enrichment",
      { batchSize: 1 },
      "admin-1",
    );
    expect(out.batchSize).toBe(1);
  });
});

describe("getJobRuntime", () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
  });

  const prismaOf = (row: any) =>
    ({
      agentJobConfig: { findUnique: async () => row },
    }) as any;

  it("không row → default bật + batch meta", async () => {
    const r = await getJobRuntime(prismaOf(null), "product-enrichment");
    expect(r).toMatchObject({ enabled: true, batchSize: 3, envOn: true });
  });

  it("row tắt → enabled false", async () => {
    const r = await getJobRuntime(
      prismaOf({ enabled: false, batchSize: 1 }),
      "product-enrichment",
    );
    expect(r.enabled).toBe(false);
    expect(r.batchSize).toBe(1);
  });

  it("env OFF thắng DB bật", async () => {
    process.env.JOB_FLASH_SALE = "false";
    const r = await getJobRuntime(
      prismaOf({ enabled: true, batchSize: 10 }),
      "flash-sale-campaign",
    );
    expect(r).toMatchObject({ enabled: false, envOn: false });
  });

  it("batch rác → fallback default", async () => {
    const r = await getJobRuntime(
      prismaOf({ enabled: true, batchSize: 9999 }),
      "loyalty-nurture",
    );
    expect(r.batchSize).toBe(50);
  });

  it("batch 0/null → fallback (giữ defaultBatch=0 của job không-batch)", async () => {
    const zero = await getJobRuntime(
      prismaOf({ enabled: true, batchSize: 0 }),
      "voucher-governance",
    );
    expect(zero.batchSize).toBe(0);
    const nil = await getJobRuntime(
      prismaOf({ enabled: true, batchSize: null }),
      "product-enrichment",
    );
    expect(nil.batchSize).toBe(3);
  });

  it("update DTO rỗng → 400", async () => {
    const svc = buildService();
    await expect(
      svc.update("product-enrichment", {}, "admin-1"),
    ).rejects.toThrow();
  });

  it("job id lạ → throw", async () => {
    await expect(getJobRuntime(prismaOf(null), "job-ma")).rejects.toThrow();
  });
});
