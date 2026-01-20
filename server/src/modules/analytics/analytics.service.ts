import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';

export type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

@Injectable()
export class AnalyticsService {
    constructor(private prisma: PrismaService) { }

    async getRevenueStats(period: TimePeriod = 'week', date?: Date) {
        const targetDate = date || new Date();
        const { startDate, endDate } = this.getDateRange(period, targetDate);

        const orders = await this.prisma.order.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: {
                    in: ['PAID', 'PENDING'],
                },
            },
            select: {
                id: true,
                total: true,
                status: true,
                createdAt: true,
            },
        });

        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
        const paidOrders = orders.filter(o => o.status === 'PAID');
        const paidRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);

        // Group by date for chart data
        const revenueByDate = this.groupByDate(orders, period);

        return {
            period,
            startDate,
            endDate,
            totalRevenue,
            paidRevenue,
            totalOrders: orders.length,
            paidOrders: paidOrders.length,
            avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
            chartData: revenueByDate,
        };
    }

    async getOrderStatusDistribution() {
        const statusCounts = await this.prisma.order.groupBy({
            by: ['status'],
            _count: {
                id: true,
            },
        });

        return statusCounts.map(item => ({
            status: item.status,
            count: item._count.id,
        }));
    }

    async getTopSellingProducts(period: TimePeriod = 'week', limit: number = 10) {
        const { startDate, endDate } = this.getDateRange(period, new Date());

        const orderItems = await this.prisma.orderItem.findMany({
            where: {
                order: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: {
                        in: ['PAID', 'PENDING'],
                    },
                },
            },
            include: {
                variant: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        // Aggregate by product
        const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};

        orderItems.forEach(item => {
            const productId = item.variant.product.id;
            const productName = item.variant.product.name;

            if (!productSales[productId]) {
                productSales[productId] = { name: productName, quantity: 0, revenue: 0 };
            }

            productSales[productId].quantity += item.quantity;
            productSales[productId].revenue += Number(item.price) * item.quantity;
        });

        return Object.entries(productSales)
            .map(([id, data]) => ({ productId: id, ...data }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, limit);
    }

    private getDateRange(period: TimePeriod, date: Date): { startDate: Date; endDate: Date } {
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date(date);

        switch (period) {
            case 'day':
                startDate.setHours(0, 0, 0, 0);
                break;

            case 'week':
                const dayOfWeek = startDate.getDay();
                const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as first day
                startDate.setDate(startDate.getDate() - diff);
                startDate.setHours(0, 0, 0, 0);
                break;

            case 'month':
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
                break;

            case 'quarter':
                const currentMonth = startDate.getMonth();
                const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
                startDate.setMonth(quarterStartMonth);
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
                break;

            case 'year':
                startDate.setMonth(0);
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
                break;
        }

        return { startDate, endDate };
    }

    private groupByDate(orders: any[], period: TimePeriod): any[] {
        const grouped: Record<string, number> = {};

        orders.forEach(order => {
            const key = this.getDateKey(order.createdAt, period);
            grouped[key] = (grouped[key] || 0) + Number(order.total);
        });

        return Object.entries(grouped)
            .map(([date, revenue]) => ({ date, revenue }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    private getDateKey(date: Date, period: TimePeriod): string {
        const d = new Date(date);

        switch (period) {
            case 'day':
            case 'week':
                return d.toISOString().split('T')[0]; // YYYY-MM-DD

            case 'month':
            case 'quarter':
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

            case 'year':
                return String(d.getFullYear());
        }
    }
}
