import { FakeListChatModel } from '@langchain/core/utils/testing';
import { AgentWorkflowService } from './agent-workflow.service';
import { createDesignerNode } from './nodes/designer.node';
import { stripCodeFences } from './nodes/writer.node';
import { createResearcherNode } from './nodes/researcher.node';
import { MAX_REVIEW_RETRIES } from './agent.state';
import type { ProductEnrichmentState } from './agent.state';

const INPUT = {
  productId: 'prod-test-1',
  productName: 'Máy xay sinh tố MegaBlend 500W',
  brand: 'MegaBlend',
  categoryName: 'Đồ gia dụng',
  specsRaw: JSON.stringify({
    cong_suat: '500W',
    dung_tich: '1.5L',
    sku: 'MB-500',
  }),
};

function buildService() {
  // ConfigService giả: không cần key thật vì test luôn truyền modelOverride.
  // DESIGNER_ENABLED không set → designer no-op trong 2 test crew bên dưới.
  const config = { get: () => undefined } as any;
  // Prisma giả: tool lookup trả về rỗng → researcher không cần gọi tool.
  const prisma = { product: { findMany: async () => [] } } as any;
  const cloudinary = { uploadImage: async () => ({ url: '', publicId: '' }) } as any;
  return new AgentWorkflowService(config, prisma, cloudinary);
}

describe('AgentWorkflowService (product enrichment crew)', () => {
  it('đi qua 3 role và APPROVED khi reviewer đồng ý', async () => {
    // Mỗi role 1 fake riêng: ReAct agent bindTools tạo copy có counter độc lập
    // nên không thể dùng chung 1 response queue.
    const models = {
      researcher: new FakeListChatModel({
        responses: ['- Công suất: 500W\n- Dung tích: 1.5L\n- SKU: MB-500'],
      }),
      writer: new FakeListChatModel({
        responses: ['## Máy xay MegaBlend 500W\nMô tả marketing...'],
      }),
      reviewer: new FakeListChatModel({
        responses: ['{"verdict": "approved", "feedback": ""}'],
      }),
    };

    const result = await buildService().runEnrichment(INPUT, models);

    expect(result.status).toBe('approved');
    expect(result.description).toContain('MegaBlend');
    expect(result.retryCount).toBe(0);
  });

  it('cho đúng 2 vòng sửa rồi dừng khi bị reject liên tục', async () => {
    const models = {
      researcher: new FakeListChatModel({ responses: ['specs chuẩn'] }),
      writer: new FakeListChatModel({
        responses: [
          'bản nháp 1 (gốc)',
          'bản nháp 2 (sửa lần 1)',
          'bản nháp 3 (sửa lần 2)',
        ],
      }),
      reviewer: new FakeListChatModel({
        responses: [
          '{"verdict": "rejected", "feedback": "thiếu thông số"}',
          '{"verdict": "rejected", "feedback": "vẫn thiếu"}',
          '{"verdict": "rejected", "feedback": "vẫn chưa đạt"}',
        ],
      }),
    };

    const result = await buildService().runEnrichment(INPUT, models);

    expect(result.status).toBe('rejected');
    expect(result.retryCount).toBe(MAX_REVIEW_RETRIES);
    // Giữ bản nháp tốt nhất (bản sửa lần 2) thay vì rỗng.
    expect(result.description).toBe('bản nháp 3 (sửa lần 2)');
    // Nếu graph loop vô tận, FakeListChatModel xoay vòng responses và test
    // treo/sai assertion ở trên — cũng là cách bắt infinite loop.
  });
});

describe('createResearcherNode', () => {
  const state = {
    productId: 'p-1',
    productName: 'Máy xay X',
    brand: 'X',
    categoryName: 'Gia dụng',
    specsRaw: '{"a": 1}',
    normalizedSpecs: '',
    draft: '',
    reviewFeedback: '',
    designerImages: [],
    status: 'researching',
    retryCount: 0,
  } as ProductEnrichmentState;
  const prisma = { product: { findMany: async () => [] } } as any;

  it('useTools:false (đường Agnes) trả specs text, không cần agent loop', async () => {
    const model = new FakeListChatModel({ responses: ['- spec A\n- spec B'] });
    const node = createResearcherNode(model, prisma, { useTools: false });
    const out = await node(state);
    expect(out.normalizedSpecs).toContain('spec A');
    expect(out.status).toBe('drafting');
  });
});

describe('stripCodeFences', () => {
  it('bóc fence markdown đầu/cuối, giữ nội dung', () => {
    expect(stripCodeFences('```markdown\n## Title\nText\n```')).toBe(
      '## Title\nText',
    );
    expect(stripCodeFences('```\n## Title\n```')).toBe('## Title');
    expect(stripCodeFences('## Sạch không fence')).toBe('## Sạch không fence');
    expect(stripCodeFences('')).toBe('');
  });
});

describe('createDesignerNode', () => {
  const baseState: ProductEnrichmentState = {
    productId: 'prod-test-1',
    productName: 'Máy xay sinh tố MegaBlend 500W',
    brand: 'MegaBlend',
    categoryName: 'Đồ gia dụng',
    specsRaw: '{}',
    normalizedSpecs: '- Công suất: 500W',
    draft: '## Mô tả',
    reviewFeedback: '',
    designerImages: [],
    status: 'approved',
    retryCount: 0,
  };

  it('disabled (mặc định) thì no-op, không gọi API tốn phí', async () => {
    let called = 0;
    const node = createDesignerNode({
      enabled: false,
      generateImage: async () => {
        called += 1;
        return Buffer.from('x');
      },
      uploadImage: async () => {
        called += 1;
        return 'https://cdn/x.jpg';
      },
    });

    const out = await node({ ...baseState });
    expect(out.designerImages).toEqual([]);
    expect(called).toBe(0);
  });

  it('enabled thì gen ảnh → upload → trả URL', async () => {
    const node = createDesignerNode({
      enabled: true,
      generateImage: async (prompt: string) => {
        expect(prompt).toContain('MegaBlend');
        return Buffer.from('fake-bytes');
      },
      uploadImage: async (buf: Buffer, filename: string) => {
        expect(buf.length).toBeGreaterThan(0);
        expect(filename).toBe('prod-test-1.jpg');
        return 'https://res.cloudinary.com/demo/agent/prod-test-1.jpg';
      },
    });

    const out = await node({ ...baseState });
    expect(out.designerImages).toEqual([
      'https://res.cloudinary.com/demo/agent/prod-test-1.jpg',
    ]);
  });

  it('gen/upload lỗi thì nuốt lỗi, trả mảng rỗng để giữ mô tả đã duyệt', async () => {
    const errors: unknown[] = [];
    const node = createDesignerNode({
      enabled: true,
      generateImage: async () => {
        throw new Error('429 quota');
      },
      uploadImage: async () => 'https://cdn/x.jpg',
      onError: (e) => errors.push(e),
    });

    const out = await node({ ...baseState });
    expect(out.designerImages).toEqual([]);
    expect(errors).toHaveLength(1);
  });
});
