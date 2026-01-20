import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';

@ApiTags('wishlist')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async list(@Query('userId') userId: string) {
    const items = await this.wishlistService.list(userId);
    return { success: true, data: items };
  }

  @Post()
  async add(@Body() body: { userId: string; productId: string }) {
    const item = await this.wishlistService.add(body.userId, body.productId);
    return { success: true, data: item };
  }

  @Delete()
  async remove(@Query('userId') userId: string, @Query('productId') productId: string) {
    const result = await this.wishlistService.remove(userId, productId);
    return { success: true, data: result };
  }
}
