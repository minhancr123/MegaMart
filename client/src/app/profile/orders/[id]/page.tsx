"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchOrderById, cancelOrder } from "@/lib/orderApi";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, MapPin, Phone, User, Calendar, CreditCard, ArrowLeft, ShoppingBag, Truck } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { motion } from "framer-motion";

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "Đã thanh toán", color: "bg-green-100 text-green-800" },
  CANCELED: { label: "Đã hủy", color: "bg-red-100 text-red-800" },
  FAILED: { label: "Thất bại", color: "bg-red-100 text-red-800" },
  REFUNDED: { label: "Đã hoàn tiền", color: "bg-blue-100 text-blue-800" },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadOrder(params.id as string);
    }
  }, [params.id]);

  const loadOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const res = await fetchOrderById(orderId);
      console.log("Order detail response:", res);
      
      // Interceptor đã transform, res có thể là order object trực tiếp
      // Check nếu res có id property -> đó là order
      if ((res as any)?.id) {
        console.log("Setting order directly:", res);
        setOrder(res);
      } else if ((res as any)?.data) {
        console.log("Setting order from data:", (res as any).data);
        setOrder((res as any).data);
      } else {
        console.log("Setting order as is:", res);
        setOrder(res);
      }
    } catch (err: any) {
      console.error("Load order error:", err);
      toast.error("Không thể tải thông tin đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    
    if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) return;

    try {
      setCancelling(true);
      await cancelOrder(order.id);
      toast.success("Đã hủy đơn hàng thành công");
      router.push("/profile/orders");
    } catch (err: any) {
      console.error("Cancel order error:", err);
      toast.error(err?.response?.data?.message || "Không thể hủy đơn hàng");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex justify-center items-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Đang tải chi tiết đơn hàng...</p>
        </motion.div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Card className="p-8 text-center shadow-xl">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Không tìm thấy đơn hàng</h2>
            <p className="text-gray-600 mb-6">Đơn hàng này có thể đã bị xóa hoặc không tồn tại</p>
            <Button onClick={() => router.push('/profile/orders')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay về danh sách
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  const status = statusConfig[order.status] || statusConfig.PENDING;
  const shippingAddr = order.shippingAddress || {};

  // Calculate subtotal
  const subtotal = order.items?.reduce((sum: number, item: any) => 
    sum + (Number(item.price) * item.quantity), 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Button variant="ghost" onClick={() => router.back()} className="hover:bg-white/80">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại danh sách
          </Button>
        </motion.div>

        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 mb-6 shadow-lg border-l-4 border-l-blue-500 bg-gradient-to-r from-white to-blue-50/30">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Đơn hàng #{order.code}</h1>
                    <Badge className={`${status.color} mt-1`}>{status.label}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 bg-white/60 p-3 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-gray-600 text-xs">Ngày đặt hàng</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-white/60 p-3 rounded-lg">
                    <CreditCard className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-gray-600 text-xs">Phương thức thanh toán</p>
                      <p className="font-semibold text-gray-900">
                        {order.payments?.[0]?.provider === 'OTHER' ? 'COD (Tiền mặt)' : order.payments?.[0]?.provider || 'Chưa thanh toán'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="lg:text-right bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
                <p className="text-blue-100 text-sm mb-1">Tổng thanh toán</p>
                <p className="text-3xl lg:text-4xl font-bold">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                    maximumFractionDigits: 0
                  }).format(Number(order.total))}
                </p>
                <p className="text-blue-100 text-xs mt-1">
                  {order.items?.length || 0} sản phẩm
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            <Card className="p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                <Package className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Chi tiết sản phẩm</h2>
              </div>
              
              <div className="space-y-4">
                {order.items?.map((item: any, idx: number) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    className="flex gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300"
                  >
                    {item.variant?.product?.images?.[0] && (
                      <div className="relative w-24 h-24 flex-shrink-0 bg-white rounded-lg overflow-hidden shadow-sm">
                        <Image
                          src={item.variant.product.images[0].url}
                          alt={item.variant.product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                        {item.variant?.product?.name}
                      </h3>
                      {item.variant?.attributes && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {Object.entries(item.variant.attributes).map(([key, val]) => (
                            <span key={key} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              {key}: {val}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Số lượng:</span> {item.quantity}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Đơn giá:</span>{' '}
                        <span className="text-blue-600 font-semibold">
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                            maximumFractionDigits: 0
                          }).format(Number(item.price))}
                        </span>
                      </p>
                    </div>
                    
                    <div className="text-right flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Thành tiền</p>
                        <p className="text-lg font-bold text-blue-600">
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                            maximumFractionDigits: 0
                          }).format(Number(item.price) * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Price Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3 bg-gradient-to-r from-gray-50 to-blue-50/20 p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tạm tính ({order.items?.length || 0} sản phẩm):</span>
                  <span className="font-medium text-gray-900">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0
                    }).format(subtotal)}
                  </span>
                </div>
                
                {order.discountAmount && Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Giảm giá {order.voucherCode ? `(${order.voucherCode})` : ''}:</span>
                    <span className="font-medium text-green-600">
                      -{new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                        maximumFractionDigits: 0
                      }).format(Number(order.discountAmount))}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Thuế VAT:</span>
                  <span className="font-medium text-gray-900">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0
                    }).format(Number(order.vatAmount || 0))}
                  </span>
                </div>
                
                <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-300">
                  <span className="text-gray-900">Tổng cộng:</span>
                  <span className="text-blue-600 text-2xl">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0
                    }).format(Number(order.total))}
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Shipping Info */}
            <Card className="p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                <Truck className="h-5 w-5 text-green-600" />
                <h2 className="text-xl font-bold text-gray-900">Thông tin giao hàng</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Người nhận</p>
                    <p className="font-semibold text-gray-900">{shippingAddr.fullName || 'Chưa có'}</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Số điện thoại</p>
                    <p className="font-semibold text-gray-900">{shippingAddr.phone || 'Chưa có'}</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Địa chỉ giao hàng</p>
                    <p className="font-semibold text-gray-900 leading-relaxed">
                      {shippingAddr.address || 'Chưa có'}
                    </p>
                  </div>
                </div>

                {shippingAddr.note && (
                  <div className="pt-4 border-t border-gray-200 bg-yellow-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1 font-medium">Ghi chú đơn hàng</p>
                    <p className="text-sm text-gray-900 italic">"{shippingAddr.note}"</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Cancel Button */}
            {order.status === 'PENDING' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Button 
                  variant="destructive" 
                  className="w-full py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Đang hủy đơn hàng...
                    </>
                  ) : (
                    <>
                      <Package className="h-5 w-5 mr-2" />
                      Hủy đơn hàng
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
