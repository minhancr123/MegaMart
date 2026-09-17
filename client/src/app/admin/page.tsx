"use client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote, DollarSign, Loader2, Package, RefreshCw, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { getOrderStatusConfig } from "@/components/admin/OrderStatusBadge";
import { useEffect, useState, useCallback, useRef, type ComponentType } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getRevenueStats, getOrderStatusDistribution, getTopSellingProducts, TimePeriod } from "@/lib/analyticsApi";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Khớp đúng payload server/src/modules/analytics/analytics.service.ts trả về.
interface RevenueStats {
    totalRevenue: number;
    paidRevenue: number;
    totalOrders: number;
    paidOrders: number;
    avgOrderValue: number;
    chartData: Array<{ date: string; revenue: number }>;
}

interface OrderDistribution {
    status: string;
    count: number;
}

interface TopProduct {
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
}

interface ChartDataItem {
    date: string;
    revenue: number;
}

interface StatCard {
    title: string;
    value: string | number;
    hint: string;
    icon: ComponentType<{ className?: string }>;
    color: string;
    bg: string;
    href?: string;
}

const COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

const PERIOD_LABELS: Record<TimePeriod, string> = {
    day: 'Hôm nay',
    week: 'Tuần này',
    month: 'Tháng này',
    quarter: 'Quý này',
    year: 'Năm này',
};

const formatVND = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);

const tooltipStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--foreground)',
    fontSize: '12px',
};

const truncateName = (name?: string | null, max = 14) =>
    !name ? "" : name.length > max ? `${name.slice(0, max)}…` : name;

const formatChartDate = (raw: string, period: TimePeriod): string => {
    if (period === 'year') return raw;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    if (period === 'month' || period === 'quarter') {
        return d.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
    }
    return d.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
};

