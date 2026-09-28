import { Module, Global } from "@nestjs/common";
import { AuditLogController } from "./audit-log.controller";
import { AuditLogService } from "./audit-log.service";

@Global() // Make it globally available so other modules can use it
@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
