"use client";

import AddressManager from "@/components/AddressManager";

export default function AddressesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sổ địa chỉ</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quản lý địa chỉ giao hàng của bạn</p>
      </div>
      <AddressManager mode="manage" />
    </div>
  );
}
