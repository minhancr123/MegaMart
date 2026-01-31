"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchOrderById } from "@/lib/orderApi";
import { updateOrderStatus } from "@/lib/adminApi";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, MapPin, Phone, User, Calendar, CreditCard, ArrowLeft, ShoppingBag, Truck, Edit } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

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

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Update Status Dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadOrder(params.id as string);
    }
  }, [params.id]);

  const loadOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const res = await fetchOrderById(orderId);
      
      if ((res as any)?.id) {
        setOrder(res);
      } else if ((res as any)?.data) {
        setOrder((res as any).data);
      } else {
        setOrder(res);
      }
    } catch (err: any) {
      console.error("Load order error:", err);
      toast.error("Không thể tải thông tin đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStatusDialog = () => {
    setNewStatus(order.status);
    setReason("");
    setNote("");
    setStatusDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!order || !newStatus) return;
    if (newStatus === order.status) {
      toast.error("Vui lòng chọn trạng thái khác");
      return;
    }

    try {
      setUpdating(true);
      await updateOrderStatus(order.id, newStatus, {
        reason,
        note,
        changedBy: "admin" // TODO: Get from auth context
      });
      toast.success("Cập nhật trạng thái thành công");
      setStatusDialogOpen(false);
      await loadOrder(order.id); // Reload order
    } catch (error: any) {
      console.error("Failed to update status", error);
      toast.error(error?.response?.data?.message || "Không thể cập nhật trạng thái");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Không tìm thấy đơn hàng</h2>
          <Button onClick={() => router.push('/admin/orders')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay về danh sách
          </Button>
        </Card>
      </div>
    );
  }

  const status = statusConfig[order.status] || statusConfig.PENDING;
  const shippingAddr = order.shippingAddress || {};
  const subtotal = order.items?.reduce((sum: number, item: any) => 
    sum + (Number(item.price) * item.quantity), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Button variant="ghost" onClick={() => router.push('/admin/orders')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại danh sách
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Chi tiết đơn hàng #{order.code}</h1>
          <p className="text-gray-500 mt-1">
            Đặt ngày {new Date(order.createdAt).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${status.color} text-base px-4 py-2`}>{status.label}</Badge>
          <Button onClick={handleOpenStatusDialog} className="gap-2">
            <Edit className="w-4 h-4" /> Cập nhật trạng thái
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Package className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Chi tiết sản phẩm</h2>
            </div>
            
            <div className="space-y-4">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg border">
                  {item.variant?.product?.images?.[0] && (
                    <div className="relative w-20 h-20 flex-shrink-0 bg-white rounded overflow-hidden">
                      <Image
                        src={item.variant.product.images[0].url}
                        alt={item.variant.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {item.variant?.product?.name}
                    </h3>
                    {item.variant?.attributes && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {Object.entries(item.variant.attributes as Record<string, any>).map(([key, val]) => (
                          <span key={key} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {key}: {val}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-gray-600">Số lượng: {item.quantity}</p>
                    <p className="text-sm text-gray-600">
                      Đơn giá: {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(Number(item.price))}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Thành tiền</p>
                    <p className="text-lg font-bold text-blue-600">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(Number(item.price) * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Summary */}
            <div className="mt-6 pt-6 border-t space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tạm tính:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(subtotal)}
                </span>
              </div>
              
              {order.discountAmount && Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Giảm giá {order.voucherCode ? `(${order.voucherCode})` : ''}:</span>
                  <span className="font-medium text-green-600">
                    -{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(order.discountAmount))}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Thuế VAT:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(order.vatAmount || 0))}
                </span>
              </div>
              
              <div className="flex justify-between font-bold text-lg pt-3 border-t">
                <span>Tổng cộng:</span>
                <span className="text-blue-600 text-xl">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(order.total))}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Thông tin khách hàng</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Tên khách hàng</p>
                <p className="font-semibold text-gray-900">{order.user?.name || 'Khách lẻ'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="font-semibold text-gray-900">{order.user?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Số điện thoại</p>
                <p className="font-semibold text-gray-900">{shippingAddr.phone || 'N/A'}</p>
              </div>
            </div>
          </Card>

          {/* Shipping Info */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Truck className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Thông tin giao hàng</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Người nhận</p>
                <p className="font-semibold text-gray-900">{shippingAddr.fullName || 'Chưa có'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Số điện thoại</p>
                <p className="font-semibold text-gray-900">{shippingAddr.phone || 'Chưa có'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Địa chỉ</p>
                <p className="font-semibold text-gray-900 leading-relaxed">
                  {shippingAddr.address || 'Chưa có'}
                </p>
              </div>
              {shippingAddr.note && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500 mb-1">Ghi chú</p>
                  <p className="text-sm text-gray-900 italic">"{shippingAddr.note}"</p>
                </div>
              )}
            </div>
          </Card>

          {/* Payment Info */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">Thanh toán</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Phương thức:</span>
                <span className="font-semibold">
                  {order.payments?.[0]?.provider === 'OTHER' ? 'COD' : order.payments?.[0]?.provider || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Trạng thái:</span>
                <Badge className={status.color}>{status.label}</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cập nhật trạng thái đơn hàng</DialogTitle>
            <DialogDescription>
              Thay đổi trạng thái cho đơn hàng #{order.code}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Trạng thái mới</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                  <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
                  <SelectItem value="PROCESSING">Đang xử lý</SelectItem>
                  <SelectItem value="SHIPPING">Đang giao hàng</SelectItem>
                  <SelectItem value="DELIVERED">Đã giao</SelectItem>
                  <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
                  <SelectItem value="PAID">Đã thanh toán</SelectItem>
                  <SelectItem value="FAILED">Thất bại</SelectItem>
                  <SelectItem value="REFUNDED">Đã hoàn tiền</SelectItem>
                  <SelectItem value="CANCELED">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Lý do thay đổi (tùy chọn)</Label>
              <Input
                id="reason"
                placeholder="VD: Khách hàng yêu cầu"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Ghi chú thêm (tùy chọn)</Label>
              <Textarea
                id="note"
                placeholder="Thông tin bổ sung về thay đổi này..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateStatus} disabled={updating}>
              {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
