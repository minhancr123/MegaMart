/**
 * Metadata tĩnh của 5 agent jobs — nguồn duy nhất cho UI admin + runtime.
 * - id: trùng Inngest function id (không đổi tùy tiện).
 * - cron: nằm trong code job (Inngest chốt trigger lúc đăng ký — UI chỉ hiển thị).
 * - envKey: công tắc boot (tắt = job biến mất khỏi Inngest, cần restart).
 * - batchLabel null = job không có batch (quét toàn bộ, cố định vài LLM calls).
 */
export interface AgentJobMeta {
  id: string;
  name: string;
  description: string;
  cron: string;
  envKey: string;
  batchLabel: string | null;
  defaultBatch: number;
}

export const AGENT_JOBS: AgentJobMeta[] = [
  {
    id: "sales-ingest",
    name: "Ingest sale nội bộ",
    description:
      "Gom đơn đã chốt 30 ngày thành facts theo ngày × variant (0 token). Chạy trước flash-sale để analyst đọc số tươi.",
    cron: "0 18 * * *",
    envKey: "JOB_SALES_INGEST",
    batchLabel: null,
    defaultBatch: 0,
  },
  {
    id: "product-enrichment",
    name: "Làm giàu nội dung SP",
    description:
      "Crew 3 agent viết + duyệt mô tả SEO cho SP chưa có description. Rejected giữ null, không ghi bậy.",
    cron: "0 21 * * *",
    envKey: "JOB_PRODUCT_ENRICHMENT",
    batchLabel: "Số SP / lần chạy",
    defaultBatch: 3,
  },
  {
    id: "flash-sale-campaign",
    name: "Chiến dịch Flash Sale",
    description:
      "Chọn variant tồn cao/bán chậm, lên kế hoạch sale, tạo bản nháp DRAFT (active:false) chờ admin duyệt publish.",
    cron: "15 19 * * *",
    envKey: "JOB_FLASH_SALE",
    batchLabel: "Số ứng viên / lần",
    defaultBatch: 10,
  },
  {
    id: "voucher-governance",
    name: "Kiểm toán voucher",
    description:
      "Tự tắt voucher hết hạn/hết quota. Còn lại (gia hạn, thêm lượt, thu hồi) chỉ ghi đề xuất chờ admin duyệt.",
    cron: "45 20 * * *",
    envKey: "JOB_VOUCHER_GOVERNANCE",
    batchLabel: null,
    defaultBatch: 0,
  },
  {
    id: "loyalty-nurture",
    name: "Nuôi dưỡng loyalty",
    description:
      "Tìm khách mới/ngủ đông/sắp lên hạng, soạn ưu đãi + tạo voucher chờ duyệt. Duyệt mới bật voucher + gửi mail.",
    cron: "30 1 * * 1",
    envKey: "JOB_LOYALTY_NURTURE",
    batchLabel: "Số user / lần",
    defaultBatch: 5,
  },
  {
    id: "recommendation-refresh",
    name: "Gợi ý theo hành vi",
    description:
      "Gom hành vi (mua/wishlist/đánh giá/xem) rồi rank top 10 gợi ý cho từng user. ID lạ bị loại trước khi lưu.",
    cron: "20 22 * * *",
    envKey: "JOB_RECOMMENDATION",
    batchLabel: "Số user / lần",
    defaultBatch: 3,
  },
];
