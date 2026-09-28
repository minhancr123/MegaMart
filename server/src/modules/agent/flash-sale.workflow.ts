import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { PrismaService } from "../../prismaClient/prisma.service";
import { buildSmartModel } from "./agent-llm";
import {
  createSaleAnalyst,
  createSaleCopywriter,
  createSaleReviewer,
  type SaleCandidate,
  type SaleCopy,
  type SalePicks,
  type SaleReview,
} from "./nodes/flash-sale.nodes";

const SaleAnnotation = Annotation.Root({
  candidates: Annotation<SaleCandidate[]>,
  picks: Annotation<SalePicks | null>,
  copy: Annotation<SaleCopy | null>,
  review: Annotation<SaleReview | null>,
});

export type SaleModels =
  | BaseChatModel
  | (Partial<Record<"analyst" | "copywriter" | "reviewer", BaseChatModel>> & {
      default?: BaseChatModel;
    });

export interface SalePlan {
  copy: SaleCopy;
  items: { variantId: string; discountPct: number; quantity: number }[];
  rejected: { variantId: string; reason: string }[];
  notes: string;
}

/**
 * Crew chiến dịch flash sale: analyst → copywriter → reviewer (tuyến tính).
 * Output là KẾ HOẠCH (chưa tạo DB). Job tự kiểm chứng guard số học
 * (pct 5-25, quantity ≤ available, salePrice ≥ 1000đ) trước khi tạo DRAFT.
 */
@Injectable()
export class FlashSaleCampaignService {
  private readonly logger = new Logger(FlashSaleCampaignService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  buildGraph(models?: SaleModels) {
    const single =
      models && typeof (models as BaseChatModel)?.invoke === "function"
        ? (models as BaseChatModel)
        : undefined;
    const roles = single ? undefined : (models as SaleModels);
    const pick = (role: "analyst" | "copywriter" | "reviewer"): BaseChatModel =>
      single ??
      (roles as Record<string, BaseChatModel | undefined>)?.[role] ??
      (roles as { default?: BaseChatModel })?.default ??
      buildSmartModel(this.config);

    const analyst = createSaleAnalyst(pick("analyst"));
    const copywriter = createSaleCopywriter(pick("copywriter"));
    const reviewer = createSaleReviewer(pick("reviewer"));

    return new StateGraph(SaleAnnotation)
      .addNode("analyst", async (s) => ({
        picks: await analyst(s.candidates),
      }))
      .addNode("copywriter", async (s) => ({
        copy: await copywriter(s.picks!),
      }))
      .addNode("reviewer", async (s) => ({
        review: await reviewer(s.picks!, s.copy!, s.candidates),
      }))
      .addEdge(START, "analyst")
      .addEdge("analyst", "copywriter")
      .addEdge("copywriter", "reviewer")
      .addEdge("reviewer", END)
      .compile();
  }

  async runCampaign(
    candidates: SaleCandidate[],
    models?: SaleModels,
  ): Promise<SalePlan> {
    const finalState = await this.buildGraph(models).invoke({
      candidates,
      picks: null,
      copy: null,
      review: null,
    });
    const review = finalState.review!;
    const approved = new Set(review.approvedItems);
    const items = (finalState.picks?.picks ?? [])
      .filter((p) => approved.has(p.variantId))
      .map((p) => ({
        variantId: p.variantId,
        discountPct: p.discountPct,
        quantity: p.quantity,
      }));
    this.logger.log(
      `⚡ Sale plan "${finalState.copy?.name}": ${items.length} items, ${review.rejectedItems.length} rejected`,
    );
    return {
      copy: finalState.copy!,
      items,
      rejected: review.rejectedItems,
      notes: review.notes,
    };
  }
}
