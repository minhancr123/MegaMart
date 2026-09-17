"use client";

import { Check, Clock, Package, Truck, CheckCircle2 } from "lucide-react";

interface OrderTrackingStepperProps {
  status: string;
  createdAt: string;
}

export const OrderTrackingStepper = ({
  status,
  createdAt,
}: OrderTrackingStepperProps) => {
  // Định nghĩa 5 bước chuẩn Stitch
  // 1: Đã đặt
  // 2: Đã xác nhận
  // 3: Đã đóng gói (Processing)
  // 4: Đang giao (Shipping)
  // 5: Giao thành công (Delivered / Completed)

  const getStepIndex = (st: string) => {
    switch (st) {
      case "PENDING":
        return 1;
      case "CONFIRMED":
        return 2;
      case "PROCESSING":
        return 3;
      case "SHIPPING":
        return 4;
      case "DELIVERED":
      case "COMPLETED":
      case "REFUNDED":
        return 5;
      case "PAID":
        // Đã thanh toán nhưng chưa giao: đứng ở bước 2 (shop đã nhận tiền, chuẩn bị hàng),
        // KHÔNG phải bước 5 "Giao thành công"
        return 2;
      case "CANCELED":
      case "FAILED":
        return 0; // Trạng thái hủy
      default:
        return 1;
    }
  };

  const currentStep = getStepIndex(status);

  const orderDate = new Date(createdAt);
  const formattedDate = !isNaN(orderDate.getTime())
    ? `${orderDate.getDate().toString().padStart(2, "0")}/${(orderDate.getMonth() + 1).toString().padStart(2, "0")}`
    : "08/09";

  const steps = [
    { id: 1, title: "Đã đặt", date: formattedDate, icon: Clock },
    { id: 2, title: "Đã xác nhận", date: formattedDate, icon: Check },
    { id: 3, title: "Đã đóng gói", date: formattedDate, icon: Package },
    { id: 4, title: "Đang giao", date: "Dự kiến 1-2 ngày", icon: Truck },
    { id: 5, title: status === "REFUNDED" ? "Đã hoàn tiền" : "Giao thành công", date: "", icon: CheckCircle2 },
  ];

  if (currentStep === 0) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center text-destructive font-medium text-sm">
        Đơn hàng này đã bị hủy hoặc giao dịch thất bại.
      </div>
    );
  }

  return (
    <div className="w-full bg-card border border-border rounded-2xl p-5 sm:p-7 shadow-sm">
      <div className="relative flex items-center justify-between">
        {/* Connector Line Background */}
        <div className="absolute left-0 top-5 -translate-y-1/2 w-full h-1 bg-muted -z-0" />
        
        {/* Active Line Progress */}
        <div
          className="absolute left-0 top-5 -translate-y-1/2 h-1 bg-primary transition-all duration-500 -z-0"
          style={{
            width: `${Math.min(100, Math.max(0, ((currentStep - 1) / 4) * 100))}%`,
          }}
        />

        {steps.map((s) => {
          const isCompleted = currentStep > s.id;
          const isCurrent = currentStep === s.id;
          const Icon = s.icon;

          return (
            <div
              key={s.id}
              className="flex flex-col items-center relative z-10 text-center min-w-[50px] sm:min-w-[80px]"
            >
              {/* Step Circle Icon */}
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 border-2 ${
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : isCurrent
                    ? "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 shadow-md scale-110"
                    : "bg-card border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                ) : (
                  <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                )}
              </div>

              {/* Title & Date */}
              <span
                className={`text-xs sm:text-sm font-semibold mt-2.5 line-clamp-1 ${
                  isCurrent
                    ? "text-primary font-bold"
                    : isCompleted
                    ? "text-foreground font-medium"
                    : "text-muted-foreground font-normal"
                }`}
              >
                {s.title}
              </span>

              {s.date && (
                <span className="text-[11px] text-muted-foreground font-normal mt-0.5">
                  {s.date}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
