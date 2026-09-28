"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { Plus, Pencil, Trash2, Truck, MapPin, Navigation, Loader2 } from "lucide-react";
import { inventoryApi, Supplier, CreateSupplierDto } from "@/lib/inventoryApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<CreateSupplierDto & { isActive?: boolean }>({
    name: "",
    code: "",
    email: "",
    phone: "",
    address: "",
    province: "",
    district: "",
    ward: "",
    lat: null,
    lng: null,
    taxCode: "",
    contactName: "",
    notes: "",
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getSuppliers(true);
      setSuppliers(response.data || []);
    } catch {
      toast.error("Không thể tải danh sách nhà cung cấp");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingSupplier) {
        const { code, ...updatePayload } = formData;
        await inventoryApi.updateSupplier(editingSupplier.id, updatePayload);
        toast.success("Cập nhật nhà cung cấp thành công");
      } else {
        const { isActive, ...createPayload } = formData;
        await inventoryApi.createSupplier(createPayload);
        toast.success("Tạo nhà cung cấp thành công");
      }
      setDialogOpen(false);
      resetForm();
      fetchSuppliers();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Có lỗi xảy ra"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      code: supplier.code,
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      province: supplier.province || "",
      district: supplier.district || "",
      ward: supplier.ward || "",
      lat: supplier.lat ?? null,
      lng: supplier.lng ?? null,
      taxCode: supplier.taxCode || "",
      contactName: supplier.contactName || "",
      notes: supplier.notes || "",
      isActive: supplier.isActive,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await inventoryApi.deleteSupplier(id);
      toast.success("Đã tạm ngưng nhà cung cấp");
      setConfirmDeleteId(null);
      fetchSuppliers();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể xóa nhà cung cấp"));
    } finally {
      setDeletingId(null);
    }
  };

  const handlePlaceSelect = useCallback((place: {
    formattedAddress: string;
    streetAddress: string;
    province: string;
    district: string;
    ward: string;
    lat: number;
    lng: number;
  }) => {
    setFormData((prev) => ({
      ...prev,
      address: place.formattedAddress || place.streetAddress || prev.address,
      province: place.province || prev.province,
      district: place.district || prev.district,
      ward: place.ward || prev.ward,
      lat: place.lat,
      lng: place.lng,
    }));
  }, []);

  const resetForm = () => {
    setEditingSupplier(null);
    setFormData({
      name: "",
      code: "",
      email: "",
      phone: "",
      address: "",
      province: "",
      district: "",
      ward: "",
      lat: null,
      lng: null,
      taxCode: "",
      contactName: "",
      notes: "",
    });
  };

  return (
    <div className="space-y-6">
      <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (submitting && !open) return;
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <AdminPageHeader
            title="Nhà cung cấp"
            description="Quản lý danh sách nhà cung cấp hàng hóa"
            actions={
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Thêm Nhà cung cấp
                </Button>
              </DialogTrigger>
            }
          />
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? "Chỉnh sửa Nhà cung cấp" : "Thêm Nhà cung cấp mới"}
              </DialogTitle>
              <DialogDescription>
                Nhập thông tin chi tiết của nhà cung cấp để quản lý nguồn hàng.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tên nhà cung cấp *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Công ty ABC"
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Mã nhà cung cấp *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="VD: NCC-001"
                    required
                    disabled={!!editingSupplier || submitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@company.com"
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0901234567"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tìm địa chỉ chính xác trên Google Maps</Label>
                <GooglePlacesAutocomplete onPlaceSelect={handlePlaceSelect} />
                {formData.lat != null && formData.lng != null && Number.isFinite(Number(formData.lat)) && Number.isFinite(Number(formData.lng)) && Number(formData.lat) !== 0 && Number(formData.lng) !== 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Đã ghim tọa độ: {Number(formData.lat).toFixed(6)}, {Number(formData.lng).toFixed(6)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setFormData((prev) => ({ ...prev, lat: null, lng: null }))}
                      disabled={submitting}
                    >
                      Xóa ghim
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Địa chỉ công ty"
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="province">Tỉnh/TP</Label>
                  <Input id="province" value={formData.province || ""} onChange={(e) => setFormData({ ...formData, province: e.target.value })} disabled={submitting} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">Quận/Huyện</Label>
                  <Input id="district" value={formData.district || ""} onChange={(e) => setFormData({ ...formData, district: e.target.value })} disabled={submitting} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ward">Phường/Xã</Label>
                  <Input id="ward" value={formData.ward || ""} onChange={(e) => setFormData({ ...formData, ward: e.target.value })} disabled={submitting} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxCode">Mã số thuế</Label>
                  <Input
                    id="taxCode"
                    value={formData.taxCode}
                    onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                    placeholder="0123456789"
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName">Người liên hệ</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Ghi chú</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Thông tin bổ sung..."
                  rows={2}
                  disabled={submitting}
                />
              </div>

              {editingSupplier && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    disabled={submitting}
                  />
                  <Label htmlFor="isActive">Đang hoạt động</Label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                  Hủy
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitting ? "Đang lưu..." : editingSupplier ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
            </form>
          </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Danh sách Nhà cung cấp
          </CardTitle>
          <CardDescription>Tất cả nhà cung cấp trong hệ thống</CardDescription>
        </CardHeader>
        <CardContent>
          {(!loading && suppliers.length > 0) ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã NCC</TableHead>
                  <TableHead>Tên nhà cung cấp</TableHead>
                  <TableHead>Liên hệ</TableHead>
                  <TableHead>Điện thoại</TableHead>
                  <TableHead>Đơn nhập</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {supplier.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium dark:text-white">{supplier.name}</p>
                        {supplier.address && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {supplier.address}
                          </p>
                        )}
                        {supplier.lat != null && supplier.lng != null && Number.isFinite(Number(supplier.lat)) && Number.isFinite(Number(supplier.lng)) && Number(supplier.lat) !== 0 && Number(supplier.lng) !== 0 ? (
                          <button
                            type="button"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            onClick={() => window.open(`https://www.google.com/maps?q=${supplier.lat},${supplier.lng}`, "_blank")}
                          >
                            <MapPin className="h-3 w-3" /> Xem bản đồ
                          </button>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Chưa ghim vị trí Maps — bấm sửa để ghim
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="dark:text-white">{supplier.contactName || "-"}</p>
                        <p className="text-muted-foreground">{supplier.email || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell className="dark:text-gray-300">{supplier.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {supplier._count?.stockMovements || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={supplier.isActive ? "default" : "secondary"}>
                        {supplier.isActive ? "Hoạt động" : "Tạm ngưng"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(supplier)}
                          disabled={!!deletingId}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary hover:text-red-700"
                          onClick={() => setConfirmDeleteId(supplier.id)}
                          disabled={!!deletingId}
                        >
                          {deletingId === supplier.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã NCC</TableHead>
                  <TableHead>Tên nhà cung cấp</TableHead>
                  <TableHead>Liên hệ</TableHead>
                  <TableHead>Điện thoại</TableHead>
                  <TableHead>Đơn nhập</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <AdminTableSkeleton columns={7} rows={5} />
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <AdminEmptyState
                        icon={Truck}
                        title="Chưa có nhà cung cấp nào"
                        description="Hãy thêm nhà cung cấp đầu tiên để bắt đầu tạo đơn đặt hàng."
                        action={
                          <Button
                            onClick={() => {
                              resetForm();
                              setDialogOpen(true);
                            }}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Thêm nhà cung cấp
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => !open && !deletingId && setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        title="Tạm ngưng nhà cung cấp"
        description="Bạn có chắc chắn muốn tạm ngưng nhà cung cấp này?"
        confirmText="Tạm ngưng"
        variant="destructive"
        isLoading={deletingId !== null}
      />
    </div>
  );
}
