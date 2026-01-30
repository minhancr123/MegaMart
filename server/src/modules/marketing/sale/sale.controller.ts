import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SaleService } from './sale.service';
import { ApplySaleDto, UpdateVariantSaleDto, RemoveSaleDto } from './dto/sale.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('sales')
@Controller('sales')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get all active sales (public)' })
  async getActiveSales() {
    return this.saleService.getActiveSales();
  }

  @Get('variant/:variantId')
  @ApiOperation({ summary: 'Get sale info for a variant (public)' })
  async getVariantSale(@Param('variantId') variantId: string) {
    return this.saleService.getVariantSale(variantId);
  }

  @Get('variant/:variantId/price')
  @ApiOperation({ summary: 'Calculate final price for a variant (public)' })
  async calculateFinalPrice(@Param('variantId') variantId: string) {
    return this.saleService.calculateFinalPrice(variantId);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Apply sale to variants (admin)' })
  async applySale(@Body() applySaleDto: ApplySaleDto) {
    return this.saleService.applySale(applySaleDto);
  }

  @Put('variant/:variantId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update sale for a variant (admin)' })
  async updateVariantSale(
    @Param('variantId') variantId: string,
    @Body() updateDto: UpdateVariantSaleDto,
  ) {
    return this.saleService.updateVariantSale(variantId, updateDto);
  }

  @Delete('remove')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove sale from variants (admin)' })
  async removeSale(@Body() removeSaleDto: RemoveSaleDto) {
    return this.saleService.removeSale(removeSaleDto);
  }
}
