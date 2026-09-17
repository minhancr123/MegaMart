"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Search,
  Eye,
  CalendarDays,
  MapPin,
  TrendingUp,
  CloudUpload,
  Ban,
  Clock3,
  MousePointerClick,
  Loader2,
  ImagePlus,
} from "lucide-react";
import {
  bannerApi,
  Banner,
  CreateBannerDto,
  BannerDisplayStatus,
} from "@/lib/marketingApi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const POSITION_LABELS: Record<string, string> = {
  HOME_SLIDER: "Slider Trang chủ",
  CATEGORY: "Banner Danh mục",
  POPUP: "Popup",
};

const TEMPLATE_LABELS: Record<string, string> = {
  STATIC: "Gốc (giống ban đầu)",
  AUTO: "Tự động suy ra",
  TEMPLATE_1: "Mẫu 1 - Đếm ngược Flash Sale",
  TEMPLATE_2: "Mẫu 2 - Thẻ sản phẩm nổi",
  TEMPLATE_3: "Mẫu 3 - Spotlight",
};

/** Phân loại trạng thái hiển thị (khớp logic server getStats). */
export function getBannerStatus(b: Banner, now = new Date()): BannerDisplayStatus {
  const start = b.startDate ? new Date(b.startDate) : null;
  const end = b.endDate ? new Date(b.endDate) : null;
  if (end && end < now) return "expired";
  if (!b.active) return "paused";
  if (start && start > now) return "scheduled";
  return "active";
}

const STATUS_META: Record<BannerDisplayStatus, { label: string; variant: "success" | "warning" | "secondary" | "outline" }> = {
  active: { label: "Đang hiển thị", variant: "success" },
  scheduled: { label: "Đã lên lịch", variant: "warning" },
  expired: { label: "Hết hạn", variant: "secondary" },
  paused: { label: "Tạm dừng", variant: "outline" },
};

function ctrOf(b: Banner): string {
  const imp = b.impressions || 0;
  if (imp <= 0) return "0%";
  return `${(((b.clicks || 0) / imp) * 100).toFixed(1)}%`;
}

