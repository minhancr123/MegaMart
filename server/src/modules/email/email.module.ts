import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "src/prismaClient/prisma.module";
import { EmailService } from "./email.service";
import { EmailTemplateService } from "./email-template.service";

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [EmailService, EmailTemplateService],
  exports: [EmailService, EmailTemplateService],
})
export class EmailModule {}
