import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PrismaService } from '../../prismaClient/prisma.service';
import {
  MAX_REVIEW_RETRIES,
  type CrewModels,
  type EnrichmentResult,
  type ProductEnrichmentInput,
  type ProductEnrichmentState,
} from './agent.state';
import { createResearcherNode } from './nodes/researcher.node';
import { createWriterNode } from './nodes/writer.node';
import { createReviewerNode } from './nodes/reviewer.node';
import { createDesignerNode } from './nodes/designer.node';
import { getLlmProvider, buildCrewModel, buildSmartModel } from './agent-llm';
import { CloudinaryService } from '../images/cloudinary.service';

const EnrichmentAnnotation = Annotation.Root({
  productId: Annotation<string>,
  productName: Annotation<string>,
  brand: Annotation<string>,
  categoryName: Annotation<string>,
  specsRaw: Annotation<string>,
  normalizedSpecs: Annotation<string>,
  draft: Annotation<string>,
  reviewFeedback: Annotation<string>,
  designerImages: Annotation<string[]>,
  status: Annotation<string>,
  retryCount: Annotation<number>,
});

/**
 * Crew làm giàu nội dung sản phẩm: Researcher(ReAct+tool) → Writer ⇄ Reviewer (tối đa 2 vòng sửa).
 * Model inject được (test dùng FakeListChatModel, prod dùng Gemini).
 *
 * Về memory/checkpointer: bản này compile KHÔNG checkpointer. Lý do: graph không
 * có interrupt nên checkpointer in-memory không mang lại resume thật, mà còn thêm
 * 2 rủi ro (2 run cùng productId ghi đè checkpoint nhau; MemorySaver phình RAM
 * không giới hạn). Durable cross-restart đã do Inngest lo ở tầng step.
 * Memory DB thật (resume hội thoại qua nhiều ngày) = PostgresSaver
 * (@langchain/langgraph-checkpoint-postgres) — làm riêng khi cần.
 */
@Injectable()
export class AgentWorkflowService {
  private readonly logger = new Logger(AgentWorkflowService.name);
  /** Cache graph đã compile cho model mặc định (tránh compile lại mỗi sản phẩm). */
  private defaultGraph: ReturnType<
    AgentWorkflowService['buildGraph']
  > | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** Model ID ảnh qua env (default gemini-2.5-flash-image), đổi không cần sửa code. */
  private imageModelName(): string {
    return (
      this.config.get<string>('GEMINI_IMAGE_MODEL') ||
      'gemini-2.5-flash-image'
    );
  }

  /** Bật/tắt designer. Mặc định TẮT để không tốn phí gen ảnh bất ngờ. */
  private designerEnabled(): boolean {
    // Chuẩn parse boolean env theo repo (sepay-refund): 'true'/'1', case-insensitive.
    const raw = String(this.config.get<string>('DESIGNER_ENABLED') ?? '')
      .trim()
      .toLowerCase();
    return raw === 'true' || raw === '1';
  }

