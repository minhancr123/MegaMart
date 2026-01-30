import { Controller, Get, Query, UseGuards, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import type { TimePeriod } from './analytics.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { TrackEventDto } from './dto/track-event.dto';
import type { Request } from 'express';

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

    // ============ USER EVENT TRACKING ENDPOINTS ============

    @Post('track-event')
    @ApiOperation({ summary: 'Track user event (public endpoint)' })
    async trackEvent(@Body() dto: TrackEventDto, @Req() req: Request) {
        // Add IP and user agent from request
        dto.ipAddress = req.ip || req.headers['x-forwarded-for'] as string || req.connection.remoteAddress;
        dto.userAgent = req.headers['user-agent'];

        await this.analyticsService.trackEvent(dto);

        return {
            success: true,
            message: 'Event tracked successfully',
        };
    }

    @Get('event-stats')
    @ApiOperation({ summary: 'Get event statistics' })
    @ApiQuery({ name: 'startDate', required: false, type: Date })
    @ApiQuery({ name: 'endDate', required: false, type: Date })
    async getEventStats(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        const stats = await this.analyticsService.getEventStats(start, end);

        return {
            success: true,
            data: stats,
            message: 'Lấy thống kê event thành công',
        };
    }

    @Get('user-journey/:sessionId')
    @ApiOperation({ summary: 'Get user journey by session' })
    async getUserJourney(@Query('sessionId') sessionId: string) {
        const journey = await this.analyticsService.getUserJourney(sessionId);

        return {
            success: true,
            data: journey,
            message: 'Lấy user journey thành công',
        };
    }

    @Get('conversion-funnel')
    @ApiOperation({ summary: 'Get conversion funnel analytics' })
    @ApiQuery({ name: 'startDate', required: false, type: Date })
    @ApiQuery({ name: 'endDate', required: false, type: Date })
    async getConversionFunnel(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        const funnel = await this.analyticsService.getConversionFunnel(start, end);

        return {
            success: true,
            data: funnel,
            message: 'Lấy conversion funnel thành công',
        };
    }

    @Get('search-analytics')
    @ApiOperation({ summary: 'Get search analytics (top search terms)' })
    @ApiQuery({ name: 'startDate', required: false, type: Date })
    @ApiQuery({ name: 'endDate', required: false, type: Date })
    async getSearchAnalytics(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        const searchStats = await this.analyticsService.getSearchAnalytics(start, end);

        return {
            success: true,
            data: searchStats,
            message: 'Lấy search analytics thành công',
        };
    }
}
