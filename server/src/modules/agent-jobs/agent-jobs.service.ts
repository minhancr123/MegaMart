import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditAction,
  AuditEntity,
  AuditLogService,
} from "../audit-log/audit-log.service";
import { PrismaService } from "../../prismaClient/prisma.service";
import { AGENT_JOBS } from "../inngest/agent-jobs.meta";
import { isJobEnabled } from "../inngest/job-flags";
import type { UpdateAgentJobDto } from "./dto/update-agent-job.dto";

/**
 * Admin quản trị runtime agent jobs (không cần restart).
 * - enabled=false: kỳ cron tới thoát ngay, 0 token.
 * - batchSize: số item/lần chạy (clamp 1..50 ở DTO).
 * Công tắc boot (env) tắt thì job biến mất khỏi Inngest — đọc readonly ở đây.
 */
@Injectable()
export class AgentJobsService {
  private readonly logger = new Logger(AgentJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list() {
    // DB chưa migrate bảng (môi trường mới) → fallback rows rỗng, UI vẫn hiện
    // 5 jobs với default thay vì trắng trang 500.
    let rows: {
      jobId: string;
      enabled: boolean;
      batchSize: number | null;
      updatedAt: Date;
    }[] = [];
    try {
      rows = await this.prisma.agentJobConfig.findMany();
    } catch (e) {
      this.logger.warn(
        `agentJobConfig chưa đọc được (chưa migrate?): ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`,
      );
    }
    const byId = new Map(rows.map((r) => [r.jobId, r]));
    return AGENT_JOBS.map((m) => {
      const row = byId.get(m.id);
      const envOn = isJobEnabled(m.envKey);
      const enabled = row?.enabled ?? true;
      return {
        id: m.id,
        name: m.name,
        description: m.description,
        cron: m.cron,
        cronNote:
          "Sửa cron trong code job + rebuild (Inngest chốt lúc đăng ký)",
        envKey: m.envKey,
        envOn,
        enabled,
        effectiveOn: envOn && enabled,
        batchLabel: m.batchLabel,
        batchSize: row?.batchSize ?? m.defaultBatch,
        defaultBatch: m.defaultBatch,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }

  async update(jobId: string, dto: UpdateAgentJobDto, adminId: string) {
    const meta = AGENT_JOBS.find((j) => j.id === jobId);
    if (!meta) {
      throw new NotFoundException(`Job lạ: ${jobId}`);
    }
    if (dto.enabled === undefined && dto.batchSize === undefined) {
      throw new BadRequestException(
        "Phải cung cấp ít nhất enabled hoặc batchSize",
      );
    }
    if (dto.batchSize !== undefined && !meta.batchLabel) {
      throw new BadRequestException(
        `Job ${meta.name} không có batch (quét toàn bộ cố định)`,
      );
    }
    const row = await this.prisma.agentJobConfig.upsert({
      where: { jobId },
      update: {
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.batchSize !== undefined ? { batchSize: dto.batchSize } : {}),
      },
      create: {
        jobId,
        enabled: dto.enabled ?? true,
        batchSize: dto.batchSize ?? meta.defaultBatch,
      },
    });
    await this.audit.log(
      AuditAction.SETTINGS_UPDATE,
      AuditEntity.SETTINGS,
      adminId,
      jobId,
      {
        actor: "admin",
        source: "agent-jobs-ui",
        changes: dto,
      },
    );
    this.logger.log(
      `⚙️ agent-job ${jobId} cập nhật bởi ${adminId}: ${JSON.stringify(dto)}`,
    );
    return {
      id: row.jobId,
      enabled: row.enabled,
      batchSize: row.batchSize ?? meta.defaultBatch,
      updatedAt: row.updatedAt,
      envOn: isJobEnabled(meta.envKey),
    };
  }
}
