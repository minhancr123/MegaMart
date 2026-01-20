import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CompareService } from './compare.service';

@ApiTags('compare')
@Controller('compare')
export class CompareController {
  constructor(private readonly compareService: CompareService) {}

  @Get()
  async list(@Query('userId') userId: string) {
    const items = await this.compareService.list(userId);
    return { success: true, data: items };
  }

  @Post()
  async add(@Body() body: { userId: string; productId: string }) {
    const item = await this.compareService.add(body.userId, body.productId);
    return { success: true, data: item };
  }

  @Delete()
  async remove(@Query('userId') userId: string, @Query('productId') productId: string) {
    const result = await this.compareService.remove(userId, productId);
    return { success: true, data: result };
  }
}
