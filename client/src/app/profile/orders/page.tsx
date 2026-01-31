"use client";

import { useState, useEffect } from "react";
import { fetchOrdersByUser } from "@/lib/orderApi";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Clock, CheckCircle, XCircle, Eye, ShoppingBag, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  CONFIRMED: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
  PROCESSING: { label: "Đang xử lý", color: "bg-indigo-100 text-indigo-800", icon: Package },
  SHIPPING: { label: "Đang giao hàng", color: "bg-orange-100 text-orange-800", icon: TrendingUp },
  DELIVERED: { label: "Đã giao", color: "bg-teal-100 text-teal-800", icon: CheckCircle },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-800", icon: CheckCircle },
  PAID: { label: "Đã thanh toán", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  CANCELED: { label: "Đã hủy", color: "bg-red-100 text-red-800", icon: XCircle },
  FAILED: { label: "Thất bại", color: "bg-rose-100 text-rose-800", icon: XCircle },
  REFUNDED: { label: "Đã hoàn tiền", color: "bg-purple-100 text-purple-800", icon: Package },
};

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Wait for auth to hydrate from localStorage
    const timer = setTimeout(() => {
      setAuthChecked(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!authChecked) return; // Wait for auth check
    
    if (!user?.id) {
      router.push("/auth");
      return;
    }
    loadOrders();
  }, [user?.id, authChecked]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchOrdersByUser(user!.id);
      console.log("Orders loaded:", data);
      console.log("Is array?", Array.isArray(data));
      setOrders(Array.isArray(data) ? data : []);
      console.log("Orders state after set:", data.length, "items");
    } catch (err: any) {
      console.error("Load orders error:", err);
      setError(err?.message || "Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  console.log("Current orders state:", orders.length, "Loading:", loading, "Error:", error);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Đang tải đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-md mx-auto px-4">
          <Card className="p-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Có lỗi xảy ra</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={loadOrders} className="w-full">
              Thử lại
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-md mx-auto px-4">
          <Card className="p-12 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Chưa có đơn hàng</h2>
            <p className="text-gray-600 mb-6">
              Bạn chưa có đơn hàng nào. Khám phá sản phẩm ngay!
            </p>
            <Link href="/products">
              <Button size="lg" className="w-full">
                <TrendingUp className="h-5 w-5 mr-2" />
                Mua sắm ngay
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Đơn hàng của tôi</h1>
          <p className="text-gray-600 dark:text-gray-400">Quản lý và theo dõi đơn hàng của bạn</p>
          
          <div className="flex items-center gap-3 mt-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{orders.length}</span> đơn hàng
            </div>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-green-600 dark:text-green-400">{orders.filter(o => ['COMPLETED', 'DELIVERED'].includes(o.status)).length}</span> hoàn thành
            </div>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-yellow-600 dark:text-yellow-400">{orders.filter(o => ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING'].includes(o.status)).length}</span> đang xử lý
            </div>
          </div>
        </motion.div>
        
        <div className="space-y-4">
          {orders.map((order, index) => {
            const status = statusConfig[order.status] || statusConfig.PENDING;
            const StatusIcon = status.icon;
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow duration-200 dark:bg-gray-900 dark:border-gray-800">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4 pb-4 border-b dark:border-gray-800">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Đơn hàng #{order.code}</h3>
                          <Badge className={`${status.color} text-xs`}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(order.createdAt).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                          <span className="text-gray-300">•</span>
                          <span>{order.items?.length || 0} sản phẩm</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Tổng tiền</p>
                        <p className="text-xl font-bold text-blue-600">
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                            maximumFractionDigits: 0
                          }).format(Number(order.total))}
                        </p>
                      </div>
                    </div>

                    {/* Products Preview */}
                    <div className="space-y-3 mb-4">
                      {order.items?.slice(0, 2).map((item: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          {item.variant?.product?.images?.[0]?.url && (
                            <div className="relative w-14 h-14 flex-shrink-0 bg-white dark:bg-gray-800 rounded overflow-hidden">
                              <Image 
                                src={item.variant.product.images[0].url} 
                                alt={item.variant?.product?.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 line-clamp-1 text-sm">
                              {item.variant?.product?.name || "Sản phẩm"}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              Số lượng: {item.quantity} × {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                                maximumFractionDigits: 0
                              }).format(Number(item.price))}
                            </p>
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                              maximumFractionDigits: 0
                            }).format(Number(item.price) * item.quantity)}
                          </div>
                        </div>
                      ))}
                      {order.items?.length > 2 && (
                        <p className="text-xs text-gray-500 text-center py-2">
                          và {order.items.length - 2} sản phẩm khác
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Link href={`/profile/orders/${order.id}`} className="flex-1">
                        <Button variant="default" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          Xem chi tiết
                        </Button>
                      </Link>
                      
                      {['PENDING', 'CONFIRMED'].includes(order.status) && (
                        <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                          Hủy đơn
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
