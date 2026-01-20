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
  Query,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiIAmATeapotResponse } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully', type: OrderResponseDto })
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    try {
      const order = await this.ordersService.createOrder(createOrderDto);
      return {
        success: true,
        data: order,
        message: 'Đặt hàng thành công'
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, message: 'Lỗi khi tạo đơn hàng', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async getUserOrders(@Request() req) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const orders = await this.ordersService.getOrdersByUser(userId);
      return {
        success: true,
        data: orders,
        message: 'Lấy danh sách đơn hàng thành công'
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Lỗi khi lấy danh sách đơn hàng', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get orders by user ID' })
  @ApiResponse({ status: 200, description: 'User orders retrieved successfully' })
  async getOrdersByUserId(@Param('userId') userId: string) {
    try {
      const orders = await this.ordersService.getOrdersByUser(userId);
      return {
        success: true,
        data: orders,
        message: 'Lấy danh sách đơn hàng thành công'
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Lỗi khi lấy danh sách đơn hàng', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders (Admin only)' })
  @ApiResponse({ status: 200, description: 'All orders retrieved successfully' })
  async getAllOrders(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const result = await this.ordersService.getAllOrders(pageNum, limitNum);
      return {
        success: true,
        data: result.orders,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: pageNum,
        message: 'Lấy danh sách tất cả đơn hàng thành công'
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Lỗi khi lấy danh sách đơn hàng', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get order by code' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully', type: OrderResponseDto })
  async getOrderByCode(@Param('code') code: string) {
    try {
      const order = await this.ordersService.getOrderByCode(code);
      return {
        success: true,
        data: order,
        message: 'Lấy thông tin đơn hàng thành công'
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, message: 'Lỗi khi lấy thông tin đơn hàng', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully', type: OrderResponseDto })
  async getOrderById(@Param('id') id: string) {
    try {
      const order = await this.ordersService.getOrderById(id);
      return {
        success: true,
        data: order,
        message: 'Lấy thông tin đơn hàng thành công'
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, message: 'Lỗi khi lấy thông tin đơn hàng', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto
  ) {
    try {
      const order = await this.ordersService.updateOrderStatus(id, updateOrderDto);
      return {
        success: true,
        data: order,
        message: 'Cập nhật trạng thái đơn hàng thành công'
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, message: 'Lỗi khi cập nhật trạng thái đơn hàng', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  async cancelOrder(@Param('id') id: string, @Request() req) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const order = await this.ordersService.cancelOrder(id, userId);
      return {
        success: true,
        data: order,
        message: 'Hủy đơn hàng thành công'
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, message: 'Lỗi khi hủy đơn hàng', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
