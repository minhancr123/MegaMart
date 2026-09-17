import { Body, Controller, Get, Param, Put, Request, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { ShippersService } from './shippers.service';

@ApiTags('shippers')
@Controller('shippers')
export class ShippersController {
  constructor(private readonly shippersService: ShippersService) {}

  private assertAdmin(req: any) {
    if (req?.user?.role !== 'ADMIN') {
      throw new HttpException({ success: false, message: 'Chỉ admin được thực hiện thao tác này' }, HttpStatus.FORBIDDEN);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async list(@Request() req: any) {
    this.assertAdmin(req);
    return this.shippersService.listShippers();
  }

  @Put(':userId/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async upsertProfile(@Param('userId') userId: string, @Body() body: any, @Request() req: any) {
    const currentId = req?.user?.userId;
    if (req?.user?.role !== 'ADMIN' && currentId !== userId) {
      throw new HttpException({ success: false, message: 'Không có quyền cập nhật profile shipper này' }, HttpStatus.FORBIDDEN);
    }
    return this.shippersService.upsertProfile(userId, body || {});
  }
}
