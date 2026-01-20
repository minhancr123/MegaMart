import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('vouchers')
@Controller('vouchers')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Post()
  async create(@Body() dto: CreateVoucherDto) {
    const voucher = await this.voucherService.create(dto);
    return { success: true, data: voucher };
  }

  @Get(':code/validate')
  async validate(
    @Param('code') code: string,
    @Query('userId') userId?: string,
    @Query('subtotal') subtotal?: string,
  ) {
    const numericSubtotal = subtotal ? Number(subtotal) : undefined;
    const result = await this.voucherService.validate(code, userId, numericSubtotal);
    return { success: true, data: result };
  }
}
