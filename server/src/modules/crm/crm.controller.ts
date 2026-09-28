import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { AdminGuard } from "src/guards/admin.guard";
import { CrmService } from "./crm.service";
import {
  AssignCustomerTagDto,
  BulkPointsDto,
  BulkTagDto,
  CreateCustomerNoteDto,
  CreateCustomerTagDto,
  CrmCustomerQueryDto,
  IssueVoucherDto,
  BroadcastPromotionDto,
} from "./dto/crm.dto";

@Controller("admin/crm")
@UseGuards(JwtAuthGuard, AdminGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get("customers")
  listCustomers(@Query() query: CrmCustomerQueryDto) {
    return this.crmService.listCustomers(query);
  }

  @Get("customers/:id/profile")
  getProfile(@Param("id") id: string) {
    return this.crmService.calculateCustomerProfile(id);
  }

  @Get("customers/:id/timeline")
  getTimeline(@Param("id") id: string) {
    return this.crmService.getTimeline(id);
  }

  @Get("customers/:id/notes")
  getNotes(@Param("id") id: string) {
    return this.crmService.getNotes(id);
  }

  @Post("customers/:id/notes")
  createNote(
    @Param("id") id: string,
    @Body() dto: CreateCustomerNoteDto,
    @Req() req: any,
  ) {
    return this.crmService.createNote(id, dto, req.user?.userId);
  }

  @Patch("notes/:id/pin")
  pinNote(@Param("id") id: string, @Body("isPinned") isPinned: boolean) {
    return this.crmService.setNotePinned(id, !!isPinned);
  }

  @Delete("notes/:id")
  deleteNote(@Param("id") id: string) {
    return this.crmService.deleteNote(id);
  }

  @Get("tags")
  getTags() {
    return this.crmService.getTags();
  }

  @Post("tags")
  createTag(@Body() dto: CreateCustomerTagDto) {
    return this.crmService.createTag(dto);
  }

  @Post("customers/:id/tags")
  assignTag(
    @Param("id") id: string,
    @Body() dto: AssignCustomerTagDto,
    @Req() req: any,
  ) {
    return this.crmService.assignTag(id, dto.tagId, req.user?.userId);
  }

  @Delete("customers/:id/tags/:tagId")
  removeTag(@Param("id") id: string, @Param("tagId") tagId: string) {
    return this.crmService.removeTag(id, tagId);
  }

  @Post("bulk/tags")
  bulkTag(@Body() dto: BulkTagDto, @Req() req: any) {
    return this.crmService.bulkTag(dto, req.user?.userId);
  }

  @Post("bulk/points")
  bulkPoints(@Body() dto: BulkPointsDto) {
    return this.crmService.bulkPoints(dto);
  }

  @Post("bulk/vouchers")
  issuePersonalVouchers(@Body() dto: IssueVoucherDto) {
    return this.crmService.issuePersonalVouchers(dto);
  }

  @Post("broadcast")
  broadcastPromotion(@Body() dto: BroadcastPromotionDto) {
    return this.crmService.broadcastPromotion(dto);
  }

  @Get("dashboard")
  dashboard() {
    return this.crmService.dashboard();
  }
}
