import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from "@nestjs/common";
import { SaleService } from "./sale.service";
import {
  ApplySaleDto,
  UpdateVariantSaleDto,
  RemoveSaleDto,
} from "./dto/sale.dto";
import {
  AddSaleCampaignItemsDto,
  CreateSaleCampaignDto,
  GetSuggestedVariantsDto,
} from "./dto/sale-campaign.dto";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { AdminGuard } from "src/guards/admin.guard";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";

@ApiTags("sales")
@Controller("sales")
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Get("campaigns")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  async getCampaigns() {
    return this.saleService.getCampaigns();
  }

  @Get("campaigns/:id")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  async getCampaign(@Param("id") id: string) {
    return this.saleService.getCampaignById(id);
  }

  @Post("campaigns")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  async createCampaign(@Body() dto: CreateSaleCampaignDto) {
    return this.saleService.createCampaign(dto);
  }

  @Post("campaigns/:id/items")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  async addCampaignItems(
    @Param("id") id: string,
    @Body() dto: AddSaleCampaignItemsDto,
  ) {
    return this.saleService.addCampaignItems(id, dto);
  }

  @Post("campaigns/:id/apply")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  async applyCampaign(@Param("id") id: string) {
    return this.saleService.applyCampaign(id);
  }

  @Post("campaigns/:id/deactivate")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  async deactivateCampaign(@Param("id") id: string) {
    return this.saleService.deactivateCampaign(id);
  }

  @Post("campaigns/:id/end")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  async endCampaign(@Param("id") id: string) {
    return this.saleService.deactivateCampaign(id, "ENDED");
  }

  @Delete("campaigns/:id")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  async deleteCampaign(@Param("id") id: string) {
    return this.saleService.deleteCampaign(id);
  }

  @Get("active")
  @ApiOperation({ summary: "Get all active sales (public)" })
  async getActiveSales() {
    return this.saleService.getActiveSales();
  }

  @Get("timing-suggestions")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  async getTimingSuggestions() {
    return this.saleService.getTimingSuggestions();
  }

  @Get("suggested-variants")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  async getSuggestedVariants(@Query() query: GetSuggestedVariantsDto) {
    return this.saleService.getSuggestedVariants(query);
  }

  @Get("variants/search")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  async searchVariants(@Query("q") q = "", @Query("limit") limit = "20") {
    return this.saleService.searchVariantsForCampaign(q, Number(limit));
  }

  @Get("variant/:variantId")
  @ApiOperation({ summary: "Get sale info for a variant (public)" })
  async getVariantSale(@Param("variantId") variantId: string) {
    return this.saleService.getVariantSale(variantId);
  }

  @Get("variant/:variantId/price")
  @ApiOperation({ summary: "Calculate final price for a variant (public)" })
  async calculateFinalPrice(@Param("variantId") variantId: string) {
    return this.saleService.calculateFinalPrice(variantId);
  }

  @Post("apply")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Apply sale to variants (admin)" })
  async applySale(@Body() applySaleDto: ApplySaleDto) {
    return this.saleService.applySale(applySaleDto);
  }

  @Put("variant/:variantId")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Update sale for a variant (admin)" })
  async updateVariantSale(
    @Param("variantId") variantId: string,
    @Body() updateDto: UpdateVariantSaleDto,
  ) {
    return this.saleService.updateVariantSale(variantId, updateDto);
  }

  @Delete("remove")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Remove sale from variants (admin)" })
  async removeSale(@Body() removeSaleDto: RemoveSaleDto) {
    return this.saleService.removeSale(removeSaleDto);
  }
}
