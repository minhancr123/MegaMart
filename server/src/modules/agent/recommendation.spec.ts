import { FakeListChatModel } from '@langchain/core/utils/testing';
import { RecommendationService } from './recommendation.workflow';
import type {
  BehaviorSignals,
  RankCandidate,
} from './nodes/recommendation.nodes';

const SIGNALS: BehaviorSignals = {
  topCategories: [{ name: 'Điện thoại', count: 5 }],
  topBrands: [{ name: 'MegaPhone', count: 4 }],
  wishlistIds: ['p-wish'],
  highRatedIds: [],
  recentViewIds: [],
  purchasedIds: ['p-bought'],
};

const CANDIDATES: RankCandidate[] = [
  { productId: 'p-1', name: 'Phone A', brand: 'MegaPhone', category: 'Điện thoại', soldCount: 100 },
  { productId: 'p-2', name: 'Phone B', brand: 'MegaPhone', category: 'Điện thoại', soldCount: 50 },
];

function buildService() {
  const config = { get: () => undefined } as any;
  const prisma = {} as any;
  return new RecommendationService(config, prisma);
}

describe('RecommendationService', () => {
  it('rank top sản phẩm từ candidates', async () => {
    const models = {
      profiler: new FakeListChatModel({
        responses: ['Thích điện thoại MegaPhone.'],
      }),
      ranker: new FakeListChatModel({
        responses: [
          '{"rankings": [{"productId": "p-1", "score": 95, "reason": "cùng hãng đã mua"}, {"productId": "p-2", "score": 80, "reason": "bán chạy"}]}',
        ],
      }),
    };

    const res = await buildService().runRecommend(SIGNALS, CANDIDATES, models);

    expect(res.rankings).toHaveLength(2);
    expect(res.rankings[0].productId).toBe('p-1');
  });
});
