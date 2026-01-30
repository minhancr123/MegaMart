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
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import { bannerApi, Banner, CreateBannerDto } from "@/lib/marketingApi";
import { toast } from "sonner";

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState<CreateBannerDto>({
    title: "",
    description: "",
    imageUrl: "",
    linkUrl: "",
    active: true,
  });

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await bannerApi.getAll(true);
      console.log('Banner response:', response);
      console.log('Banner data:', response.data);
      console.log('Is response array?', Array.isArray(response));
      console.log('Is response.data array?', Array.isArray(response.data));
      
      // Handle both cases: response is array OR response.data is array
      const bannersData = Array.isArray(response) ? response : (response.data || []);
      console.log('Final banners:', bannersData);
      setBanners(bannersData);
    } catch (error) {
      console.error('Banner fetch error:', error);
      toast.error("Không thể tải danh sách banner");
      setBanners([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        await bannerApi.update(editingBanner.id, formData);
        toast.success("Cập nhật banner thành công");
      } else {
        await bannerApi.create(formData);
        toast.success("Tạo banner thành công");
      }
      setDialogOpen(false);
      resetForm();
      fetchBanners();
    } catch (error) {
      toast.error(editingBanner ? "Không thể cập nhật banner" : "Không thể tạo banner");
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description || "",
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || "",
      active: banner.active,
      startDate: banner.startDate,
      endDate: banner.endDate,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa banner này?")) return;
    try {
      await bannerApi.delete(id);
      toast.success("Xóa banner thành công");
      fetchBanners();
    } catch (error) {
      toast.error("Không thể xóa banner");
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await bannerApi.toggleActive(id);
      fetchBanners();
    } catch (error) {
      toast.error("Không thể thay đổi trạng thái");
    }
  };

  const resetForm = () => {
    setEditingBanner(null);
    setFormData({
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      active: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Banners</h1>
          <p className="text-gray-500 mt-1">Quản lý các banner quảng cáo trên trang chủ</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Thêm Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? "Chỉnh sửa Banner" : "Thêm Banner mới"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tiêu đề *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nhập tiêu đề banner"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn về banner"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL Hình ảnh *</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkUrl">URL Liên kết</Label>
                <Input
                  id="linkUrl"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="/products?category=phone"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Ngày bắt đầu</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate?.slice(0, 16) || ""}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Ngày kết thúc</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate?.slice(0, 16) || ""}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Kích hoạt</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit">
                  {editingBanner ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách Banners</CardTitle>
          <CardDescription>Kéo thả để sắp xếp thứ tự hiển thị</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có banner nào. Hãy tạo banner đầu tiên!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Hình ảnh</TableHead>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Liên kết</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                    </TableCell>
                    <TableCell>
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        className="w-24 h-12 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{banner.title}</p>
                        {banner.description && (
                          <p className="text-sm text-gray-500 truncate max-w-[200px]">
                            {banner.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500 truncate max-w-[150px] block">
                        {banner.linkUrl || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={banner.active ? "default" : "secondary"}>
                        {banner.active ? "Hiển thị" : "Ẩn"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {banner.startDate && (
                          <p>Từ: {new Date(banner.startDate).toLocaleDateString("vi-VN")}</p>
                        )}
                        {banner.endDate && (
                          <p>Đến: {new Date(banner.endDate).toLocaleDateString("vi-VN")}</p>
                        )}
                        {!banner.startDate && !banner.endDate && "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(banner.id)}
                          title={banner.active ? "Ẩn" : "Hiển thị"}
                        >
                          {banner.active ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(banner)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(banner.id)}
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
