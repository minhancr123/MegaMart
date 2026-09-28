import { FakeListChatModel } from "@langchain/core/utils/testing";
import { FlashSaleCampaignService } from "./flash-sale.workflow";
import type { SaleCandidate } from "./nodes/flash-sale.nodes";

const CANDIDATES: SaleCandidate[] = [
  {
    variantId: "v-1",
    productName: "Tai nghe X",
    sku: "TN-X",
    price: 500000,
    available: 100,
    sold30d: 0,
  },
];

function buildService() {
  const config = { get: () => undefined } as any;
  const prisma = {} as any;
  return new FlashSaleCampaignService(config, prisma);
}

describe("FlashSaleCampaignService", () => {
  it("lên kế hoạch sale với item được duyệt", async () => {
    const models = {
      analyst: new FakeListChatModel({
        responses: [
          '{"picks": [{"variantId": "v-1", "discountPct": 20, "quantity": 30, "reason": "tồn cao ế lâu"}]}',
        ],
      }),
      copywriter: new FakeListChatModel({
        responses: [
          '{"name": "Xả kho âm thanh", "tagline": "Sale sập sàn", "description": "Mô tả sale"}',
        ],
      }),
      reviewer: new FakeListChatModel({
        responses: [
          '{"approvedItems": ["v-1"], "rejectedItems": [], "notes": "ok"}',
        ],
      }),
    };

    const plan = await buildService().runCampaign(CANDIDATES, models);

    expect(plan.copy.name).toBe("Xả kho âm thanh");
    expect(plan.items).toEqual([
      { variantId: "v-1", discountPct: 20, quantity: 30 },
    ]);
  });
});
