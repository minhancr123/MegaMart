import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/audit-log.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('audit-logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('JWT-auth')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit logs with pagination and filters' })
  async findAll(@Query() query: QueryAuditLogDto) {
    return this.auditLogService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit log statistics' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze' })
  async getStats(@Query('days') days?: number) {
    return this.auditLogService.getStats(days ? Number(days) : 30);
  }

  @Get('entity/:entity/:entityId')
  @ApiOperation({ summary: 'Get logs for a specific entity' })
  async findByEntity(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditLogService.findByEntity(entity, entityId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get logs for a specific user' })
  @ApiQuery({ name: 'limit', required: false })
  async findByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditLogService.findByUser(userId, limit ? Number(limit) : 50);
  }

  @Delete('cleanup')
  @ApiOperation({ summary: 'Cleanup old audit logs' })
  @ApiQuery({ name: 'days', required: false, description: 'Days to keep' })
  async cleanup(@Query('days') days?: number) {
    return this.auditLogService.cleanup(days ? Number(days) : 90);
  }
}