  /** Gọi image model theo provider → bytes ảnh. Ném lỗi rõ nếu không có ảnh. */
  private async generateImage(prompt: string): Promise<Buffer> {
    if (getLlmProvider(this.config) === 'agnes') {
      return this.generateImageAgnes(prompt);
    }
    const apiKey = this.config.get<string>('GOOGLE_AI_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_AI_KEY chưa cấu hình — không gen ảnh được.');
    }
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: this.imageModelName(),
    });
    const result = await model.generateContent(prompt);
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find(
      (p): p is typeof p & { inlineData: { data: string } } =>
        !!p.inlineData?.data,
    );
    if (!imgPart) {
      throw new Error(
        `Image model ${this.imageModelName()} không trả về ảnh (kiểm tra model ID/quota).`,
      );
    }
    return Buffer.from(imgPart.inlineData.data, 'base64');
  }

  /** Gen ảnh qua Agnes (OpenAI-compatible /v1/images/generations) → tải bytes. */
  private async generateImageAgnes(prompt: string): Promise<Buffer> {
    const apiKey = this.config.get<string>('AGNES_API_KEY');
    if (!apiKey) {
      throw new Error('AGNES_API_KEY chưa cấu hình — không gen ảnh được.');
    }
    const base =
      this.config.get<string>('AGNES_BASE_URL') ||
      'https://apihub.agnes-ai.com/v1';
    const model =
      this.config.get<string>('AGNES_IMAGE_MODEL') || 'agnes-image-2.5-flash';
    const res = await fetch(`${base}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, prompt, size: '1024x1024' }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) {
      throw new Error(`Agnes image API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      data?: { url?: string; b64_json?: string }[];
    };
    const first = data.data?.[0];
    if (first?.b64_json) return Buffer.from(first.b64_json, 'base64');
    if (first?.url) {
      const img = await fetch(first.url, {
        signal: AbortSignal.timeout(60000),
      });
      if (!img.ok) throw new Error(`Tải ảnh Agnes thất bại: ${img.status}`);
      const contentType = img.headers.get('content-type') ?? '';
      if (!contentType.startsWith('image/')) {
        throw new Error(
          `URL Agnes không trả về ảnh (content-type: ${contentType || 'trống'}) — bỏ qua để khỏi upload rác.`,
        );
      }
      const buf = Buffer.from(await img.arrayBuffer());
      // Chặn file bất thường (>10MB) trước khi đẩy lên Cloudinary.
      if (buf.length > 10 * 1024 * 1024) {
        throw new Error(`Ảnh Agnes quá lớn (${buf.length} bytes) — bỏ qua.`);
      }
      return buf;
    }
    throw new Error('Agnes image API không trả về ảnh (url/b64_json rỗng).');
  }

  private async uploadAgentImage(
    buffer: Buffer,
    filename: string,
  ): Promise<string> {
    // Tái dùng pipeline upload có sẵn (resize/quality/folder megamart/agent).
    const file = {
      buffer,
      originalname: filename,
      mimetype: 'image/jpeg',
      size: buffer.length,
    } as unknown as Express.Multer.File;
    const { url } = await this.cloudinary.uploadImage(file, 'agent');
    return url;
  }

  /** Model mặc định đi qua provider switch (gemini|agnes theo LLM_PROVIDER). */
  private buildModel(): BaseChatModel {
    return buildCrewModel(this.config);
  }

  buildGraph(models?: BaseChatModel | CrewModels) {
    // Duck-typing (KHÔNG dùng instanceof): Runnable bọc ngoài như .withConfig()/
    // .bindTools() vẫn có .invoke và phải được coi là model đơn. Chỉ plain object
    // dạng {researcher?, writer?, reviewer?, default?} mới là CrewModels.
    const isSingleModel =
      typeof (models as BaseChatModel)?.invoke === 'function';
    // Model đơn dùng chung 1 instance cho cả 3 role (chuẩn, tiết kiệm).
    // Muốn tách model theo role (rẻ cho researcher/writer, mạnh cho reviewer)
    // thì truyền CrewModels — test cũng dùng cách này vì mỗi fake có counter riêng.
    const single = isSingleModel ? (models as BaseChatModel) : undefined;
    const crew = isSingleModel ? undefined : (models as CrewModels);
    const pick = (
      role: 'researcher' | 'writer' | 'reviewer',
    ): BaseChatModel =>
      single ?? crew?.[role] ?? crew?.default ?? this.buildModel();
    // Nodes structured-output dùng model smart (Agnes 2.5 tự bịa field JSON).
    const pickSmart = (
      role: 'researcher' | 'writer' | 'reviewer',
    ): BaseChatModel =>
      single ?? crew?.[role] ?? crew?.default ?? buildSmartModel(this.config);

    const researcher = createResearcherNode(pick('researcher'), this.prisma, {
      // Agnes không kích hoạt tool-calling structured → chạy chain thuần.
      useTools: getLlmProvider(this.config) !== 'agnes',
    });
    const writer = createWriterNode(pick('writer'));
    const reviewer = createReviewerNode(pickSmart('reviewer'));
    const designer = createDesignerNode({
      enabled: this.designerEnabled(),
      generateImage: (p) => this.generateImage(p),
      uploadImage: (b, f) => this.uploadAgentImage(b, f),
      onError: (err) =>
        this.logger.warn(
          `🎨 Designer lỗi (bỏ qua ảnh, giữ mô tả): ${err instanceof Error ? err.message : String(err)}`,
        ),
    });

    const graph = new StateGraph(EnrichmentAnnotation)
      .addNode('researcher', researcher)
      .addNode('writer', writer)
      .addNode('reviewer', reviewer)
      .addNode('designer', designer)
      .addEdge(START, 'researcher')
      .addEdge('researcher', 'writer')
      .addEdge('writer', 'reviewer')
      .addConditionalEdges('reviewer', (state) => {
        // APPROVED → đi tiếp designer (node tự no-op khi DESIGNER_ENABLED=false).
        if (state.status === 'approved') return 'designer';
        // Bị reject nhưng đã hết lượt sửa → dừng, giữ bản nháp tốt nhất.
        if (state.retryCount >= MAX_REVIEW_RETRIES) return END;
        return 'writer';
      })
      .addEdge('designer', END);

    return graph.compile();
  }

  async runEnrichment(
    input: ProductEnrichmentInput,
    models?: BaseChatModel | CrewModels,
  ): Promise<EnrichmentResult> {
    // Default (không override): buildGraph(undefined) để pick/pickSmart tự
    // resolve text vs smart theo provider. KHÔNG truyền buildModel() vào đây —
    // single model sẽ lấn át pickSmart khiến reviewer chạy nhầm model text.
    const compiled = !models
      ? (this.defaultGraph ??= this.buildGraph(undefined))
      : this.buildGraph(models);

    // Object riêng cho graph (không dùng interface state) để brand/categoryName
    // luôn là string đúng Annotation — tránh null lọt vào LLM prompt.
    const graphInput = {
      productId: input.productId,
      productName: input.productName,
      brand: input.brand ?? '',
      categoryName: input.categoryName ?? '',
      specsRaw: input.specsRaw,
      normalizedSpecs: '',
      draft: '',
      reviewFeedback: '',
      designerImages: [],
      status: 'researching',
      retryCount: 0,
    };

    const finalState = await compiled.invoke(graphInput);
    const approved = finalState.status === 'approved';

    this.logger.log(
      `📝 Enrichment ${input.productId}: ${approved ? 'APPROVED' : 'REJECTED'} sau ${finalState.retryCount} vòng sửa`,
    );

    return {
      productId: input.productId,
      description: finalState.draft,
      designerImages: finalState.designerImages ?? [],
      status: approved ? 'approved' : 'rejected',
      reviewFeedback: finalState.reviewFeedback,
      retryCount: finalState.retryCount,
    };
  }
}
