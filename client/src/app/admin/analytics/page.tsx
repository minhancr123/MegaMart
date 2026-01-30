"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Eye, 
  ShoppingCart, 
  Search, 
  TrendingUp, 
  CreditCard,
  CheckCircle,
  FileText,
  Package
} from "lucide-react";
import axiosClient from "@/lib/axiosClient";

interface EventStats {
  totalEvents: number;
  eventsByType: Array<{ eventType: string; _count: number }>;
  topPages: Array<{ url: string; views: number }>;
  topProducts: Array<{ productId: string; views: number }>;
}

interface ConversionFunnel {
  productViews: number;
  addToCarts: number;
  addToCartRate: number;
  checkoutStarts: number;
  checkoutRate: number;
  checkoutCompletes: number;
  completionRate: number;
  paymentSuccesses: number;
  conversionRate: number;
}

interface SearchTerm {
  term: string;
  count: number;
}

export default function AnalyticsPage() {
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null);
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;

      const [eventsRes, funnelRes, searchRes] = await Promise.all([
        axiosClient.get(`/analytics/event-stats${params}`),
        axiosClient.get(`/analytics/conversion-funnel${params}`),
        axiosClient.get(`/analytics/search-analytics${params}`),
      ]);

      setEventStats(eventsRes.data.data);
      setFunnel(funnelRes.data.data);
      setSearchTerms(searchRes.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      PAGE_VIEW: 'Lượt xem trang',
      PRODUCT_VIEW: 'Xem sản phẩm',
      CATEGORY_VIEW: 'Xem danh mục',
      SEARCH: 'Tìm kiếm',
      ADD_TO_CART: 'Thêm giỏ hàng',
      REMOVE_FROM_CART: 'Xóa giỏ hàng',
      ADD_TO_WISHLIST: 'Thêm yêu thích',
      CHECKOUT_START: 'Bắt đầu thanh toán',
      CHECKOUT_COMPLETE: 'Hoàn tất thanh toán',
      PAYMENT_SUCCESS: 'Thanh toán thành công',
      PAYMENT_FAILED: 'Thanh toán thất bại',
      REVIEW_SUBMIT: 'Gửi đánh giá',
      CLICK_BANNER: 'Click banner',
      CLICK_FLASH_SALE: 'Click flash sale',
      APPLY_VOUCHER: 'Áp dụng voucher',
      SHARE_PRODUCT: 'Chia sẻ sản phẩm',
      FILTER_PRODUCTS: 'Lọc sản phẩm',
      SORT_PRODUCTS: 'Sắp xếp sản phẩm',
    };
    return labels[eventType] || eventType;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Đang tải...</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Analytics Dashboard</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-3 py-2 border rounded w-full sm:w-auto"
            />
            <span className="hidden sm:inline self-center">đến</span>
          </div>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="px-3 py-2 border rounded w-full sm:w-auto"
          />
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full flex flex-wrap gap-2 justify-start">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="search">Tìm kiếm</TabsTrigger>
          <TabsTrigger value="events">Sự kiện</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tổng sự kiện</CardTitle>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{eventStats?.totalEvents.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Xem sản phẩm</CardTitle>
                <Eye className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{funnel?.productViews.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Thêm giỏ hàng</CardTitle>
                <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{funnel?.addToCarts.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Tỷ lệ: {funnel?.addToCartRate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Chuyển đổi</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{funnel?.conversionRate.toFixed(2)}%</div>
                <p className="text-xs text-muted-foreground">
                  {funnel?.paymentSuccesses} đơn thành công
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Pages */}
          <Card>
            <CardHeader>
              <CardTitle>Trang được xem nhiều nhất</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {eventStats?.topPages.slice(0, 10).map((page, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm truncate flex-1">{page.url}</span>
                    <span className="text-sm font-medium ml-4">{page.views} lượt xem</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Sản phẩm được xem nhiều nhất</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {eventStats?.topProducts.slice(0, 10).map((product, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">Sản phẩm ID: {product.productId}</span>
                    <span className="text-sm font-medium">{product.views} lượt xem</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-600" />
                    <span>Xem sản phẩm</span>
                  </div>
                  <span className="font-bold">{funnel?.productViews.toLocaleString()}</span>
                </div>
                
                <div className="pl-8 flex items-center justify-between p-4 bg-green-50 rounded">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-green-600" />
                    <span>Thêm giỏ hàng</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{funnel?.addToCarts.toLocaleString()}</div>
                    <div className="text-sm text-green-600">
                      {funnel?.addToCartRate.toFixed(1)}% từ xem sản phẩm
                    </div>
                  </div>
                </div>

                <div className="pl-16 flex items-center justify-between p-4 bg-yellow-50 rounded">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-yellow-600" />
                    <span>Bắt đầu thanh toán</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{funnel?.checkoutStarts.toLocaleString()}</div>
                    <div className="text-sm text-yellow-600">
                      {funnel?.checkoutRate.toFixed(1)}% từ giỏ hàng
                    </div>
                  </div>
                </div>

                <div className="pl-24 flex items-center justify-between p-4 bg-orange-50 rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <span>Hoàn tất thanh toán</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{funnel?.checkoutCompletes.toLocaleString()}</div>
                    <div className="text-sm text-orange-600">
                      {funnel?.completionRate.toFixed(1)}% từ bắt đầu
                    </div>
                  </div>
                </div>

                <div className="pl-32 flex items-center justify-between p-4 bg-red-50 rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-red-600" />
                    <span>Thanh toán thành công</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{funnel?.paymentSuccesses.toLocaleString()}</div>
                    <div className="text-sm text-red-600 font-bold">
                      {funnel?.conversionRate.toFixed(2)}% conversion rate
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Từ khóa tìm kiếm phổ biến</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {searchTerms.length === 0 ? (
                  <p className="text-gray-500">Chưa có dữ liệu tìm kiếm</p>
                ) : (
                  searchTerms.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">#{index + 1}</span>
                        <span className="font-medium">{item.term}</span>
                      </div>
                      <span className="text-sm text-gray-600">{item.count} lần</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sự kiện theo loại</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {eventStats?.eventsByType.map((event, index) => (
                  <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50">
                    <span>{getEventLabel(event.eventType)}</span>
                    <span className="font-bold">{event._count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* External Links */}
      <Card>
        <CardHeader>
          <CardTitle>Công cụ phân tích nâng cao</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://clarity.microsoft.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded hover:bg-gray-50 transition"
            >
              <h3 className="font-bold mb-2">Microsoft Clarity</h3>
              <p className="text-sm text-gray-600">Session recordings & heatmaps</p>
            </a>
            
            <a
              href="https://analytics.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded hover:bg-gray-50 transition"
            >
              <h3 className="font-bold mb-2">Google Analytics</h3>
              <p className="text-sm text-gray-600">Traffic & behavior analysis</p>
            </a>
            
            <a
              href="https://sentry.io"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded hover:bg-gray-50 transition"
            >
              <h3 className="font-bold mb-2">Sentry</h3>
              <p className="text-sm text-gray-600">Error tracking & monitoring</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
