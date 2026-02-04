"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, ShoppingCart, Users, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getRevenueStats, getOrderStatusDistribution, getTopSellingProducts, TimePeriod } from "@/lib/analyticsApi";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RevenueStats {
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    totalUsers: number;
    revenueChange?: number;
    ordersChange?: number;
    productsChange?: number;
    usersChange?: number;
}

interface OrderDistribution {
    status: string;
    count: number;
    percentage: number;
}

interface TopProduct {
    id: string;
    name: string;
    soldCount: number;
    revenue: number;
}

interface ChartDataItem {
    date: string;
    revenue: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const PERIOD_LABELS: Record<TimePeriod, string> = {
    day: 'Hôm nay',
    week: 'Tuần này',
    month: 'Tháng này',
    quarter: 'Quý này',
    year: 'Năm này',
};

export default function AdminDashboard() {
    const [stats, setStats] = useState<RevenueStats | null>(null);
    const [orderDistribution, setOrderDistribution] = useState<OrderDistribution[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('week');

    const loadDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const [revenueData, distributionData, topProductsData] = await Promise.all([
                getRevenueStats(selectedPeriod),
                getOrderStatusDistribution(),
                getTopSellingProducts(selectedPeriod, 5)
            ]);

            setStats(revenueData as unknown as RevenueStats);
            setOrderDistribution(distributionData as unknown as OrderDistribution[]);
            setTopProducts(topProductsData as unknown as TopProduct[]);
        } catch (error: unknown) {
            console.error("Failed to load dashboard data", error);
            toast.error("Không thể tải dữ liệu thống kê");
        } finally {
            setLoading(false);
        }
    }, [selectedPeriod]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const statCards = [
        {
            title: "Tổng doanh thu",
            value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats?.totalRevenue || 0),
            change: "+12.5%",
            icon: DollarSign,
            color: "text-green-600",
            bg: "bg-green-100",
        },
        {
            title: "Đơn hàng mới",
            value: stats?.totalOrders || 0,
            change: `${stats?.paidOrders || 0} đã thanh toán`,
            icon: ShoppingCart,
            color: "text-blue-600",
            bg: "bg-blue-100",
        },
        {
            title: "Giá trị TB/đơn",
            value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(stats?.avgOrderValue || 0),
            change: "Trung bình",
            icon: Package,
            color: "text-orange-600",
            bg: "bg-orange-100",
        },
        {
            title: "Khách hàng",
            value: stats?.customers || 0,
            change: "+15.3%",
            icon: Users,
            color: "text-purple-600",
            bg: "bg-purple-100",
        },
    ];

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            PENDING: 'Chờ xử lý',
            PAID: 'Đã thanh toán',
            CANCELED: 'Đã hủy',
            FAILED: 'Thất bại',
            REFUNDED: 'Hoàn tiền',
        };
        return labels[status] || status;
    };

    const pieData = orderDistribution.map((item: OrderDistribution) => ({
        name: getStatusLabel(item.status),
        value: item.count
    }));

    const chartData: ChartDataItem[] = stats?.chartData?.map((item: { date: string; revenue: number }) => ({
        date: new Date(item.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
        revenue: item.revenue || 0
    })) || [];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Tổng quan</h1>
                    <p className="text-gray-500 mt-1">Chào mừng trở lại, Admin!</p>
                </div>

                {/* Period Selector */}
                <div className="flex gap-2">
                    {(['day', 'week', 'month', 'quarter', 'year'] as TimePeriod[]).map((period) => (
                        <Button
                            key={period}
                            variant={selectedPeriod === period ? 'default' : 'outline'}
                            onClick={() => setSelectedPeriod(period)}
                            className={selectedPeriod === period ? 'bg-blue-600' : ''}
                            size="sm"
                        >
                            {PERIOD_LABELS[period]}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <Card key={index} className="border-none shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-medium text-gray-500">{stat.change}</span>
                            </div>
                            <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Biểu đồ doanh thu</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                                <Tooltip
                                    formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Doanh thu" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Order Status Distribution */}
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Phân bố đơn hàng</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => `${entry.name}: ${entry.value}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Top Products Bar Chart */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle>Sản phẩm bán chạy nhất</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topProducts}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip
                                formatter={(value: number, name: string = '') => {
                                    if (name === 'revenue') {
                                        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
                                    }
                                    return value;
                                }}
                            />
                            <Legend />
                            <Bar dataKey="quantity" fill="#3b82f6" name="Số lượng bán" />
                            <Bar dataKey="revenue" fill="#10b981" name="Doanh thu" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
