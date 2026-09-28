"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import Link from "next/link";
import { Plus, Pencil, Trash2, Eye, Warehouse as WarehouseIcon, Loader2 } from "lucide-react";
import { inventoryApi, Warehouse, CreateWarehouseDto } from "@/lib/inventoryApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState<CreateWarehouseDto>({
    name: "",
    code: "",
    address: "",
    phone: "",
    isActive: true,
  });

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getWarehouses(true);
      setWarehouses(response.data || []);
    } catch {
      toast.error("Không thể tải danh sách kho");
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (editingWarehouse) {
        const { code, ...updatePayload } = formData;
        await inventoryApi.updateWarehouse(editingWarehouse.id, updatePayload);
        toast.success("Cập nhật kho thành công");
      } else {
        await inventoryApi.createWarehouse(formData);
        toast.success("Tạo kho thành công");
      }
      setDialogOpen(false);
      resetForm();
      fetchWarehouses();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Có lỗi xảy ra"));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address || "",
      phone: warehouse.phone || "",
      isActive: warehouse.isActive,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await inventoryApi.deleteWarehouse(id);
      toast.success("Đã tạm ngưng kho");
      setConfirmDeleteId(null);
      fetchWarehouses();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể xóa kho"));
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setEditingWarehouse(null);
    setFormData({
      name: "",
      code: "",
      address: "",
      phone: "",
      isActive: true,
    });
  };

  return (
    <div className="space-y-6">
      <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (saving && !open) return;
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <AdminPageHeader
            title="Quản lý Kho hàng"
            description="Quản lý các chi nhánh kho trong hệ thống"
            actions={
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Thêm Kho mới
                </Button>
              </DialogTrigger>
            }
          />
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingWarehouse ? "Chỉnh sửa Kho" : "Thêm Kho mới"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tên kho *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Kho Quận 7"
                    required
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Mã kho *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="VD: KHO-Q7"
                    required
                    disabled={!!editingWarehouse || saving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Địa chỉ đầy đủ của kho"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0901234567"
                  disabled={saving}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Đang hoạt động</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Hủy
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {saving ? "Đang lưu..." : editingWarehouse ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
            </form>
          </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WarehouseIcon className="w-5 h-5" />
            Danh sách Kho
          </CardTitle>
          <CardDescription>Tất cả kho hàng trong hệ thống</CardDescription>
        </CardHeader>
        <CardContent>
          {(!loading && warehouses.length > 0) ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã kho</TableHead>
                  <TableHead>Tên kho</TableHead>
                  <TableHead>Địa chỉ</TableHead>
                  <TableHead>Điện thoại</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {warehouse.code}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/inventory/warehouses/${warehouse.id}`}
                        className="text-primary hover:underline"
                      >
                        {warehouse.name}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {warehouse.address || "-"}
                    </TableCell>
                    <TableCell>{warehouse.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {warehouse._count?.inventories || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={warehouse.isActive ? "default" : "secondary"}>
                        {warehouse.isActive ? "Hoạt động" : "Tạm ngưng"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/inventory/warehouses/${warehouse.id}`}>
                          <Button variant="ghost" size="icon" title="Xem chi tiết kho">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(warehouse)}
                          disabled={!!deletingId}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary hover:text-red-700"
                          onClick={() => setConfirmDeleteId(warehouse.id)}
                          disabled={!!deletingId}
                        >
                          {deletingId === warehouse.id ? (
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
                  <TableHead>Mã kho</TableHead>
                  <TableHead>Tên kho</TableHead>
                  <TableHead>Địa chỉ</TableHead>
                  <TableHead>Điện thoại</TableHead>
                  <TableHead>Sản phẩm</TableHead>
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
                        icon={WarehouseIcon}
                        title="Chưa có kho nào"
                        description="Hãy tạo kho đầu tiên để bắt đầu quản lý tồn kho."
                        action={
                          <Button
                            onClick={() => setDialogOpen(true)}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Thêm kho mới
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
        title="Tạm ngưng kho hàng"
        description="Bạn có chắc chắn muốn tạm ngưng kho này?"
        confirmText="Tạm ngưng"
        variant="destructive"
        isLoading={deletingId !== null}
      />
    </div>
  );
}
