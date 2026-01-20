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
  PAID: { label: "Đã thanh toán", color: "bg-green-100 text-green-800", icon: CheckCircle },
  CANCELED: { label: "Đã hủy", color: "bg-red-100 text-red-800", icon: XCircle },
  FAILED: { label: "Thất bại", color: "bg-red-100 text-red-800", icon: XCircle },
  REFUNDED: { label: "Đã hoàn tiền", color: "bg-blue-100 text-blue-800", icon: Package },
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex justify-center items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Đang tải đơn hàng của bạn...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-12 text-center shadow-2xl border-2 border-red-100">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Có lỗi xảy ra</h2>
              <p className="text-red-600 mb-6">{error}</p>
              <Button onClick={loadOrders} size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-lg">
                <Clock className="h-4 w-4 mr-2" />
                Thử lại
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-12 text-center shadow-2xl bg-white">
              <motion.div 
                className="w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6"
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <ShoppingBag className="h-16 w-16 text-blue-600" />
              </motion.div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3">Chưa có đơn hàng nào</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                Bạn chưa có đơn hàng nào. Hãy khám phá và mua sắm các sản phẩm tuyệt vời của chúng tôi!
              </p>
              <Link href="/products">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg text-lg px-8 py-6">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Khám phá sản phẩm
                </Button>
              </Link>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Đơn hàng của tôi</h1>
              <p className="text-gray-600 mt-1">Quản lý và theo dõi tất cả đơn hàng của bạn</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <Badge className="bg-blue-100 text-blue-700 text-sm px-3 py-1">
              {orders.length} đơn hàng
            </Badge>
            <Badge className="bg-green-100 text-green-700 text-sm px-3 py-1">
              {orders.filter(o => o.status === 'PAID').length} đã thanh toán
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-700 text-sm px-3 py-1">
              {orders.filter(o => o.status === 'PENDING').length} đang xử lý
            </Badge>
          </div>
        </motion.div>
        
        <div className="space-y-5">
          {orders.map((order, index) => {
            const status = statusConfig[order.status] || statusConfig.PENDING;
            const StatusIcon = status.icon;
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-2xl transition-all duration-300 overflow-hidden border-l-4 border-l-blue-500 bg-white">
                  <div className="bg-gradient-to-r from-blue-50/50 via-white to-transparent p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      {/* Order Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <ShoppingBag className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">Đơn hàng #{order.code}</h3>
                            <Badge className={`${status.color} text-xs font-semibold px-3 py-1 mt-1`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-lg">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span>{new Date(order.createdAt).toLocaleDateString('vi-VN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-lg">
                            <Package className="h-4 w-4 text-green-500" />
                            <span className="font-medium">{order.items?.length || 0} sản phẩm</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Total Price */}
                      <div className="lg:text-right bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-5 rounded-xl shadow-lg min-w-[200px]">
                        <p className="text-blue-100 text-xs mb-1 font-medium">Tổng thanh toán</p>
                        <p className="text-2xl lg:text-3xl font-bold">
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                            maximumFractionDigits: 0
                          }).format(Number(order.total))}
                        </p>
                      </div>
                    </div>

                    {/* Products Preview */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="grid gap-3">
                        {order.items?.slice(0, 3).map((item: any, idx: number) => (
                          <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 + idx * 0.05 }}
                            className="flex items-center justify-between bg-gradient-to-r from-white to-blue-50/30 rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {item.variant?.product?.images?.[0]?.url && (
                                <div className="relative w-16 h-16 flex-shrink-0 bg-white rounded-lg overflow-hidden shadow-sm">
                                  <Image 
                                    src={item.variant.product.images[0].url} 
                                    alt={item.variant?.product?.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 line-clamp-1 mb-1">
                                  {item.variant?.product?.name || "Sản phẩm"}
                                </p>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-600">SL: {item.quantity}</span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-blue-600 font-medium">
                                    {new Intl.NumberFormat('vi-VN', {
                                      style: 'currency',
                                      currency: 'VND',
                                      maximumFractionDigits: 0
                                    }).format(Number(item.price))}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span className="font-bold text-gray-900 text-lg ml-3">
                              {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                                maximumFractionDigits: 0
                              }).format(Number(item.price) * item.quantity)}
                            </span>
                          </motion.div>
                        ))}
                        {order.items?.length > 3 && (
                          <p className="text-sm text-gray-500 text-center py-2 bg-gray-50 rounded-lg">
                            ... và {order.items.length - 3} sản phẩm khác
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      <Link href={`/profile/orders/${order.id}`} className="flex-1">
                        <Button variant="default" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all">
                          <Eye className="h-4 w-4 mr-2" />
                          Xem chi tiết
                        </Button>
                      </Link>
                      
                      {order.status === 'PENDING' && (
                        <Button variant="outline" className="flex-1 border-2 border-red-300 text-red-600 hover:bg-red-50">
                          <XCircle className="h-4 w-4 mr-2" />
                          Hủy đơn hàng
                        </Button>
                      )}
                      
                      {order.status === 'PAID' && (
                        <Button variant="outline" className="flex-1 border-2 border-green-300 text-green-600 hover:bg-green-50">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mua lại
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
