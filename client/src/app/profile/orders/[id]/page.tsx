"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchOrderById, cancelOrder, updateOrderPaymentMethod } from "@/lib/orderApi";
import { createVNPayPayment } from "@/lib/paymentApi";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Package, MapPin, Phone, User, Calendar, CreditCard, ArrowLeft, ShoppingBag, Truck, Clock, XCircle, Edit } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { motion } from "framer-motion";

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-800" },
  CONFIRMED: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-800" },
  PROCESSING: { label: "Đang xử lý", color: "bg-indigo-100 text-indigo-800" },
  SHIPPING: { label: "Đang giao hàng", color: "bg-orange-100 text-orange-800" },
  DELIVERED: { label: "Đã giao", color: "bg-teal-100 text-teal-800" },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-800" },
  PAID: { label: "Đã thanh toán", color: "bg-emerald-100 text-emerald-800" },
  CANCELED: { label: "Đã hủy", color: "bg-red-100 text-red-800" },
  FAILED: { label: "Thất bại", color: "bg-rose-100 text-rose-800" },
  REFUNDED: { label: "Đã hoàn tiền", color: "bg-purple-100 text-purple-800" },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState<string>("");
  const [updatingPayment, setUpdatingPayment] = useState(false);

  const [timeTick, setTimeTick] = useState(0);

  useEffect(() => {
    // Timer to update countdown every second
    const timer = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      setShowCancelConfirm(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    if (!order || !newPaymentMethod) return;

    try {
      setUpdatingPayment(true);

      // Cập nhật phương thức thanh toán
      const response = await updateOrderPaymentMethod(order.id, newPaymentMethod);
      console.log("Update payment method response:", response);
      
      // Nếu đổi sang VNPAY và có paymentUrl, redirect sang trang thanh toán
      // Response sau khi interceptor transform sẽ là { order, paymentUrl }
      if (newPaymentMethod === 'VNPAY' && response?.paymentUrl) {
        console.log("Redirecting to VNPAY:", response.paymentUrl);
        window.location.href = response.paymentUrl;
        return;
      }

      toast.success("Đã cập nhật phương thức thanh toán");
      
      // Reload order
      await loadOrder(order.id);
      setShowPaymentDialog(false);
    } catch (err: any) {
      console.error("Update payment method error:", err);
      toast.error(err?.response?.data?.message || "Không thể cập nhật phương thức thanh toán");
    } finally {
      setUpdatingPayment(false);
    }
  };

  // Kiểm tra xem có thể thay đổi phương thức thanh toán không
  const canChangePaymentMethod = order && ['PENDING', 'CONFIRMED'].includes(order.status);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex justify-center items-center pt-[100px] md:pt-[120px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Đang tải chi tiết đơn hàng...</p>
        </motion.div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-6 pt-[100px] md:pt-[120px]">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 pt-[100px] md:pt-[120px] py-8">
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
                  <div className="flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs">Ngày đặt hàng</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
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

                  <div className="flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
                    <CreditCard className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <p className="text-gray-600 dark:text-gray-400 text-xs">Phương thức thanh toán</p>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {order.payments?.[0]?.provider === 'OTHER' ? 'COD (Tiền mặt)' : order.payments?.[0]?.provider || 'Chưa thanh toán'}
                        </p>
                        {canChangePaymentMethod && (
                          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => setNewPaymentMethod(order.payments?.[0]?.provider || 'COD')}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Đổi
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Thay đổi phương thức thanh toán</DialogTitle>
                                <DialogDescription>
                                  Chọn phương thức thanh toán mới cho đơn hàng của bạn
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <RadioGroup value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                                  <div className="flex items-center space-x-2 p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <RadioGroupItem value="COD" id="cod" />
                                    <Label htmlFor="cod" className="flex-1 cursor-pointer">
                                      <div className="font-medium dark:text-white">Thanh toán khi nhận hàng (COD)</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">Thanh toán bằng tiền mặt</div>
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2 p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <RadioGroupItem value="VNPAY" id="vnpay" />
                                    <Label htmlFor="vnpay" className="flex-1 cursor-pointer">
                                      <div className="font-medium dark:text-white">VNPay</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">Thanh toán qua ví điện tử</div>
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2 p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <RadioGroupItem value="BANK_TRANSFER" id="bank" />
                                    <Label htmlFor="bank" className="flex-1 cursor-pointer">
                                      <div className="font-medium dark:text-white">Chuyển khoản ngân hàng</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">Chuyển khoản qua tài khoản</div>
                                    </Label>
                                  </div>
                                </RadioGroup>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  onClick={() => setShowPaymentDialog(false)}
                                  disabled={updatingPayment}
                                >
                                  Hủy
                                </Button>
                                <Button
                                  onClick={handleUpdatePaymentMethod}
                                  disabled={updatingPayment || !newPaymentMethod}
                                >
                                  {updatingPayment ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Đang cập nhật...
                                    </>
                                  ) : (
                                    'Xác nhận'
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
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
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Chi tiết sản phẩm</h2>
              </div>

              <div className="space-y-4">
                {order.items?.map((item: any, idx: number) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    className="flex gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 dark:from-gray-800 dark:to-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300"
                  >
                    {item.variant?.product?.images?.[0] && (
                      <div className="relative w-24 h-24 flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm">
                        <Image
                          src={item.variant.product.images[0].url}
                          alt={item.variant.product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                        {item.variant?.product?.name}
                      </h3>
                      {item.variant?.attributes && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {Object.entries(item.variant.attributes).map(([key, val]) => (
                            <span key={key} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                              {key}: {String(val)}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Số lượng:</span> {item.quantity}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Đơn giá:</span>{' '}
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
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
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Thành tiền</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
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
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3 bg-gradient-to-r from-gray-50 to-blue-50/20 dark:from-gray-800 dark:to-gray-800/50 p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tạm tính ({order.items?.length || 0} sản phẩm):</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0
                    }).format(subtotal)}
                  </span>
                </div>

                {order.discountAmount && Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Giảm giá {order.voucherCode ? `(${order.voucherCode})` : ''}:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      -{new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                        maximumFractionDigits: 0
                      }).format(Number(order.discountAmount))}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Thuế VAT:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0
                    }).format(Number(order.vatAmount || 0))}
                  </span>
                </div>

                <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-300 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-white">Tổng cộng:</span>
                  <span className="text-blue-600 dark:text-blue-400 text-2xl">
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
            {/* Payment Instructions for Manual Methods */}
            {order.status === 'PENDING' && ['MOMO', 'BANK_TRANSFER'].includes(order.payments?.[0]?.provider) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="p-6 shadow-lg border-l-4 border-l-pink-500 bg-pink-50/30 dark:bg-pink-900/10 dark:border-l-pink-400">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thông tin thanh toán</h2>
                  </div>

                  {/* Shared Logic for both MoMo and Bank Transfer: Use VietQR pointing to Sacombank */}
                  <div className="text-center">
                    <p className="font-medium mb-3 text-gray-700 dark:text-gray-300">
                      {order.payments?.[0]?.provider === 'MOMO'
                        ? "Quét mã bằng MoMo hoặc App Ngân hàng"
                        : "Quét mã để chuyển khoản nhanh"}
                    </p>

                    {(() => {
                      const createdAt = new Date(order.createdAt).getTime();
                      const now = new Date().getTime();
                      const expireTime = createdAt + 15 * 60 * 1000; // 15 minutes
                      const timeLeft = Math.max(0, expireTime - now);
                      const _tick = timeTick; // Force re-render

                      if (timeLeft <= 0) {
                        return (
                          <div className="bg-gray-100 p-6 rounded-xl border border-dashed border-gray-300 mb-3">
                            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                            <p className="text-red-500 font-medium">Mã QR đã hết hạn</p>
                            <p className="text-sm text-gray-500 mt-1">Vui lòng đặt lại đơn hàng mới</p>
                          </div>
                        );
                      }

                      const minutes = Math.floor(timeLeft / 60000);
                      const seconds = Math.floor((timeLeft % 60000) / 1000);

                      // VietQR Config
                      // Bank: Vietcombank (VCB)
                      // Acc: 10311656919
                      // Template: compact2 (standard QR)
                      const BANK_ID = "VCB";
                      const ACCOUNT_NO = "10311656919";
                      const TEMPLATE = "compact2";
                      const DESCRIPTION = `Thanh toan don hang ${order.code}`;
                      const accountName = "MEGAMART STORE";

                      // Encode URL params properly
                      const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-${TEMPLATE}.png?amount=${order.total}&addInfo=${encodeURIComponent(DESCRIPTION)}&accountName=${encodeURIComponent(accountName)}`;

                      return (
                        <div className="flex flex-col items-center">
                          <div className="bg-white dark:bg-gray-900 p-4 inline-block rounded-xl border dark:border-gray-800 shadow-sm mb-3 relative">
                            <div className="relative w-[200px] h-[200px]">
                              <Image
                                src={qrUrl}
                                alt="VietQR Payment"
                                fill
                                className="rounded-lg object-contain"
                                unoptimized
                              />
                            </div>
                            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow border dark:border-gray-700 text-xs font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1 whitespace-nowrap">
                              <Clock className="w-3 h-3" />
                              {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                            </div>
                          </div>
                          <p className="text-xs text-red-500 italic mb-3">Mã QR sẽ hết hạn sau 15 phút</p>
                        </div>
                      );
                    })()}

                    <div className="space-y-4 max-w-md mx-auto">
                      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border dark:border-gray-800 shadow-sm space-y-3 text-left">
                        <div className="flex justify-between items-center pb-2 border-b dark:border-gray-800">
                          <span className="text-sm text-gray-500">Ngân hàng</span>
                          <span className="font-bold text-blue-700">VIETCOMBANK</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b dark:border-gray-800">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Số tài khoản</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg text-gray-900 dark:text-white">10311656919</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => {
                              navigator.clipboard.writeText("10311656919");
                              toast.success("Đã sao chép STK");
                            }}>
                              <span className="sr-only">Copy</span>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 011.414.414l4 4a1 1 0 01.414 1.414V19a2 2 0 01-2 2h-6a2 2 0 01-2-2V7z" /></svg>
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b dark:border-gray-800">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Chủ tài khoản</span>
                          <span className="font-bold text-gray-900 dark:text-white">MEGAMART STORE</span>
                        </div>
                        <div className="pt-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Nội dung chuyển khoản</span>
                          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded border border-blue-100 dark:border-blue-900">
                            <b className="text-blue-600 dark:text-blue-400 font-mono text-sm">Thanh toan don hang {order.code}</b>
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300" onClick={() => {
                              navigator.clipboard.writeText(`Thanh toan don hang ${order.code}`);
                              toast.success("Đã sao chép nội dung CK");
                            }}>Sao chép</Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-center bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-blue-700 dark:text-blue-300">
                        Hệ thống sẽ tự động cập nhật trạng thái sau 5-10 phút khi nhận được thanh toán.
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Shipping Info */}
            <Card className="p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                <Truck className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thông tin giao hàng</h2>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Người nhận</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{shippingAddr.fullName || 'Chưa có'}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Số điện thoại</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{shippingAddr.phone || 'Chưa có'}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Địa chỉ giao hàng</p>
                    <p className="font-semibold text-gray-900 dark:text-white leading-relaxed">
                      {shippingAddr.address || 'Chưa có'}
                    </p>
                  </div>
                </div>

                {shippingAddr.note && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">Ghi chú đơn hàng</p>
                    <p className="text-sm text-gray-900 dark:text-white italic">"{shippingAddr.note}"</p>
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
                  onClick={() => setShowCancelConfirm(true)}
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

        <ConfirmDialog
          open={showCancelConfirm}
          onOpenChange={(open) => !open && setShowCancelConfirm(false)}
          onConfirm={handleCancelOrder}
          title="Xác nhận hủy đơn hàng"
          description="Bạn có chắc chắn muốn hủy đơn hàng này? Hành động này không thể hoàn tác."
          confirmText="Hủy đơn hàng"
          variant="destructive"
          isLoading={cancelling}
        />
      </div>
    </div >
  );
}
