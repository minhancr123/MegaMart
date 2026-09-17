import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PrismaService } from '../../prismaClient/prisma.service';
import { buildSmartModel } from './agent-llm';
import {
  createLoyaltyCopywriter,
  createLoyaltyReviewer,
  createLoyaltySegmenter,
  type NurtureCandidate,
  type NurtureContent,
  type NurtureReview,
  type SegmentVerdict,
} from './nodes/loyalty.nodes';

const LoyaltyAnnotation = Annotation.Root({
  candidate: Annotation<NurtureCandidate>,
  segment: Annotation<SegmentVerdict | null>,
  content: Annotation<NurtureContent | null>,
  review: Annotation<NurtureReview | null>,
});

export type LoyaltyModels =
  | BaseChatModel
  | Partial<Record<'segmenter' | 'copywriter' | 'reviewer', BaseChatModel>> & { default?: BaseChatModel };

export interface NurturePlan {
  candidate: NurtureCandidate;
  segment: SegmentVerdict;
  content: NurtureContent | null;
  approved: boolean;
  reason: string;
}

/**
 * Crew nuôi dưỡng loyalty: segmenter → copywriter → reviewer (tuyến tính).
 * Output là KẾ HOẠCH. Job kiểm chứng trần ngân sách bằng code
 * (value ≤ 50k, minOrder ≥ 300k) trước khi tạo voucher + hàng chờ duyệt.
 */
@Injectable()
export class LoyaltyNurtureService {
  private readonly logger = new Logger(LoyaltyNurtureService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  buildGraph(models?: LoyaltyModels) {
    const single =
      models && typeof (models as BaseChatModel)?.invoke === 'function'
        ? (models as BaseChatModel)
        : undefined;
    const roles = single ? undefined : (models as LoyaltyModels);
    const pick = (
      role: 'segmenter' | 'copywriter' | 'reviewer',
    ): BaseChatModel =>
      single ??
      (roles as Record<string, BaseChatModel | undefined>)?.[role] ??
      (roles as { default?: BaseChatModel })?.default ??
      buildSmartModel(this.config);

    const segmenter = createLoyaltySegmenter(pick('segmenter'));
    const copywriter = createLoyaltyCopywriter(pick('copywriter'));
    const reviewer = createLoyaltyReviewer(pick('reviewer'));

    return new StateGraph(LoyaltyAnnotation)
      .addNode('segmenter', async (s) => ({
        segment: await segmenter(s.candidate),
      }))
      .addNode('copywriter', async (s) => ({
        content: await copywriter(s.segment!, s.candidate),
      }))
      .addNode('reviewer', async (s) => ({
        review: await reviewer(s.content!, s.candidate),
      }))
      .addEdge(START, 'segmenter')
      .addEdge('segmenter', 'copywriter')
      .addEdge('copywriter', 'reviewer')
      .addEdge('reviewer', END)
      .compile();
  }

  async runNurture(
    candidate: NurtureCandidate,
    models?: LoyaltyModels,
  ): Promise<NurturePlan> {
    const finalState = await this.buildGraph(models).invoke({
      candidate,
      segment: null,
      content: null,
      review: null,
    });
    const approved = finalState.review?.approved ?? false;
    this.logger.log(
      `💎 Nurture ${candidate.userId} [${finalState.segment?.segment}]: ${approved ? 'APPROVED' : 'REJECTED'}`,
    );
    return {
      candidate,
      segment: finalState.segment!,
      content: finalState.content,
      approved,
      reason: finalState.review?.reason ?? '',
    };
  }
}
