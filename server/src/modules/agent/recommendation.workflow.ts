import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PrismaService } from '../../prismaClient/prisma.service';
import { buildGeminiChatModel, buildSmartModel } from './agent-llm';
import {
  createProfiler,
  createRanker,
  type BehaviorSignals,
  type RankCandidate,
  type Rankings,
} from './nodes/recommendation.nodes';

const RecAnnotation = Annotation.Root({
  signals: Annotation<BehaviorSignals>,
  candidates: Annotation<RankCandidate[]>,
  profile: Annotation<string>,
  rankings: Annotation<Rankings | null>,
});

export type RecModels =
  | BaseChatModel
  | Partial<Record<'profiler' | 'ranker', BaseChatModel>> & { default?: BaseChatModel };

export interface RecResult {
  profile: string;
  rankings: { productId: string; score: number; reason: string }[];
}

/**
 * Crew gợi ý theo hành vi: profiler → ranker (2 role cho rẻ quota).
 * Job kiểm chứng productId thuộc candidates (chống hallucinate) rồi mới lưu.
 */
@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  buildGraph(models?: RecModels) {
    const single =
      models && typeof (models as BaseChatModel)?.invoke === 'function'
        ? (models as BaseChatModel)
        : undefined;
    const roles = single ? undefined : (models as RecModels);
    const pick = (role: 'profiler' | 'ranker'): BaseChatModel =>
      single ??
      (roles as Record<string, BaseChatModel | undefined>)?.[role] ??
      (roles as { default?: BaseChatModel })?.default ??
      buildGeminiChatModel(this.config);
    // Ranker structured-output → model smart (Agnes 2.5 bịa field JSON).
    const pickSmart = (role: 'profiler' | 'ranker'): BaseChatModel =>
      single ??
      (roles as Record<string, BaseChatModel | undefined>)?.[role] ??
      (roles as { default?: BaseChatModel })?.default ??
      buildSmartModel(this.config);

    const profiler = createProfiler(pick('profiler'));
    const ranker = createRanker(pickSmart('ranker'));

    return new StateGraph(RecAnnotation)
      .addNode('profiler', async (s) => ({
        profile: await profiler(s.signals),
      }))
      .addNode('ranker', async (s) => ({
        rankings: await ranker(s.profile, s.candidates, s.signals.purchasedIds),
      }))
      .addEdge(START, 'profiler')
      .addEdge('profiler', 'ranker')
      .addEdge('ranker', END)
      .compile();
  }

  async runRecommend(
    signals: BehaviorSignals,
    candidates: RankCandidate[],
    models?: RecModels,
  ): Promise<RecResult> {
    const finalState = await this.buildGraph(models).invoke({
      signals,
      candidates,
      profile: '',
      rankings: null,
    });
    const rankings = finalState.rankings?.rankings ?? [];
    this.logger.log(`🎯 Recommend: ${rankings.length} items ranked`);
    return { profile: finalState.profile, rankings };
  }
}
