import { Module } from "@nestjs/common";
import { CompareController } from "./compare.controller";
import { CompareService } from "./compare.service";

@Module({
  controllers: [CompareController],
  providers: [CompareService],
  exports: [CompareService],
})
export class CompareModule {}
