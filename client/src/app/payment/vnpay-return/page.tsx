"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import axiosClient from "@/lib/axiosClient";

function VNPayReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [orderCode, setOrderCode] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get all query params from URL
        const params: any = {};
        searchParams.forEach((value, key) => {
          params[key] = value;
        });

        // Send to backend to verify
        const response = await axiosClient.get("/payment/vnpay-return", { params });

        const data = response?.data || response;

        if (data?.success) {
          setStatus("success");
          setOrderCode(data?.orderCode || "");
          setMessage(data?.message || "Thanh toán thành công!");
        } else {
          setStatus("failed");
          setOrderCode(data?.orderCode || "");
          setMessage(data?.message || "Thanh toán thất bại!");
        }
      } catch (error: any) {
        console.error("VNPay callback error:", error);
        setStatus("failed");
        setMessage("Có lỗi xảy ra khi xử lý thanh toán");
      }
    };

    if (searchParams.toString()) {
      handleCallback();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full shadow-2xl">
        <CardContent className="p-8">
          {status === "loading" && (
            <div className="text-center space-y-4">
              <Loader2 className="w-16 h-16 mx-auto text-blue-600 animate-spin" />
              <h2 className="text-xl font-semibold">Đang xử lý thanh toán...</h2>
              <p className="text-gray-600">Vui lòng chờ trong giây lát</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-600">Thanh toán thành công!</h2>
              <p className="text-gray-600">{message}</p>
              {orderCode && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Mã đơn hàng</p>
                  <p className="font-mono font-semibold text-lg">{orderCode}</p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => router.push("/profile/orders")}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Xem đơn hàng
                </Button>
                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="flex-1"
                >
                  Trang chủ
                </Button>
              </div>
            </div>
          )}

          {status === "failed" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-red-600">Thanh toán thất bại!</h2>
              <p className="text-gray-600">{message}</p>
              {orderCode && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Mã đơn hàng</p>
                  <p className="font-mono font-semibold text-lg">{orderCode}</p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => router.push("/checkout")}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Thử lại
                </Button>
                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="flex-1"
                >
                  Trang chủ
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VNPayReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
      </div>
    }>
      <VNPayReturnContent />
    </Suspense>
  );
}
