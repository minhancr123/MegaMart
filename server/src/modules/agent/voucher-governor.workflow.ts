import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { PrismaService } from "../../prismaClient/prisma.service";
import { buildSmartModel } from "./agent-llm";
import {
  createVoucherAuditor,
  createVoucherOptimizer,
  createVoucherReviewer,
  type VoucherActions,
  type VoucherFindings,
  type VoucherSummary,
  type VoucherVerdict,
} from "./nodes/voucher-governor.nodes";

const GovAnnotation = Annotation.Root({
  summaries: Annotation<VoucherSummary[]>,
  findings: Annotation<VoucherFindings | null>,
  actions: Annotation<VoucherActions | null>,
  verdict: Annotation<VoucherVerdict | null>,
});

export type GovernorModels =
  | BaseChatModel
  | (Partial<Record<"auditor" | "optimizer" | "reviewer", BaseChatModel>> & {
      default?: BaseChatModel;
    });

/**
 * Crew kiểm toán voucher: auditor → optimizer → reviewer (tuyến tính).
 * LLM chỉ PHÂN LOẠI + ĐỀ XUẤT. Hành động tự động duy nhất (tắt voucher
 * hết hạn/hết quota) do job kiểm chứng lại bằng code trước khi chạy.
 */
@Injectable()
export class VoucherGovernorService {
  private readonly logger = new Logger(VoucherGovernorService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  buildGraph(models?: GovernorModels) {
    const single =
      models && typeof (models as BaseChatModel)?.invoke === "function"
        ? (models as BaseChatModel)
        : undefined;
    const roles = single ? undefined : (models as GovernorModels);
    const pick = (role: "auditor" | "optimizer" | "reviewer"): BaseChatModel =>
      single ??
      (roles as Record<string, BaseChatModel | undefined>)?.[role] ??
      (roles as { default?: BaseChatModel })?.default ??
      buildSmartModel(this.config);

    const auditor = createVoucherAuditor(pick("auditor"));
    const optimizer = createVoucherOptimizer(pick("optimizer"));
    const reviewer = createVoucherReviewer(pick("reviewer"));

    return new StateGraph(GovAnnotation)
      .addNode("auditor", async (s) => ({
        findings: await auditor(s.summaries),
      }))
      .addNode("optimizer", async (s) => ({
        actions: await optimizer(s.findings!, s.summaries),
      }))
      .addNode("reviewer", async (s) => ({
        verdict: await reviewer(s.actions!),
      }))
      .addEdge(START, "auditor")
      .addEdge("auditor", "optimizer")
      .addEdge("optimizer", "reviewer")
      .addEdge("reviewer", END)
      .compile();
  }

  async runGovernance(
    summaries: VoucherSummary[],
    models?: GovernorModels,
  ): Promise<VoucherVerdict> {
    const finalState = await this.buildGraph(models).invoke({
      summaries,
      findings: null,
      actions: null,
      verdict: null,
    });
    const verdict = finalState.verdict!;
    this.logger.log(
      `🎟️ Governance: ${summaries.length} voucher → auto ${verdict.approvedAuto.length}, proposals ${verdict.proposals.length}, rejected ${verdict.rejected.length}`,
    );
    return verdict;
  }
}
