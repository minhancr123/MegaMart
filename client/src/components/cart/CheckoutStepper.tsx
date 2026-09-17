"use client";

import { Check, ShoppingBag, Truck, CreditCard } from "lucide-react";
import Link from "next/link";

interface CheckoutStepperProps {
  currentStep: 1 | 2 | 3;
}

export const CheckoutStepper = ({ currentStep }: CheckoutStepperProps) => {
  const steps = [
    { step: 1, title: "Giỏ hàng", icon: ShoppingBag, href: "/cart" },
    { step: 2, title: "Thông tin giao hàng", icon: Truck, href: "/checkout" },
    { step: 3, title: "Thanh toán", icon: CreditCard, href: "/checkout" },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 px-4">
      <div className="flex items-center justify-between relative">
        {/* Connector line behind steps */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-muted -z-0" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-primary transition-all duration-300 -z-0"
          style={{
            width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%",
          }}
        />

        {steps.map((s) => {
          const isCompleted = s.step < currentStep;
          const isActive = s.step === currentStep;
          const Icon = s.icon;

          const StepContent = (
            <div className="flex flex-col items-center relative z-10 group">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border-2 ${
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : isActive
                    ? "bg-primary border-primary text-primary-foreground shadow-md ring-4 ring-primary/20"
                    : "bg-card border-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-xs sm:text-sm font-medium mt-2 whitespace-nowrap ${
                  isActive
                    ? "text-primary font-bold"
                    : isCompleted
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                {s.title}
              </span>
            </div>
          );

          if (isCompleted && s.step === 1) {
            return (
              <Link key={s.step} href={s.href} className="cursor-pointer">
                {StepContent}
              </Link>
            );
          }

          return <div key={s.step}>{StepContent}</div>;
        })}
      </div>
    </div>
  );
};
