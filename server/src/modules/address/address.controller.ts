import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@ApiTags('address')
@Controller('address')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all addresses by user' })
  async getAddressesByUser(@Param('userId') userId: string, @Request() req: any) {
    try {
      const addresses = await this.addressService.getAddressesByUser(userId);
      return {
        success: true,
        data: addresses,
        message: 'Lấy danh sách địa chỉ thành công'
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Lỗi khi lấy danh sách địa chỉ', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('default/:userId')
  @ApiOperation({ summary: 'Get default address' })
  async getDefaultAddress(@Param('userId') userId: string) {
    try {
      const address = await this.addressService.getDefaultAddress(userId);
      return {
        success: true,
        data: address,
        message: 'Lấy địa chỉ mặc định thành công'
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Lỗi khi lấy địa chỉ mặc định', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get address by ID' })
  async getAddressById(@Param('id') id: string, @Request() req: any) {
    try {
      const userId = req.user?.id;
      const address = await this.addressService.getAddressById(id, userId);
      return {
        success: true,
        data: address,
        message: 'Lấy thông tin địa chỉ thành công'
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, message: 'Lỗi khi lấy thông tin địa chỉ', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create new address' })
  async createAddress(@Body() createAddressDto: CreateAddressDto, @Request() req: any) {
    try {
      // Use authenticated user's ID if not provided
      if (!createAddressDto.userId && req.user?.id) {
        createAddressDto.userId = req.user.id;
      }

      const address = await this.addressService.createAddress(createAddressDto);
      return {
        success: true,
        data: address,
        message: 'Thêm địa chỉ thành công'
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Lỗi khi thêm địa chỉ', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update address' })
  async updateAddress(
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
    @Request() req: any
  ) {
    try {
      const userId = req.user?.id;
      const address = await this.addressService.updateAddress(id, updateAddressDto, userId);
      return {
        success: true,
        data: address,
        message: 'Cập nhật địa chỉ thành công'
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, message: 'Lỗi khi cập nhật địa chỉ', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set address as default' })
  async setDefaultAddress(@Param('id') id: string, @Request() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException(
          { success: false, message: 'Unauthorized' },
          HttpStatus.UNAUTHORIZED
        );
      }

      const address = await this.addressService.setDefaultAddress(id, userId);
      return {
        success: true,
        data: address,
        message: 'Đặt địa chỉ mặc định thành công'
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, message: 'Lỗi khi đặt địa chỉ mặc định', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete address' })
  async deleteAddress(@Param('id') id: string, @Request() req: any) {
    try {
      const userId = req.user?.id;
      const result = await this.addressService.deleteAddress(id, userId);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, message: 'Lỗi khi xóa địa chỉ', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
