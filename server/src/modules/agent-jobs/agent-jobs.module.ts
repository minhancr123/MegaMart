import { Module } from "@nestjs/common";
import { AgentJobsService } from "./agent-jobs.service";
import { AgentJobsController } from "./agent-jobs.controller";

@Module({
  controllers: [AgentJobsController],
  providers: [AgentJobsService],
  exports: [AgentJobsService],
})
export class AgentJobsModule {}
