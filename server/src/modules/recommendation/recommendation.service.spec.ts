import { RecommendationService } from "./recommendation.service";

function buildService(rows: any[]) {
  const prisma = {
    userRecommendation: { findMany: async () => rows },
  } as any;
  return new RecommendationService(prisma);
}

describe("RecommendationService.listForUser", () => {
  it("map đúng + ép BigInt giá về Number + lọc sp null", async () => {
    const rows = [
      {
        productId: "p-1",
        score: 95,
        reason: "cùng hãng",
        updatedAt: new Date(),
        product: {
          id: "p-1",
          name: "Phone A",
          slug: "phone-a",
          brand: "MegaPhone",
          variants: [{ price: BigInt(5000000), salePrice: null }],
          images: [{ url: "https://cdn/a.jpg" }],
        },
      },
      {
        productId: "p-xoa",
        score: 10,
        reason: "x",
        updatedAt: new Date(),
        product: null,
      },
    ];
    const out = await buildService(rows).listForUser("u-1");
    expect(out).toHaveLength(1);
    expect(out[0].product.price).toBe(5000000);
    expect(out[0].product.image).toBe("https://cdn/a.jpg");
    expect(out[0].score).toBe(95);
  });
});
