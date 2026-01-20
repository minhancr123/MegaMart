import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import type { TimePeriod } from './analytics.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('revenue-stats')
    @ApiOperation({ summary: 'Get revenue statistics by time period' })
    @ApiQuery({ name: 'period', enum: ['day', 'week', 'month', 'quarter', 'year'], required: false })
    @ApiQuery({ name: 'date', required: false, description: 'ISO date string' })
    async getRevenueStats(
        @Query('period') period: TimePeriod = 'week',
        @Query('date') dateStr?: string,
    ) {
        const date = dateStr ? new Date(dateStr) : undefined;
        const stats = await this.analyticsService.getRevenueStats(period, date);

        return {
            success: true,
            data: stats,
            message: 'Lấy thống kê doanh thu thành công',
        };
    }

    @Get('order-status-distribution')
    @ApiOperation({ summary: 'Get order status distribution' })
    async getOrderStatusDistribution() {
        const distribution = await this.analyticsService.getOrderStatusDistribution();

        return {
            success: true,
            data: distribution,
            message: 'Lấy phân phối trạng thái đơn hàng thành công',
        };
    }

    @Get('top-selling-products')
    @ApiOperation({ summary: 'Get top selling products' })
    @ApiQuery({ name: 'period', enum: ['day', 'week', 'month', 'quarter', 'year'], required: false })
    @ApiQuery({ name: 'limit', type: Number, required: false })
    async getTopSellingProducts(
        @Query('period') period: TimePeriod = 'week',
        @Query('limit') limit: string = '10',
    ) {
        const topProducts = await this.analyticsService.getTopSellingProducts(period, parseInt(limit, 10));

        return {
            success: true,
            data: topProducts,
            message: 'Lấy sản phẩm bán chạy thành công',
        };
    }
}
