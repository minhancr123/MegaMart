"use client";
import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Eye, EyeOff, Zap, Clock, CheckCircle, Package } from "lucide-react";
import { flashSaleApi, FlashSale, CreateFlashSaleDto } from "@/lib/marketingApi";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function FlashSalesPage() {
  const router = useRouter();
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFlashSale, setEditingFlashSale] = useState<FlashSale | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formData, setFormData] = useState<CreateFlashSaleDto>({
    name: "",
    description: "",
    startTime: "",
    endTime: "",
    active: true,
  });

  const fetchFlashSales = async () => {
    try {
      setLoading(true);
      const response = await flashSaleApi.getAll(statusFilter as 'active' | 'upcoming' | 'ended' | 'all');
      setFlashSales(response.data || []);
    } catch (error) {
      toast.error("Không thể tải danh sách Flash Sale");
      setFlashSales([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashSales();
  }, [statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
      };
      
      if (editingFlashSale) {
        await flashSaleApi.update(editingFlashSale.id, submitData);
        toast.success("Cập nhật Flash Sale thành công");
      } else {
        await flashSaleApi.create(submitData);
        toast.success("Tạo Flash Sale thành công");
      }
      setDialogOpen(false);
      resetForm();
      fetchFlashSales();
    } catch (error) {
      toast.error(editingFlashSale ? "Không thể cập nhật Flash Sale" : "Không thể tạo Flash Sale");
    }
  };

  const handleEdit = (flashSale: FlashSale) => {
    setEditingFlashSale(flashSale);
    setFormData({
      name: flashSale.name,
      description: flashSale.description || "",
      startTime: flashSale.startTime.slice(0, 16),
      endTime: flashSale.endTime.slice(0, 16),
      active: flashSale.active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa Flash Sale này?")) return;
    try {
      await flashSaleApi.delete(id);
      toast.success("Xóa Flash Sale thành công");
      fetchFlashSales();
    } catch (error) {
      toast.error("Không thể xóa Flash Sale");
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await flashSaleApi.toggleActive(id);
      fetchFlashSales();
    } catch (error) {
      toast.error("Không thể thay đổi trạng thái");
    }
  };

  const resetForm = () => {
    setEditingFlashSale(null);
    setFormData({
      name: "",
      description: "",
      startTime: "",
      endTime: "",
      active: true,
    });
  };

  const getStatusBadge = (flashSale: FlashSale) => {
    const now = new Date();
    const start = new Date(flashSale.startTime);
    const end = new Date(flashSale.endTime);

    if (!flashSale.active) {
      return <Badge variant="secondary">Tắt</Badge>;
    }
    if (now < start) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">
        <Clock className="w-3 h-3 mr-1" /> Sắp diễn ra
      </Badge>;
    }
    if (now > end) {
      return <Badge variant="secondary">
        <CheckCircle className="w-3 h-3 mr-1" /> Đã kết thúc
      </Badge>;
    }
    return <Badge className="bg-red-500">
      <Zap className="w-3 h-3 mr-1" /> Đang diễn ra
    </Badge>;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Flash Sale</h1>
          <p className="text-gray-500 mt-1">Tạo và quản lý các chương trình Flash Sale</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-red-500 hover:bg-red-600">
              <Zap className="w-4 h-4" />
              Tạo Flash Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingFlashSale ? "Chỉnh sửa Flash Sale" : "Tạo Flash Sale mới"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên chương trình *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Flash Sale Cuối Tuần"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn về chương trình..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Thời gian bắt đầu *</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Thời gian kết thúc *</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Kích hoạt ngay</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" className="bg-red-500 hover:bg-red-600">
                  {editingFlashSale ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Danh sách Flash Sale</CardTitle>
              <CardDescription>Quản lý tất cả chương trình khuyến mãi</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Lọc theo trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Đang diễn ra</SelectItem>
                <SelectItem value="upcoming">Sắp diễn ra</SelectItem>
                <SelectItem value="ended">Đã kết thúc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : flashSales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có Flash Sale nào. Hãy tạo chương trình đầu tiên!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên chương trình</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flashSales.map((flashSale) => (
                  <TableRow key={flashSale.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{flashSale.name}</p>
                        {flashSale.description && (
                          <p className="text-sm text-gray-500 truncate max-w-[250px]">
                            {flashSale.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>Từ: {formatDateTime(flashSale.startTime)}</p>
                        <p>Đến: {formatDateTime(flashSale.endTime)}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(flashSale)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {flashSale.items?.length || 0} sản phẩm
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/admin/flash-sales/${flashSale.id}`)}
                          title="Quản lý sản phẩm"
                        >
                          <Package className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(flashSale.id)}
                          title={flashSale.active ? "Tắt" : "Bật"}
                        >
                          {flashSale.active ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(flashSale)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(flashSale.id)}
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