const fmtNum = (n?: number | null) =>
  new Intl.NumberFormat("vi-VN").format(n || 0);

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ active: number; scheduled: number; expired: number; totalClicks: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Bộ lọc
  const [tab, setTab] = useState<"ALL" | "HOME_SLIDER" | "CATEGORY" | "POPUP">("ALL");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | BannerDisplayStatus>("ALL");
  const isFiltering = tab !== "ALL" || search.trim() !== "" || statusFilter !== "ALL";

  const [formData, setFormData] = useState<CreateBannerDto>({
    title: "",
    description: "",
    imageUrl: "",
    linkUrl: "",
    active: true,
    position: "HOME_SLIDER",
    template: "AUTO",
    ctaText: "",
    badgeText: "",
    featuredProductIds: [],
  });
  const [featuredIdsText, setFeaturedIdsText] = useState("");

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        bannerApi.getAll(true),
        bannerApi.getStats().catch(() => null),
      ]);
      const list = Array.isArray(listRes) ? listRes : ((listRes as any)?.data || []);
      setBanners(list);
      if (statsRes) setStats(statsRes);
    } catch (error) {
      console.error("Banner fetch error:", error);
      toast.error("Không thể tải danh sách banner");
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return banners.filter((b) => {
      if (tab !== "ALL" && (b.position || "HOME_SLIDER") !== tab) return false;
      if (statusFilter !== "ALL" && getBannerStatus(b) !== statusFilter) return false;
      if (q && !`${b.title} ${b.description || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [banners, tab, search, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: CreateBannerDto = {
        ...formData,
        featuredProductIds: featuredIdsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (editingBanner) {
        await bannerApi.update(editingBanner.id, payload);
        toast.success("Cập nhật banner thành công");
      } else {
        await bannerApi.create(payload);
        toast.success("Tạo banner thành công");
      }
      setDialogOpen(false);
      resetForm();
      fetchAll();
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
      position: banner.position || "HOME_SLIDER",
      template: banner.template || "AUTO",
      ctaText: banner.ctaText || "",
      badgeText: banner.badgeText || "",
      featuredProductIds: banner.featuredProductIds || [],
      impressions: banner.impressions,
      clicks: banner.clicks,
    });
    setFeaturedIdsText((banner.featuredProductIds || []).join(", "));
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await bannerApi.delete(id);
      toast.success("Xóa banner thành công");
      fetchAll();
    } catch (error) {
      toast.error("Không thể xóa banner");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await bannerApi.toggleActive(id);
      fetchAll();
    } catch (error) {
      toast.error("Không thể thay đổi trạng thái");
    }
  };

  const persistOrder = async (ordered: Banner[]) => {
    setBanners(ordered);
    try {
      await bannerApi.reorder(ordered.map((b) => b.id));
    } catch (error) {
      toast.error("Không thể lưu thứ tự");
      fetchAll();
    }
  };

  const resetForm = () => {
    setEditingBanner(null);
    setFeaturedIdsText("");
    setFormData({
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      active: true,
      position: "HOME_SLIDER",
      template: "AUTO",
      ctaText: "",
      badgeText: "",
      featuredProductIds: [],
    });
  };

  /** Upload nhanh qua Cloudinary unsigned preset (nếu đã cấu hình). */
  const quickUpload = async (file: File) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !preset) {
      toast.error("Chưa cấu hình Cloudinary upload (NEXT_PUBLIC_CLOUDINARY_*)");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", preset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data?.secure_url) throw new Error("Upload thất bại");
      setFormData((f) => ({ ...f, imageUrl: data.secure_url }));
      setEditingBanner(null);
      setDialogOpen(true);
      toast.success("Upload xong, kiểm tra lại rồi bấm Tạo mới");
    } catch (error) {
      toast.error("Upload ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  const kpis = useMemo(() => {
    if (stats) return stats;
    const now = new Date();
    return {
      active: banners.filter((b) => getBannerStatus(b, now) === "active").length,
      scheduled: banners.filter((b) => getBannerStatus(b, now) === "scheduled").length,
      expired: banners.filter((b) => getBannerStatus(b, now) === "expired").length,
      totalClicks: banners.reduce((s, b) => s + (b.clicks || 0), 0),
    };
  }, [stats, banners]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý Banner"
        description={`${banners.length} banner hiện có`}
        actions={
          <Button className="gap-2" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="w-4 h-4" />
            Thêm banner
          </Button>
        }
      />

      {/* 4 thẻ KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Đang hiển thị", value: fmtNum(kpis.active), icon: Eye, tone: "text-[var(--success)]" },
          { label: "Đã lên lịch", value: fmtNum(kpis.scheduled), icon: Clock3, tone: "text-[var(--warning)]" },
          { label: "Hết hạn", value: fmtNum(kpis.expired), icon: Ban, tone: "text-muted-foreground" },
          { label: "Tổng lượt nhấp", value: fmtNum(kpis.totalClicks), icon: MousePointerClick, tone: "text-primary" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{k.value}</p>
              </div>
              <k.icon className={cn("h-6 w-6", k.tone)} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs vị trí */}
      <div className="flex gap-2 border-b border-border">
        {(
          [
            ["ALL", "Trang chủ"],
            ["HOME_SLIDER", "Slider Trang chủ"],
            ["CATEGORY", "Banner Danh mục"],
            ["POPUP", "Popup"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer",
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {id === "ALL" ? "Tất cả vị trí" : label}
          </button>
        ))}
      </div>

      {/* Toolbar search + filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hoặc mô tả chiến dịch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Đang hiển thị</SelectItem>
            <SelectItem value="scheduled">Đã lên lịch</SelectItem>
            <SelectItem value="expired">Hết hạn</SelectItem>
            <SelectItem value="paused">Tạm dừng</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Danh sách banner */}
      <Card className="gap-0 overflow-hidden py-0">
        {loading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            icon={ImagePlus}
            title="Không có banner nào"
            description="Thử đổi bộ lọc hoặc tạo banner mới."
          />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((banner) => {
              const st = getBannerStatus(banner);
              return (
                <div
                  key={banner.id}
                  draggable={!isFiltering}
                  onDragStart={() => {
                    if (isFiltering) {
                      toast.error("Tắt bộ lọc để sắp xếp thứ tự");
                      return;
                    }
                    setDragId(banner.id);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (!dragId || dragId === banner.id) return;
                    // Hoán đổi trên mảng gốc để không mất banner đang bị lọc ẩn
                    const list = [...banners];
                    const from = list.findIndex((b) => b.id === dragId);
                    const to = list.findIndex((b) => b.id === banner.id);
                    if (from < 0 || to < 0) return;
                    const [moved] = list.splice(from, 1);
                    list.splice(to, 0, moved);
                    setDragId(null);
                    persistOrder(list);
                  }}
                  className={cn(
                    "flex flex-col gap-4 p-4 transition-colors sm:flex-row sm:items-center",
                    dragId === banner.id && "opacity-50",
                  )}
                >
                  <GripVertical className="hidden h-5 w-5 shrink-0 cursor-grab text-muted-foreground sm:block" />

                  {/* Thumbnail + badge kích thước */}
                  <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                    {banner.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={banner.imageUrl} alt={banner.title} className="h-full w-full object-cover" />
                    ) : null}
                  </div>

                  {/* Thông tin */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{banner.title}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {POSITION_LABELS[banner.position || "HOME_SLIDER"] || banner.position}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {banner.startDate || banner.endDate
                        ? `${fmtDate(banner.startDate)} - ${fmtDate(banner.endDate)}`
                        : "Chạy vô thời hạn"}
                    </p>
                  </div>

                  {/* Hiệu suất */}
                  <div className="shrink-0 text-xs text-muted-foreground sm:w-40">
                    <p>
                      Impressions: <span className="font-semibold text-foreground">{fmtNum(banner.impressions)} views</span>
                    </p>
                    <p className="mt-1 flex items-center gap-1">
                      CTR: <span className="font-semibold text-foreground">{ctrOf(banner)}</span>
                      <TrendingUp className="h-3.5 w-3.5 text-[var(--success)]" />
                    </p>
                  </div>

                  {/* Trạng thái + toggle */}
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={STATUS_META[st].variant}>{STATUS_META[st].label}</Badge>
                    <Switch
                      checked={banner.active}
                      onCheckedChange={() => handleToggleActive(banner.id)}
                      aria-label="Bật/tắt banner"
                    />
                  </div>

                  {/* Thao tác */}
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(banner)} aria-label="Sửa banner">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(banner.id)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Xóa banner"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Quick upload zone */}
      <Card
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) quickUpload(file);
        }}
        className={cn(
          "border-dashed p-8 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border",
        )}
      >
        <CloudUpload className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 font-semibold text-foreground">
          {uploading ? "Đang upload..." : "Kéo thả để upload banner nhanh"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Hỗ trợ JPG, PNG. Khuyến nghị Desktop (1376x768), Mobile (800x400).
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) quickUpload(file);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          Chọn ảnh từ máy
        </Button>
      </Card>

      {/* Dialog thêm/sửa */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingBanner ? "Chỉnh sửa Banner" : "Thêm Banner mới"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Tiêu đề *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="VD: Siêu Sale Điện Máy 9.9"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Vị trí hiển thị</Label>
                <Select
                  value={formData.position || "HOME_SLIDER"}
                  onValueChange={(v) => setFormData({ ...formData, position: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(POSITION_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mẫu hiển thị hero</Label>
                <Select
                  value={formData.template || "AUTO"}
                  onValueChange={(v) => setFormData({ ...formData, template: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="VD: Giảm đến 50% toàn hệ thống"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">URL Hình ảnh *</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://... (hoặc upload nhanh ở cuối trang)"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ctaText">Chữ nút CTA</Label>
                <Input
                  id="ctaText"
                  value={formData.ctaText || ""}
                  onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                  placeholder="VD: Sắm ngay kẻo lỡ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="badgeText">Chữ badge nổi</Label>
                <Input
                  id="badgeText"
                  value={formData.badgeText || ""}
                  onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                  placeholder="VD: GIẢM 50% SIÊU RẺ"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkUrl">URL Liên kết</Label>
              <Input
                id="linkUrl"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="/products?category=tivi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="featuredIds">ID sản phẩm nổi (cách nhau dấu phẩy)</Label>
              <Input
                id="featuredIds"
                value={featuredIdsText}
                onChange={(e) => setFeaturedIdsText(e.target.value)}
                placeholder="VD: cmts63..., cmts63..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Ngày bắt đầu</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate?.slice(0, 16) || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Ngày kết thúc</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate?.slice(0, 16) || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value ? new Date(e.target.value).toISOString() : null })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lượt xem (impressions)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.impressions ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, impressions: e.target.value ? Number(e.target.value) : undefined })
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Lượt nhấp (clicks)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.clicks ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, clicks: e.target.value ? Number(e.target.value) : undefined })
                  }
                  placeholder="0"
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit">{editingBanner ? "Cập nhật" : "Tạo mới"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Xác nhận xóa banner"
        description="Bạn có chắc chắn muốn xóa banner này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