export default function AdminDashboard() {
    const [stats, setStats] = useState<RevenueStats | null>(null);
    const [orderDistribution, setOrderDistribution] = useState<OrderDistribution[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('week');
    const firstLoadRef = useRef(true);

    const loadDashboardData = useCallback(async (isInitial = false) => {
        try {
            setLoadError(false);
            if (isInitial) setInitialLoading(true);
            else setIsFetching(true);
            const [revenueData, distributionData, topProductsData] = await Promise.all([
                getRevenueStats(selectedPeriod),
                getOrderStatusDistribution(),
                getTopSellingProducts(selectedPeriod, 5)
            ]);

            setStats(revenueData as RevenueStats);
            setOrderDistribution(Array.isArray(distributionData) ? distributionData : []);
            setTopProducts(Array.isArray(topProductsData) ? topProductsData : []);
        } catch (error: unknown) {
            console.error("Failed to load dashboard data", error);
            setLoadError(true);
            if (isInitial) toast.error("Không thể tải dữ liệu thống kê");
        } finally {
            setInitialLoading(false);
            setIsFetching(false);
        }
    }, [selectedPeriod]);

    useEffect(() => {
        loadDashboardData(firstLoadRef.current);
        firstLoadRef.current = false;
    }, [loadDashboardData]);

    if (initialLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-9 w-40" />
                    <Skeleton className="h-9 w-72" />
                </div>
                <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                    {[0,1,2,3].map(i=><Skeleton key={i} className="h-32 w-full" />)}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                    <Skeleton className="h-80 w-full" />
                    <Skeleton className="h-80 w-full" />
                </div>
                <Skeleton className="h-80 w-full" />
            </div>
        );
    }

    if (loadError && !stats) {
        return (
            <div className="space-y-6">
                <AdminPageHeader title="Tổng quan" description="Chào mừng trở lại, Admin!" />
                <Card className="p-0">
                    <AdminEmptyState
                        icon={RefreshCw}
                        title="Không tải được dữ liệu thống kê"
                        description="Máy chủ bận hoặc mất kết nối. Vui lòng thử lại."
                        action={
                            <Button onClick={() => loadDashboardData(true)}>
                                <RefreshCw className="h-4 w-4 mr-2" /> Thử lại
                            </Button>
                        }
                    />
                </Card>
            </div>
        );
    }

    const statCards: StatCard[] = [
        {
            title: "Tổng doanh thu",
            value: formatVND(stats?.totalRevenue || 0),
            hint: `${stats?.totalOrders || 0} đơn trong kỳ`,
            icon: DollarSign,
            color: "text-[var(--success)]",
            bg: "bg-[var(--success)]/12",
        },
        {
            title: "Đơn hàng",
            value: stats?.totalOrders || 0,
            hint: `${stats?.paidOrders || 0} đơn đã thanh toán`,
            icon: ShoppingCart,
            color: "text-primary",
            bg: "bg-primary/10",
            href: "/admin/orders",
        },
        {
            title: "Giá trị TB/đơn",
            value: formatVND(stats?.avgOrderValue || 0),
            hint: "Trung bình mỗi đơn",
            icon: Package,
            color: "text-[var(--chart-4)]",
            bg: "bg-chart-4/15",
        },
        {
            title: "Doanh thu thực thu",
            value: formatVND(stats?.paidRevenue || 0),
            hint: "Đã thanh toán thành công",
            icon: Banknote,
            color: "text-chart-5",
            bg: "bg-chart-5/10",
        },
    ];

    const pieData = orderDistribution.map((item: OrderDistribution) => ({
        name: getOrderStatusConfig(item.status).label,
        value: item.count
    }));
    const hasPieData = pieData.some((item) => item.value > 0);

    const chartData: ChartDataItem[] = (stats?.chartData || []).map((item) => ({
        date: formatChartDate(item.date, selectedPeriod),
        revenue: Number(item.revenue) || 0
    }));

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Tổng quan"
                description="Chào mừng trở lại, Admin!"
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {(['day', 'week', 'month', 'quarter', 'year'] as TimePeriod[]).map((period) => (
                            <Button
                                key={period}
                                variant={selectedPeriod === period ? 'default' : 'outline'}
                                onClick={() => setSelectedPeriod(period)}
                                disabled={isFetching}
                                size="sm"
                            >
                                {PERIOD_LABELS[period]}
                            </Button>
                        ))}
                    </div>
                }
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat) => {
                    const cardBody = (
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground">{stat.hint}</span>
                            </div>
                            <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
                            <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                        </CardContent>
                    );

                    if (stat.href) {
                        return (
                            <Link key={stat.title} href={stat.href} aria-label="Xem danh sách đơn hàng">
                                <Card className="h-full cursor-pointer transition-colors hover:border-primary/50">
                                    {cardBody}
                                </Card>
                            </Link>
                        );
                    }

                    return <Card key={stat.title}>{cardBody}</Card>;
                })}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <Card >
                    <CardHeader>
                        <CardTitle>Biểu đồ doanh thu</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {chartData.length === 0 ? (
                            <div className="grid h-[300px] place-items-center text-sm text-muted-foreground">
                                Chưa có doanh thu trong kỳ này.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis tickFormatter={(value: any) => `${(Number(value) / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} width={48} />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(value: any) => formatVND(Number(value) || 0)}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} name="Doanh thu" />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Order Status Distribution */}
                <Card >
                    <CardHeader>
                        <CardTitle>Phân bố đơn hàng</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!hasPieData ? (
                            <div className="grid h-[300px] place-items-center text-sm text-muted-foreground">
                                Chưa có đơn hàng nào để thống kê.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry: any) => `${entry.name}: ${entry.value}`}
                                        outerRadius={80}
                                        fill="var(--chart-1)"
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Top Products Bar Chart */}
            <Card >
                <CardHeader>
                    <CardTitle>Sản phẩm bán chạy nhất</CardTitle>
                </CardHeader>
                <CardContent>
                    {topProducts.length === 0 ? (
                        <div className="grid h-[300px] place-items-center text-sm text-muted-foreground">
                            Chưa có sản phẩm bán ra trong kỳ này.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topProducts} margin={{ bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} tickFormatter={(name: any) => truncateName(name)} />
                                <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={40} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={48} tickFormatter={(value: any) => `${(Number(value) / 1000000).toFixed(1)}M`} />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    labelFormatter={(name: any) => String(name ?? "")}
                                    formatter={(value: any, name: any) => {
                                        if (name === 'Số lượng bán') {
                                            return Number(value) || 0;
                                        }
                                        return formatVND(Number(value) || 0);
                                    }}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="quantity" fill="var(--chart-1)" name="Số lượng bán" />
                                <Bar yAxisId="right" dataKey="revenue" fill="var(--chart-2)" name="Doanh thu" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
