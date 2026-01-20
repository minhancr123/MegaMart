"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { createOrder } from "@/lib/orderApi";
import { createVNPayPayment } from "@/lib/paymentApi";
import { validateVoucher } from "@/lib/voucherApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import AddressManager from "@/components/AddressManager";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { Wallet, CreditCard, MapPin } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, refreshCart } = useCart();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "VNPAY">("COD");
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [note, setNote] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [voucherStatus, setVoucherStatus] = useState<string | null>(null);

  const subtotal = cart?.data?.items?.reduce((s:any,item:any)=> s + (item.variant.price*item.quantity), 0) || 0;
  const tax = subtotal * 0.1;
  const total = Math.max(0, subtotal + tax - discount);

  const handleApplyVoucher = async () => {
    if (!voucherCode) {
      setVoucherStatus("Nhập mã giảm giá");
      return;
    }
    try {
      const res = await validateVoucher(voucherCode, subtotal);
      const data = (res as any)?.data || res;
      const amount = data?.discount || 0;
      setDiscount(amount);
      setVoucherStatus(`Áp dụng thành công, giảm ${amount.toLocaleString("vi-VN")}₫`);
    } catch (err: any) {
      console.error(err);
      setDiscount(0);
      setVoucherStatus(err?.errormassage || err?.message || "Không áp dụng được voucher");
    }
  };

  const handlePlaceOrder = async () => {
    if (!cart || !cart.data || cart.data.items.length === 0) {
      toast.error('Giỏ hàng trống');
      return;
    }

    if (!selectedAddress) {
      toast.error('Vui lòng chọn địa chỉ giao hàng');
      return;
    }

    if (!user?.id) {
      toast.error('Vui lòng đăng nhập');
      router.push('/auth');
      return;
    }

    setLoading(true);
    try {
      // Create order first
      const payload = {
        cartId: (cart as any)?.id || (cart as any)?.data?.id || null,
        shipping: {
          fullName: selectedAddress.fullName,
          phone: selectedAddress.phone,
          address: `${selectedAddress.address}, ${selectedAddress.ward}, ${selectedAddress.district}, ${selectedAddress.province}`,
          note: note || undefined,
        },
        paymentMethod: paymentMethod === "COD" ? "OTHER" : "VNPAY",
        totals: { subtotal, tax, total, discount },
        voucherCode: voucherCode || undefined,
      };

      const res = await createOrder(payload);
      console.log('Create order response:', res);
      
      // Interceptor có thể return nhiều dạng:
      // 1. { success: true, data: { id: "...", ... } }
      // 2. { id: "...", ... } (direct order object)
      // 3. { data: { id: "...", ... } }
      
      let orderId = null;
      const response = res as any;
      
      // Check nếu res có success field
      if (response?.success === true || response?.success === false) {
        // Response có success flag
        if (!response.success) {
          throw new Error(response?.message || 'Đặt hàng thất bại');
        }
        orderId = response?.data?.id;
      } else if (response?.id) {
        // Response là order object trực tiếp
        orderId = response.id;
      } else if (response?.data?.id) {
        // Response có data wrapper
        orderId = response.data.id;
      }
      
      if (!orderId) {
        console.error('Cannot get order ID from response:', res);
        throw new Error('Không lấy được ID đơn hàng');
      }

      console.log('Order created with ID:', orderId);

      // If VNPay, create payment URL and redirect
      if (paymentMethod === "VNPAY") {
        console.log('Creating VNPAY payment for order:', orderId);
        const paymentRes = await createVNPayPayment(orderId);
        console.log('VNPAY payment response:', paymentRes);
        
        // Response có thể có nhiều dạng:
        // 1. { success: true, data: { paymentUrl: "..." } }
        // 2. { data: { paymentUrl: "..." } }
        // 3. { paymentUrl: "..." } (trực tiếp)
        const response = paymentRes as any;
        const paymentUrl = response?.data?.paymentUrl || response?.paymentUrl;
        
        if (paymentUrl) {
          toast.success('Đang chuyển đến trang thanh toán...');
          // Redirect to VNPay payment gateway
          window.location.href = paymentUrl;
        } else {
          console.error('No payment URL found in response:', paymentRes);
          throw new Error('Không tạo được link thanh toán');
        }
      } else {
        // COD - just redirect to orders page
        toast.success('Đặt hàng thành công! Bạn sẽ thanh toán khi nhận hàng.');
        await refreshCart();
        router.push('/profile/orders');
      }
    } catch (error: any) {
      console.error('Place order error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Đặt hàng thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-slide-in-left">
        Thanh toán đơn hàng
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Address & Payment */}
        <div className="lg:col-span-2 space-y-6 animate-slide-in-left">
          {/* Address Section */}
          <Card className="shadow-lg transition-all duration-300 hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-lg">Địa chỉ giao hàng</h2>
              </div>
              <AddressManager 
                mode="select"
                onSelect={setSelectedAddress}
              />
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card className="shadow-lg transition-all duration-300 hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-5 h-5 text-green-600" />
                <h2 className="font-semibold text-lg">Phương thức thanh toán</h2>
              </div>
              
              <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v as "COD" | "VNPAY")}>
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200">
                  <RadioGroupItem value="COD" id="cod" />
                  <Label htmlFor="cod" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="font-medium">Thanh toán khi nhận hàng (COD)</p>
                        <p className="text-sm text-gray-500">Thanh toán bằng tiền mặt khi nhận hàng</p>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer mt-3 transition-all duration-200">
                  <RadioGroupItem value="VNPAY" id="vnpay" />
                  <Label htmlFor="vnpay" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Thanh toán qua VNPAY</p>
                        <p className="text-sm text-gray-500">Thanh toán bằng thẻ ATM/Visa/MasterCard</p>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Note */}
          <Card className="shadow-lg transition-all duration-300 hover:shadow-xl">
            <CardContent className="p-6">
              <Label htmlFor="note" className="text-sm font-medium mb-2 block">Ghi chú đơn hàng (tùy chọn)</Label>
              <Input
                id="note"
                placeholder="Ví dụ: Giao hàng giờ hành chính..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-1 animate-slide-in-right">
          <Card className="shadow-lg sticky top-6 transition-all duration-300 hover:shadow-xl">
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4">Tóm tắt đơn hàng</h2>
              
              {/* Cart items preview */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {cart?.data?.items?.map((item: any) => (
                  <div key={item.id} className="flex gap-3 text-sm">
                    <img 
                      src={item.variant?.product?.images?.[0] || "/placeholder.png"} 
                      alt={item.variant?.product?.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium line-clamp-2">{item.variant?.product?.name}</p>
                      <p className="text-gray-500">x{item.quantity}</p>
                    </div>
                    <p className="font-medium whitespace-nowrap">
                      {new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(item.variant.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tạm tính</span>
                  <span>{new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Thuế (10%)</span>
                  <span>{new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(tax)}</span>
                </div>
                <div className="space-y-2 pt-2">
                  <Label className="text-sm text-gray-700">Mã giảm giá</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nhập mã"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                    />
                    <Button type="button" variant="outline" onClick={handleApplyVoucher}>Áp dụng</Button>
                  </div>
                  {voucherStatus && (
                    <p className="text-xs text-gray-600">{voucherStatus}</p>
                  )}
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Giảm giá</span>
                    <span>-{new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Tổng cộng</span>
                  <span className="text-red-600">{new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(total)}</span>
                </div>
              </div>

              <Button 
                onClick={handlePlaceOrder} 
                disabled={loading || !selectedAddress} 
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {loading ? 'Đang xử lý...' : paymentMethod === 'VNPAY' ? 'Thanh toán ngay' : 'Đặt hàng'}
              </Button>
              
              {!selectedAddress && (
                <p className="text-sm text-red-500 text-center mt-2">Vui lòng chọn địa chỉ giao hàng</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
