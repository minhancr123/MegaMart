import { FakeListChatModel } from '@langchain/core/utils/testing';
import { LoyaltyNurtureService } from './loyalty.workflow';
import type { NurtureCandidate } from './nodes/loyalty.nodes';

const CANDIDATE: NurtureCandidate = {
  userId: 'u-1',
  name: 'An',
  segment: 'NEAR_TIER',
  totalSpent: 48000000,
  points: 4800,
  currentTier: 'Bạc',
  nextTier: 'Vàng',
  progressPct: 96,
  daysSinceLastOrder: 5,
};

function buildService() {
  const config = { get: () => undefined } as any;
  const prisma = {} as any;
  return new LoyaltyNurtureService(config, prisma);
}

describe('LoyaltyNurtureService', () => {
  it('soạn ưu đãi trong trần ngân sách và được duyệt', async () => {
    const models = {
      segmenter: new FakeListChatModel({
        responses: [
          '{"segment": "NEAR_TIER", "reason": "sắp lên Vàng", "priority": 5}',
        ],
      }),
      copywriter: new FakeListChatModel({
        responses: [
          '{"message": "An ơi, mua thêm 200k lên Vàng!", "voucher": {"type": "FIXED", "value": 50000, "minOrderValue": 300000, "validityDays": 14}}',
        ],
      }),
      reviewer: new FakeListChatModel({
        responses: ['{"approved": true, "reason": "trong trần"}'],
      }),
    };

    const plan = await buildService().runNurture(CANDIDATE, models);

    expect(plan.approved).toBe(true);
    expect(plan.content?.voucher.value).toBeLessThanOrEqual(50000);
    expect(plan.content?.voucher.minOrderValue).toBeGreaterThanOrEqual(300000);
  });
});
