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

    // ============ USER EVENT TRACKING ============

    async trackEvent(dto: any) {
        return this.prisma.userEvent.create({
            data: {
                eventType: dto.eventType,
                eventName: dto.eventName,
                sessionId: dto.sessionId,
                userId: dto.userId,
                metadata: dto.metadata || {},
                userAgent: dto.userAgent,
                ipAddress: dto.ipAddress,
                referrer: dto.referrer,
                pageUrl: dto.pageUrl,
            },
        });
    }

    async getEventStats(startDate?: Date, endDate?: Date) {
        const where = {
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        };

        const [totalEvents, eventsByType, topPages, topProducts] = await Promise.all([
            // Total events
            this.prisma.userEvent.count({ where }),

            // Events by type
            this.prisma.userEvent.groupBy({
                by: ['eventType'],
                where,
                _count: true,
                orderBy: {
                    _count: {
                        eventType: 'desc',
                    },
                },
            }),

            // Top pages
            this.prisma.userEvent.groupBy({
                by: ['pageUrl'],
                where: {
                    ...where,
                    pageUrl: { not: null },
                },
                _count: true,
                orderBy: {
                    _count: {
                        pageUrl: 'desc',
                    },
                },
                take: 10,
            }),

            // Top products (from PRODUCT_VIEW events)
            this.prisma.userEvent.findMany({
                where: {
                    ...where,
                    eventType: 'PRODUCT_VIEW',
                },
                select: {
                    metadata: true,
                },
            }),
        ]);

        // Process top products
        const productViews: Record<string, number> = {};
        topProducts.forEach((event) => {
            const productId = (event.metadata as any)?.productId;
            if (productId) {
                productViews[productId] = (productViews[productId] || 0) + 1;
            }
        });

        const topProductsList = Object.entries(productViews)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([productId, count]) => ({ productId, views: count }));

        return {
            totalEvents,
            eventsByType,
            topPages: topPages.map((p) => ({
                url: p.pageUrl,
                views: p._count,
            })),
            topProducts: topProductsList,
        };
    }

    async getUserJourney(sessionId: string) {
        return this.prisma.userEvent.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
        });
    }

    async getConversionFunnel(startDate?: Date, endDate?: Date) {
        const where = {
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        };

        const [
            productViews,
            addToCarts,
            checkoutStarts,
            checkoutCompletes,
            paymentSuccesses,
        ] = await Promise.all([
            this.prisma.userEvent.count({
                where: { ...where, eventType: 'PRODUCT_VIEW' },
            }),
            this.prisma.userEvent.count({
                where: { ...where, eventType: 'ADD_TO_CART' },
            }),
            this.prisma.userEvent.count({
                where: { ...where, eventType: 'CHECKOUT_START' },
            }),
            this.prisma.userEvent.count({
                where: { ...where, eventType: 'CHECKOUT_COMPLETE' },
            }),
            this.prisma.userEvent.count({
                where: { ...where, eventType: 'PAYMENT_SUCCESS' },
            }),
        ]);

        return {
            productViews,
            addToCarts,
            addToCartRate: productViews > 0 ? (addToCarts / productViews) * 100 : 0,
            checkoutStarts,
            checkoutRate: addToCarts > 0 ? (checkoutStarts / addToCarts) * 100 : 0,
            checkoutCompletes,
            completionRate: checkoutStarts > 0 ? (checkoutCompletes / checkoutStarts) * 100 : 0,
            paymentSuccesses,
            conversionRate: productViews > 0 ? (paymentSuccesses / productViews) * 100 : 0,
        };
    }

    async getSearchAnalytics(startDate?: Date, endDate?: Date) {
        const searchEvents = await this.prisma.userEvent.findMany({
            where: {
                eventType: 'SEARCH',
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                metadata: true,
            },
        });

        const searchTerms: Record<string, number> = {};
        searchEvents.forEach((event) => {
            const searchTerm = (event.metadata as any)?.searchTerm;
            if (searchTerm) {
                searchTerms[searchTerm] = (searchTerms[searchTerm] || 0) + 1;
            }
        });

        return Object.entries(searchTerms)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([term, count]) => ({ term, count }));
    }
}

