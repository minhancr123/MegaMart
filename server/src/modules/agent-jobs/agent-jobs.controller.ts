import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { AgentJobsService } from './agent-jobs.service';
import { UpdateAgentJobDto } from './dto/update-agent-job.dto';

@ApiTags('admin-agent-jobs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/agent-jobs')
export class AgentJobsController {
  constructor(private readonly jobs: AgentJobsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách runtime config 5 agent jobs (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Kèm cron, env, effective flag' })
  list() {
    return this.jobs.list();
  }

  @Patch(':jobId')
  @ApiOperation({
    summary: 'Bật/tắt hoặc đổi batch 1 job, hiệu lực kỳ cron tới (ADMIN)',
  })
  @ApiResponse({ status: 200, description: 'Config sau cập nhật' })
  update(
    @Param('jobId') jobId: string,
    @Req() req: any,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: UpdateAgentJobDto,
  ) {
    const adminId = req.user?.userId ?? req.user?.id;
    if (!adminId) throw new UnauthorizedException();
    return this.jobs.update(jobId, dto, adminId);
  }
}
