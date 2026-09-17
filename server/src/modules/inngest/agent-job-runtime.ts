import type { PrismaService } from '../../prismaClient/prisma.service';
import { AGENT_JOBS } from './agent-jobs.meta';
import { isJobEnabled } from './job-flags';

export interface JobRuntime {
  /** Chạy hay bỏ qua kỳ này = công tắc boot (env) AND công tắc UI (DB). */
  enabled: boolean;
  /** Batch size hiệu lực (đã clamp 1..50). */
  batchSize: number;
  /** Công tắc boot riêng (để UI hiển thị lý do khi tắt cứng). */
  envOn: boolean;
}

function clampBatch(n: unknown, fallback: number): number {
  const v = Math.floor(Number(n));
  // null/NaN/0/âm → fallback (giữ defaultBatch=0 của job không-batch);
  // vượt trần → 50.
  if (!Number.isSafeInteger(v) || v < 1) return fallback;
  return Math.min(v, 50);
}

/**
 * Đọc cấu hình runtime của 1 job (gọi đầu mỗi handler, trước mọi step LLM).
 * - Thiếu row DB → dùng default (không tự ghi DB để tránh race tạo trùng).
 * - DB lỗi tạm thời → fail-open về default để cron không sập dây chuyền.
 */
export async function getJobRuntime(
  prisma: PrismaService,
  jobId: string,
): Promise<JobRuntime> {
  const meta = AGENT_JOBS.find((j) => j.id === jobId);
  if (!meta) {
    throw new Error(`Job id lạ: ${jobId} (không có trong AGENT_JOBS)`);
  }
  const envOn = isJobEnabled(meta.envKey);
  // KHÔNG try/catch ở đây: DB lỗi phải throw để Inngest retry theo backoff
  // (fail-open sẽ chạy xài token khi admin đã tắt; fail-closed nuốt lỗi).
  // Row thiếu = default (không tự ghi DB).
  const row = await prisma.agentJobConfig.findUnique({ where: { jobId } });
  return {
    enabled: envOn && (row?.enabled ?? true),
    batchSize: clampBatch(row?.batchSize ?? meta.defaultBatch, meta.defaultBatch),
    envOn,
  };
}
