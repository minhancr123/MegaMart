import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FlashSaleService } from './flash-sale.service';
import { CreateFlashSaleDto, UpdateFlashSaleDto, AddFlashSaleItemsDto, UpdateFlashSaleItemDto } from './dto/flash-sale.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('flash-sales')
@Controller('flash-sales')
export class FlashSaleController {
  constructor(private readonly flashSaleService: FlashSaleService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get currently active flash sales (public)' })
  async findActive() {
    return this.flashSaleService.findActive();
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all flash sales (admin)' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'upcoming', 'ended', 'all'] })
  async findAll(@Query('status') status?: 'active' | 'upcoming' | 'ended' | 'all') {
    return this.flashSaleService.findAll(status || 'all');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get flash sale by ID' })
  async findOne(@Param('id') id: string) {
    return this.flashSaleService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new flash sale' })
  async create(@Body() createFlashSaleDto: CreateFlashSaleDto) {
    return this.flashSaleService.create(createFlashSaleDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update flash sale' })
  async update(@Param('id') id: string, @Body() updateFlashSaleDto: UpdateFlashSaleDto) {
    return this.flashSaleService.update(id, updateFlashSaleDto);
  }

  @Post(':id/items')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add items to flash sale' })
  async addItems(@Param('id') id: string, @Body() addItemsDto: AddFlashSaleItemsDto) {
    return this.flashSaleService.addItems(id, addItemsDto);
  }

  @Put(':id/items/:itemId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update flash sale item' })
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateFlashSaleItemDto,
  ) {
    return this.flashSaleService.updateItem(id, itemId, updateDto);
  }

  @Delete(':id/items/:itemId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove item from flash sale' })
  async removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.flashSaleService.removeItem(id, itemId);
  }

  @Put(':id/toggle')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle flash sale active status' })
  async toggleActive(@Param('id') id: string) {
    return this.flashSaleService.toggleActive(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete flash sale' })
  async delete(@Param('id') id: string) {
    return this.flashSaleService.delete(id);
  }
}
