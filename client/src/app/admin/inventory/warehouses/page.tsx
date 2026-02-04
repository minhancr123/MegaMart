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
import { Plus, Pencil, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
import { inventoryApi, Warehouse, CreateWarehouseDto } from "@/lib/inventoryApi";
import { toast } from "sonner";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
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
    try {
      if (editingWarehouse) {
        await inventoryApi.updateWarehouse(editingWarehouse.id, formData);
        toast.success("Cập nhật kho thành công");
      } else {
        await inventoryApi.createWarehouse(formData);
        toast.success("Tạo kho thành công");
      }
      setDialogOpen(false);
      resetForm();
      fetchWarehouses();
    } catch (error: unknown) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
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
    if (!confirm("Bạn có chắc chắn muốn tạm ngưng kho này?")) return;
    try {
      await inventoryApi.deleteWarehouse(id);
      toast.success("Đã tạm ngưng kho");
      fetchWarehouses();
    } catch {
      toast.error("Không thể xóa kho");
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Kho hàng</h1>
          <p className="text-gray-500 mt-1">Quản lý các chi nhánh kho trong hệ thống</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Thêm Kho mới
            </Button>
          </DialogTrigger>
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
                    disabled={!!editingWarehouse}
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0901234567"
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
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit">
                  {editingWarehouse ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WarehouseIcon className="w-5 h-5" />
            Danh sách Kho
          </CardTitle>
          <CardDescription>Tất cả kho hàng trong hệ thống</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : warehouses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có kho nào. Hãy tạo kho đầu tiên!
            </div>
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
                {warehouses.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell>
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                        {warehouse.code}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{warehouse.name}</TableCell>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(warehouse)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(warehouse.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
