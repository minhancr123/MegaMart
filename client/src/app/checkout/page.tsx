"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { createOrder } from "@/lib/orderApi";
import { createVNPayPayment } from "@/lib/paymentApi";
import { getMyAvailableVouchers, validateVoucher, type AssignedVoucher } from "@/lib/voucherApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import AddressManager from "@/components/AddressManager";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { Wallet, CreditCard, MapPin, Loader2, TicketPercent } from "lucide-react";
import { getEffectivePrice, getErrorMessage } from "@/lib/utils";
import { track } from "@/lib/eventTracker";
import { calculateGhnFee } from "@/lib/shippingApi";
import { getMyWallet } from "@/lib/walletApi";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, refreshCart } = useCart();
  const { user } = useAuthStore();
  const cartStore = useCartStore();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "VNPAY" | "MOMO" | "BANK_TRANSFER">("COD");
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [note, setNote] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [selectedVoucherCode, setSelectedVoucherCode] = useState("");
  const [userVouchers, setUserVouchers] = useState<AssignedVoucher[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [voucherStatus, setVoucherStatus] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWalletChecked, setUseWalletChecked] = useState(false);

  // Tính toán chi tiết giỏ hàng (sale hết hạn/chưa tới thì về giá gốc)
  const subtotal = cart?.data?.items?.reduce((s: any, item: any) => {
    const itemPrice = getEffectivePrice(item.variant);
    const itemQuantity = Number(item.quantity) || 0;
    console.log(`Item: ${item.variant.product?.name}, Price: ${itemPrice}, Quantity: ${itemQuantity}, Subtotal: ${itemPrice * itemQuantity}`);
    return s + (itemPrice * itemQuantity);
  }, 0) || 0;
  
  const tax = Math.round(subtotal * 0.1); // Thuế VAT 10%, làm tròn
  // Phí ship thật từ GHN theo địa chỉ đã chọn (fallback 0 nếu chưa có mã GHN)
  const [shippingFee, setShippingFee] = useState(0);
  const [feeLoading, setFeeLoading] = useState(false);
  const total = Math.max(0, subtotal + tax + shippingFee - discount);
  const walletDeduction = useWalletChecked ? Math.min(walletBalance, total) : 0;
  const payableTotal = Math.max(0, total - walletDeduction);

  useEffect(() => {
    if (!user?.id) {
      setWalletBalance(0);
      setUseWalletChecked(false);
      setUserVouchers([]);
      return;
    }
    getMyWallet().then((w) => setWalletBalance(Number((w as any)?.balance || 0))).catch(() => setWalletBalance(0));
    setVouchersLoading(true);
    getMyAvailableVouchers()
      .then(setUserVouchers)
      .catch(() => setUserVouchers([]))
      .finally(() => setVouchersLoading(false));
  }, [user?.id]);

  const feeSeq = useRef(0);
  useEffect(() => {
    const districtId = selectedAddress?.districtId;
    const wardCode = selectedAddress?.wardCode;
    if (!districtId || !wardCode || !cart?.data?.items?.length) {
      setShippingFee(0);
      return;
    }
    let alive = true;
    const seq = ++feeSeq.current;
    setFeeLoading(true);
    const itemCount = cart.data.items.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0);
    const weight = Math.min(20000, Math.max(300, itemCount * 500));
    calculateGhnFee({ toDistrictId: districtId, toWardCode: wardCode, weight, insuranceValue: subtotal })
      .then((q) => {
        // Bỏ response cũ khi user đã đổi địa chỉ (chống race)
        if (alive && seq === feeSeq.current) setShippingFee(Number(q?.fee || 0));
      })
      .catch(() => {
        if (alive && seq === feeSeq.current) setShippingFee(0);
      })
      .finally(() => {
        if (alive && seq === feeSeq.current) setFeeLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedAddress?.districtId, selectedAddress?.wardCode, cart, subtotal]);

  useEffect(() => {
    if (!selectedVoucherCode) return;
    const selected = userVouchers.find((v) => v.code === selectedVoucherCode);
    if (selected?.minOrderValue && subtotal < selected.minOrderValue) {
      setSelectedVoucherCode("");
      setVoucherCode("");
      setDiscount(0);
      setVoucherStatus(`Voucher vừa chọn cần đơn tối thiểu ${selected.minOrderValue.toLocaleString("vi-VN")}₫`);
    }
  }, [selectedVoucherCode, subtotal, userVouchers]);

  useEffect(() => {
    if (!voucherCode || subtotal <= 0) return;
    let alive = true;
    validateVoucher(voucherCode, subtotal, user?.id)
      .then((res) => {
        if (!alive) return;
        const data = (res as any)?.data || res;
        const amount = data?.voucher?.type === "FREESHIP" ? Math.min(Number(data?.discount || 0), shippingFee) : Number(data?.discount || 0);
        setDiscount(amount);
      })
      .catch(() => {
        if (!alive) return;
        setVoucherCode("");
        setSelectedVoucherCode("");
        setDiscount(0);
        setVoucherStatus("Voucher/promo code không còn phù hợp với giỏ hàng");
      });
    return () => { alive = false; };
  }, [subtotal, shippingFee]);

  // Debug logs
  useEffect(() => {
    console.log('=== CHECKOUT CALCULATION ===');
    console.log('Subtotal:', subtotal);
    console.log('Tax (10%):', tax);
    console.log('Shipping:', shippingFee);
    console.log('Discount:', discount);
    console.log('Total:', total);
    console.log('Cart items:', cart?.data?.items);
  }, [subtotal, tax, discount, total, cart]);

  const applyCode = async (code: string, source: "voucher" | "promo") => {
    try {
      const res = await validateVoucher(code, subtotal, user?.id);
      const data = (res as any)?.data || res;
      const amount = data?.voucher?.type === "FREESHIP" ? Math.min(Number(data?.discount || 0), shippingFee) : Number(data?.discount || 0);
      setVoucherCode(code);
      setDiscount(amount);
      setVoucherStatus(`${source === "voucher" ? "Đã chọn voucher" : "Áp dụng promo code thành công"}, giảm ${amount.toLocaleString("vi-VN")}₫`);
      return true;
    } catch (err: any) {
      console.error(err);
      setDiscount(0);
      setVoucherCode("");
      setSelectedVoucherCode("");
      setVoucherStatus(getErrorMessage(err, source === "voucher" ? "Không áp dụng được voucher" : "Không áp dụng được promo code"));
      return false;
    }
  };

  const handleApplyPromoCode = async () => {
    const code = promoCodeInput.trim();
    if (!code) {
      setVoucherCode("");
      setDiscount(0);
      setVoucherStatus("Đã bỏ promo code");
      return;
    }
    const ok = await applyCode(code, "promo");
    if (ok) setSelectedVoucherCode("");
  };

  const handleSelectVoucherCard = async (voucher: AssignedVoucher) => {
    if (selectedVoucherCode === voucher.code) {
      setSelectedVoucherCode("");
      setVoucherCode("");
      setDiscount(0);
      setVoucherStatus("Đã bỏ chọn voucher");
      return;
    }
    if (voucher.minOrderValue && subtotal < voucher.minOrderValue) {
      setVoucherStatus(`Cần mua thêm ${(voucher.minOrderValue - subtotal).toLocaleString("vi-VN")}₫ để dùng voucher này`);
      return;
    }
    const ok = await applyCode(voucher.code, "voucher");
    if (ok) {
      setSelectedVoucherCode(voucher.code);
      setPromoCodeInput("");
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

    // Mô hình B: khách trả đúng phí GHN nên bắt buộc địa chỉ phải có mã
    // Quận/Xã GHN, nếu không sẽ không tính được phí chính xác.
    if (!selectedAddress.districtId || !selectedAddress.wardCode) {
      toast.error('Địa chỉ chưa có mã Quận/Xã GHN. Vui lòng sửa địa chỉ và chọn lại Tỉnh/Quận/Xã từ danh sách');
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
      const payload: any = {
        cartId: (cart as any)?.id || (cart as any)?.data?.id || null,
        shipping: {
          fullName: selectedAddress.fullName,
          phone: selectedAddress.phone,
          address: [selectedAddress.address, selectedAddress.ward, selectedAddress.district, selectedAddress.province]
            .filter(Boolean)
            .join(', '),
          lat: selectedAddress.lat ?? undefined,
          lng: selectedAddress.lng ?? undefined,
          provinceId: selectedAddress.provinceId ?? undefined,
          districtId: selectedAddress.districtId ?? undefined,
          wardCode: selectedAddress.wardCode ?? undefined,
          note: note || undefined,
        },
        paymentMethod: paymentMethod,
        totals: { subtotal, tax, total, discount, shippingFee },
        voucherCode: voucherCode || undefined,
        useWalletAmount: walletDeduction > 0 ? walletDeduction : undefined,
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

      // Track CHECKOUT_START / CHECKOUT_COMPLETE / PAYMENT_SUCCESS
      const itemsList = cart?.data?.items?.map((i: any) => ({
        id: i.variant?.product?.id || i.id,
        name: i.variant?.product?.name || "Product",
        price: getEffectivePrice(i.variant),
        quantity: i.quantity
      })) || [];

      track.checkoutStart(subtotal, itemsList.length);
      track.purchase(orderId, total, itemsList);

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
      } else if (paymentMethod === "MOMO" || paymentMethod === "BANK_TRANSFER") {
        toast.success('Đặt hàng thành công! Vui lòng thực hiện thanh toán.');
        cartStore.clearCart(); // Clear local cart
        await refreshCart();
        router.push(`/profile/orders/${orderId}`);
      } else {
        // COD
        toast.success('Đặt hàng thành công! Bạn sẽ thanh toán khi nhận hàng.');
        cartStore.clearCart(); // Clear local cart
        await refreshCart();
        router.push(`/profile/orders/${orderId}`);
      }
    } catch (error: any) {
      console.error('Place order error:', error);
      toast.error(getErrorMessage(error, 'Đặt hàng thất bại'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-primary">
        Thanh toán đơn hàng
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Address & Payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Address Section */}
          <Card className="rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg">Địa chỉ giao hàng</h2>
              </div>
              <AddressManager
                mode="select"
                selectedId={selectedAddress?.id}
                onSelect={setSelectedAddress}
              />
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card className="rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-5 h-5 text-green-600" />
                <h2 className="font-semibold text-lg">Phương thức thanh toán</h2>
              </div>

              {user?.id && walletBalance > 0 && (
                <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
                  <input
                    type="checkbox"
                    checked={useWalletChecked}
                    onChange={(e) => setUseWalletChecked(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="flex-1">
                    <span className="font-semibold">Sử dụng số dư ví</span>
                    <span className="text-gray-500"> (Khả dụng: {new Intl.NumberFormat('vi-VN').format(walletBalance)}₫{walletDeduction > 0 ? ` · Trừ ${new Intl.NumberFormat('vi-VN').format(walletDeduction)}₫` : ""})</span>
                  </span>
                </label>
              )}

              <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v as "COD" | "VNPAY" | "MOMO" | "BANK_TRANSFER")}>
                <div className="flex items-center space-x-3 p-4 border rounded-xl hover:bg-[#fc4c00]/5 dark:hover:bg-[#fc4c00]/10 hover:border-[#fc4c00]/40 cursor-pointer transition-all duration-200">
                  <RadioGroupItem value="COD" id="cod" />
                  <Label htmlFor="cod" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="font-medium">Thanh toán khi nhận hàng (COD)</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Thanh toán bằng tiền mặt khi nhận hàng</p>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-xl hover:bg-[#fc4c00]/5 dark:hover:bg-[#fc4c00]/10 hover:border-[#fc4c00]/40 cursor-pointer mt-3 transition-all duration-200">
                  <RadioGroupItem value="VNPAY" id="vnpay" />
                  <Label htmlFor="vnpay" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-[#af3200]" />
                      <div>
                        <p className="font-medium">Thanh toán qua VNPAY</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Thanh toán bằng thẻ ATM/Visa/MasterCard</p>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-pink-50 dark:hover:bg-pink-950/50 hover:border-pink-300 dark:hover:border-pink-700 cursor-pointer mt-3 transition-all duration-200">
                  <RadioGroupItem value="MOMO" id="momo" />
                  <Label htmlFor="momo" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-[#A50064] flex items-center justify-center text-white text-[10px] font-bold">Mo</div>
                      <div>
                        <p className="font-medium">Thanh toán qua ví MoMo</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Quét mã QR để thanh toán</p>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-green-50 dark:hover:bg-green-950/50 hover:border-green-300 dark:hover:border-green-700 cursor-pointer mt-3 transition-all duration-200">
                  <RadioGroupItem value="BANK_TRANSFER" id="bank" />
                  <Label htmlFor="bank" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Chuyển khoản ngân hàng</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Chuyển khoản thủ công qua STK</p>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Note */}
          <Card className="rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-md">
            <CardContent className="p-6">
              <Label htmlFor="note" className="text-sm font-medium mb-2 block">Ghi chú đơn hàng (tùy chọn)</Label>
              <Input
                id="note"
                placeholder="Ví dụ: Giao hàng giờ hành chính..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full transition-all duration-200 focus:ring-2 focus:ring-[#fc4c00]"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-1">
          <Card className="rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] sticky top-6 transition-all duration-300 hover:shadow-md">
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4">Tóm tắt đơn hàng</h2>

              {/* Cart items preview */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {cart?.data?.items?.map((item: any) => (
                  <div key={item.id} className="flex gap-3 text-sm">
                    <img
                      src={
                        item.variant?.product?.images?.find((img: any) => img.isPrimary)?.url ||
                        item.variant?.product?.images?.[0]?.url ||
                        "/images/placeholder-product.svg"
                      }
                      alt={item.variant?.product?.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium line-clamp-2">{item.variant?.product?.name}</p>
                      <p className="text-gray-500">x{item.quantity}</p>
                    </div>
                    <p className="font-medium whitespace-nowrap">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(getEffectivePrice(item.variant) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tạm tính ({cart?.data?.items?.length || 0} sản phẩm)</span>
                  <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Thuế VAT (10%)</span>
                  <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(tax)}</span>
                </div>
                {(shippingFee > 0 || feeLoading) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Phí vận chuyển (GHN)</span>
                    <span>{feeLoading ? "Đang tính..." : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(shippingFee)}</span>
                  </div>
                )}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-gray-700">Voucher của bạn</Label>
                    {vouchersLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                  </div>
                  {!user?.id ? (
                    <p className="rounded-xl bg-orange-50 p-3 text-xs text-orange-700">Đăng nhập để xem voucher cá nhân và voucher đổi điểm.</p>
                  ) : !userVouchers.length && !vouchersLoading ? (
                    <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">Bạn chưa có voucher khả dụng.</p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {userVouchers.map((voucher) => {
                        const disabled = !!voucher.minOrderValue && subtotal < voucher.minOrderValue;
                        const selected = selectedVoucherCode === voucher.code;
                        const valueText = voucher.type === "PERCENT" ? `${voucher.value}%` : `${Number(voucher.value).toLocaleString("vi-VN")}₫`;
                        return (
                          <button
                            type="button"
                            key={voucher.id}
                            disabled={disabled}
                            onClick={() => handleSelectVoucherCard(voucher)}
                            className={`w-full rounded-2xl border p-3 text-left transition ${selected ? "border-primary bg-primary/5" : "bg-white"} ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-primary"}`}
                          >
                            <div className="flex gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-primary"><TicketPercent className="h-5 w-5" /></div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="font-semibold line-clamp-1">{voucher.title || voucher.code}</div>
                                  <div className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-primary">{valueText}</div>
                                </div>
                                <div className="mt-1 text-xs text-gray-500">{voucher.type === "FREESHIP" ? "Miễn/giảm phí vận chuyển" : voucher.description || "Voucher cá nhân"}</div>
                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
                                  {voucher.minOrderValue ? <span>Đơn từ {voucher.minOrderValue.toLocaleString("vi-VN")}₫</span> : <span>Không yêu cầu đơn tối thiểu</span>}
                                  {voucher.endDate && <span>HSD {new Date(voucher.endDate).toLocaleDateString("vi-VN")}</span>}
                                </div>
                                {disabled && voucher.minOrderValue && <div className="mt-1 text-xs text-orange-600">Cần mua thêm {(voucher.minOrderValue - subtotal).toLocaleString("vi-VN")}₫</div>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="space-y-2 border-t pt-3">
                    <Label className="text-sm text-gray-700">Hoặc nhập Promo Code</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nhập promo code"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      />
                      <Button type="button" variant="outline" onClick={handleApplyPromoCode}>Áp dụng</Button>
                    </div>
                  </div>
                  {voucherStatus && (
                    <p className="text-xs text-gray-600">{voucherStatus}</p>
                  )}
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Giảm giá</span>
                    <span>-{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(discount)}</span>
                  </div>
                )}
                {walletDeduction > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Trừ ví MegaMart</span>
                    <span>-{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(walletDeduction)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Tổng cộng</span>
                  <span className="text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(total)}</span>
                </div>
                {walletDeduction > 0 && (
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Cần thanh toán thêm</span>
                    <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(payableTotal)}</span>
                  </div>
                )}
              </div>

              <Button
                onClick={handlePlaceOrder}
                disabled={loading || !selectedAddress || feeLoading}
                className="w-full mt-6"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
