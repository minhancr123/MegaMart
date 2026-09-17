import { LoyaltyNurtureAdminService } from './loyalty-nurture.service';

function buildService(over: any = {}) {
  const tx = {
    loyaltyNurtureQueue: {
      update: async (a: any) => a,
      updateMany: async (a: any) => ({ count: 1 }),
    },
    voucher: { update: async (a: any) => a },
  };
  const prisma = {
    loyaltyNurtureQueue: {
      findMany: async () => [],
      findUnique: async () => ({
        id: 'q-1',
        status: 'PENDING',
        userId: 'u-1',
        voucherId: 'v-1',
        segment: 'NEAR_TIER',
        message: 'msg',
        voucher: { id: 'v-1', code: 'LOYAL-X', value: 50000, active: false },
        user: { email: 'a@b.c', name: 'An' },
      }),
      update: async (a: any) => a,
    },
    $transaction: async (fn: any) => fn(tx),
    ...over,
  } as any;
  const audit = { log: async () => ({}) } as any;
  return { svc: new LoyaltyNurtureAdminService(prisma, audit), prisma, tx };
}

describe('LoyaltyNurtureAdminService', () => {
  it('approve: queue APPROVED + bật voucher (SMTP thiếu → mailed false, không crash)', async () => {
    const { svc, tx } = buildService();
    const updates: any[] = [];
    tx.loyaltyNurtureQueue.updateMany = async (a: any) => {
      updates.push(['queue', a.data]);
      return { count: 1 };
    };
    tx.voucher.update = async (a: any) => {
      updates.push(['voucher', a.data]);
      return a;
    };
    // Xóa SMTP để chắc chắn rớt vào nhánh best-effort
    const savedEnv = { ...process.env };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    try {
      const out = await svc.approve('q-1', 'admin-1');
      expect(out.status).toBe('APPROVED');
      expect(out.mailed).toBe(false);
      expect(updates).toContainEqual(['queue', expect.objectContaining({ status: 'APPROVED' })]);
      expect(updates).toContainEqual(['voucher', expect.objectContaining({ active: true })]);
    } finally {
      process.env = savedEnv;
    }
  });

  it('approve lần 2 cùng queue thì từ chối (đã APPROVED)', async () => {
    const { svc } = buildService({
      loyaltyNurtureQueue: {
        findUnique: async () => ({ id: 'q-1', status: 'APPROVED', userId: 'u-1' }),
      },
    } as any);
    await expect(svc.approve('q-1', 'admin-1')).rejects.toThrow();
  });
});
