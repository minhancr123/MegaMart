import { VoucherService } from "./voucher.service";

function buildService(client: any) {
  const prisma = { __client: client } as any;
  const svc = new VoucherService(prisma);
  // release() dùng tx truyền vào, nhưng test gọi không tx -> fallback this.prisma;
  // gán mock client để không chạm DB thật.
  (svc as any).prisma = client;
  return svc;
}

function mockClient(usages: any[]) {
  const calls: any = { updateMany: [], deleted: [], redeemed: [] };
  const client = {
    voucherUsage: {
      findMany: async () => usages,
      delete: async (a: any) => {
        calls.deleted.push(a);
        return {};
      },
    },
    voucher: {
      updateMany: async (a: any) => {
        calls.updateMany.push(a);
        return { count: 1 };
      },
    },
    redeemedVoucher: {
      update: async (a: any) => {
        calls.redeemed.push(a);
        return {};
      },
    },
  };
  return { client, calls };
}

describe("VoucherService.release", () => {
  it("đơn không dùng voucher thì no-op", async () => {
    const { client, calls } = mockClient([]);
    const svc = buildService(client);
    await expect(svc.release("order-1", client)).resolves.toEqual({
      released: 0,
    });
    expect(calls.updateMany).toHaveLength(0);
    expect(calls.deleted).toHaveLength(0);
  });

  it("hoàn voucher thường: giảm usedCount, xóa usage", async () => {
    const { client, calls } = mockClient([
      {
        id: "u-1",
        voucherId: "v-1",
        voucher: { endDate: null, redeemedVoucher: null },
      },
    ]);
    const svc = buildService(client);
    await expect(svc.release("order-1", client)).resolves.toEqual({
      released: 1,
    });
    expect(calls.updateMany[0].where).toMatchObject({
      id: "v-1",
      usedCount: { gt: 0 },
    });
    expect(calls.deleted[0]).toMatchObject({ where: { id: "u-1" } });
    expect(calls.redeemed).toHaveLength(0);
  });

  it("voucher đổi điểm còn hạn: USED -> ACTIVE", async () => {
    const { client, calls } = mockClient([
      {
        id: "u-2",
        voucherId: "v-2",
        voucher: {
          endDate: new Date(Date.now() + 86400000),
          redeemedVoucher: { id: "r-1", status: "USED" },
        },
      },
    ]);
    const svc = buildService(client);
    await svc.release("order-2", client);
    expect(calls.redeemed[0]).toMatchObject({
      where: { id: "r-1" },
      data: { status: "ACTIVE" },
    });
  });

  it("voucher đổi điểm quá hạn: USED -> EXPIRED", async () => {
    const { client, calls } = mockClient([
      {
        id: "u-3",
        voucherId: "v-3",
        voucher: {
          endDate: new Date(Date.now() - 86400000),
          redeemedVoucher: { id: "r-2", status: "USED" },
        },
      },
    ]);
    const svc = buildService(client);
    await svc.release("order-3", client);
    expect(calls.redeemed[0]).toMatchObject({
      where: { id: "r-2" },
      data: { status: "EXPIRED" },
    });
  });
});
