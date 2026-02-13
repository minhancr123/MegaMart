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
  PENDING: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800", icon: Clock },
  CONFIRMED: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800", icon: CheckCircle },
  PROCESSING: { label: "Đang xử lý", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800", icon: Package },
  SHIPPING: { label: "Đang giao hàng", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800", icon: TrendingUp },
  DELIVERED: { label: "Đã giao", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200 dark:border-teal-800", icon: CheckCircle },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800", icon: CheckCircle },
  PAID: { label: "Đã thanh toán", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800", icon: CheckCircle },
  CANCELED: { label: "Đã hủy", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800", icon: XCircle },
  FAILED: { label: "Thất bại", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800", icon: XCircle },
  REFUNDED: { label: "Đã hoàn tiền", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800", icon: Package },
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex justify-center items-center pt-[100px] md:pt-[120px]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Đang tải đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-[100px] md:pt-[120px] py-12">
        <div className="max-w-md mx-auto px-4">
          <Card className="p-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Có lỗi xảy ra</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-[100px] md:pt-[120px] py-12">
        <div className="max-w-md mx-auto px-4">
          <Card className="p-12 text-center">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Chưa có đơn hàng</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-950 dark:via-blue-950/10 dark:to-gray-950 pt-[100px] md:pt-[120px] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                Đơn hàng của tôi
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Quản lý và theo dõi đơn hàng của bạn</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{orders.length}</span> đơn hàng
              </span>
            </div>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-green-600 dark:text-green-400">{orders.filter(o => ['COMPLETED', 'DELIVERED'].includes(o.status)).length}</span> hoàn thành
              </span>
            </div>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">{orders.filter(o => ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING'].includes(o.status)).length}</span> đang xử lý
              </span>
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
                <Card className="hover:shadow-xl transition-all duration-300 hover:scale-[1.01] dark:bg-gray-900/80 dark:border-gray-800 bg-white/80 backdrop-blur-sm border-gray-200 overflow-hidden">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5 pb-5 border-b dark:border-gray-800 border-gray-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <StatusIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Đơn hàng #{order.code}</h3>
                          <Badge className={`${status.color} text-xs font-semibold px-3 py-1`}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(order.createdAt).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                          <span className="text-gray-300 dark:text-gray-700">•</span>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            <span>{order.items?.length || 0} sản phẩm</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tổng tiền</p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                            maximumFractionDigits: 0
                          }).format(Number(order.total))}
                        </p>
                      </div>
                    </div>

                    {/* Products Preview */}
                    <div className="space-y-3 mb-5">
                      {order.items?.slice(0, 2).map((item: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-4 p-3 bg-gradient-to-r from-gray-50 to-gray-50/50 dark:from-gray-800/50 dark:to-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all"
                        >
                          {item.variant?.product?.images?.[0]?.url && (
                            <div className="relative w-16 h-16 flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">
                              <Image 
                                src={item.variant.product.images[0].url} 
                                alt={item.variant?.product?.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white line-clamp-1 text-sm mb-1">
                              {item.variant?.product?.name || "Sản phẩm"}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Số lượng: <span className="font-medium">{item.quantity}</span> × {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                                maximumFractionDigits: 0
                              }).format(Number(item.price))}
                            </p>
                          </div>
                          <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                              maximumFractionDigits: 0
                            }).format(Number(item.price) * item.quantity)}
                          </div>
                        </div>
                      ))}
                      {order.items?.length > 2 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2 px-4 bg-gray-100/50 dark:bg-gray-800/30 rounded-lg">
                          và <span className="font-semibold">{order.items.length - 2}</span> sản phẩm khác
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Link href={`/profile/orders/${order.id}`}>
                        <Button variant="default" className="shadow-md hover:shadow-lg transition-all">
                          <Eye className="h-4 w-4 mr-2" />
                          Xem chi tiết
                        </Button>
                      </Link>
                      
                      {['PENDING', 'CONFIRMED'].includes(order.status) && (
                        <Button variant="outline" className="border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 shadow-sm">
                          <XCircle className="h-4 w-4 mr-2" />
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
