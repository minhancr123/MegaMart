"use client";

import AddressManager from "@/components/AddressManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AddressesPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Quản lý địa chỉ</CardTitle>
        </CardHeader>
        <CardContent>
          <AddressManager mode="manage" />
        </CardContent>
      </Card>
    </div>
  );
}
