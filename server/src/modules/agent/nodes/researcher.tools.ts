import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { PrismaService } from "../../../prismaClient/prisma.service";

/**
 * Tools read-only cho Researcher agent.
 * Chỉ tra cứu, không ghi DB — an toàn tuyệt đối khi agent tự gọi.
 */
export function createResearcherTools(prisma: PrismaService) {
  const lookupCategoryProducts = tool(
    async ({ categoryName }: { categoryName: string }) => {
      const name = categoryName?.trim();
      if (!name) return "Chưa rõ danh mục nên bỏ qua tra cứu.";
      const rows = await prisma.product.findMany({
        where: {
          deletedAt: null,
          description: { not: null },
          // Postgres so sánh chuỗi case-sensitive → insensitive để LLM
          // gọi "đồ gia dụng" vẫn trúng "Đồ Gia Dụng" trong DB.
          category: { name: { equals: name, mode: "insensitive" } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          name: true,
          brand: true,
          description: true,
          variants: { take: 1, select: { price: true } },
        },
      });
      if (rows.length === 0) {
        return "Không tìm thấy sản phẩm tham khảo cùng danh mục.";
      }
      return rows
        .map((p) => {
          const price = p.variants[0]?.price;
          return `- ${p.name} (${p.brand ?? "không brand"}${price != null ? `, từ ${Number(price)}đ` : ""}): ${(p.description ?? "").slice(0, 200)}`;
        })
        .join("\n");
    },
    {
      name: "lookup_category_products",
      description:
        "Tra cứu tối đa 5 sản phẩm cùng danh mục đã có mô tả để tham khảo cách viết và mức giá. Chỉ gọi TỐI ĐA 1 lần cho mỗi sản phẩm.",
      schema: z.object({
        categoryName: z.string().describe("Tên danh mục cần tra cứu"),
      }),
    },
  );

  return [lookupCategoryProducts];
}
