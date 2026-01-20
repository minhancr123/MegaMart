import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewService } from './review.service';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  async create(@Body() dto: CreateReviewDto) {
    const review = await this.reviewService.create(dto);
    return { success: true, data: review };
  }

  @Get('product/:productId')
  async list(@Param('productId') productId: string) {
    const data = await this.reviewService.listByProduct(productId);
    return { success: true, data };
  }
}
