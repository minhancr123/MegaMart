"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  fetchAddressesByUser,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  Address,
  CreateAddressDto
} from "@/lib/addressApi";
import {
  getGhnProvinces,
  getGhnDistricts,
  getGhnWards,
  type GhnProvince,
  type GhnDistrict,
  type GhnWard,
} from "@/lib/shippingApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, MapPin, Edit, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

interface AddressManagerProps {
  onSelect?: (address: Address) => void;
  selectedId?: string;
  mode?: "select" | "manage"; // select for checkout, manage for profile
}

export default function AddressManager({ onSelect, selectedId, mode = "manage" }: AddressManagerProps) {
  const { user } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<CreateAddressDto>({
    userId : "",
    fullName: "",
    phone: "",
    address: "",
    province: "",
    district: "",
    ward: "",
    provinceId: null,
    districtId: null,
    wardCode: null,
    label: "Nhà",
    isDefault: false,
  });
  const [provinces, setProvinces] = useState<GhnProvince[]>([]);
  const [districts, setDistricts] = useState<GhnDistrict[]>([]);
  const [wards, setWards] = useState<GhnWard[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadAddresses();
    }
  }, [user]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const data = await fetchAddressesByUser(user!.id);
      setAddresses(data);
      if (mode === "select" && onSelect && data.length > 0) {
        const defaultAddress = data.find((addr) => addr.isDefault) || data[0];
        if (!selectedId || !data.some((addr) => addr.id === selectedId)) {
          onSelect(defaultAddress);
        }
      }
    } catch (error) {
      toast.error("Không thể tải danh sách địa chỉ");
    } finally {
      setLoading(false);
    }
  };

  const loadProvinces = async () => {
    try {
      const list = await getGhnProvinces();
      setProvinces(list);
    } catch {
      setProvinces([]);
    }
  };

  const loadDistricts = async (provinceId: number) => {
    setDistricts([]);
    setWards([]);
    if (!provinceId) return;
    setLoadingGeo(true);
    try {
      setDistricts(await getGhnDistricts(provinceId));
    } catch {
      setDistricts([]);
    } finally {
      setLoadingGeo(false);
    }
  };

  const loadWards = async (districtId: number) => {
    setWards([]);
    if (!districtId) return;
    setLoadingGeo(true);
    try {
      setWards(await getGhnWards(districtId));
    } catch {
      setWards([]);
    } finally {
      setLoadingGeo(false);
    }
  };

  // Chuẩn hóa tên để đối chiếu địa chỉ text cũ với master-data GHN
  const normGeo = (s?: string | null) =>
    (s || "")
      .toLowerCase()
      .replace(/^(tỉnh|thành phố|tp\.?|quận|huyện|thị xã|phường|xã|thị trấn)\s+/g, "")
      .replace(/[^a-z0-9à-ỹđ ]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  // Địa chỉ cũ chỉ có text: tự đối chiếu sang mã GHN để khỏi bắt user chọn lại
  const autoMatchGeo = async (provinceText: string, districtText: string, wardText: string) => {
    try {
      const matchName = (name: string, text: string) => {
        const n = normGeo(name);
        const t = normGeo(text);
        return !!t && (n === t || n.includes(t) || t.includes(n));
      };
      const provs = await getGhnProvinces();
      setProvinces(provs);
      const pv = provs.find((p) => matchName(p.ProvinceName, provinceText));
      if (!pv) return;
      const dists = await getGhnDistricts(pv.ProvinceID);
      setDistricts(dists);
      const dt = dists.find((d) => matchName(d.DistrictName, districtText));
      let wardCode: string | null = null;
      let wardName: string | undefined;
      if (dt) {
        const wds = await getGhnWards(dt.DistrictID);
        setWards(wds);
        const wd = wds.find((w) => matchName(w.WardName, wardText));
        if (wd) {
          wardCode = wd.WardCode;
          wardName = wd.WardName;
        }
      }
      setFormData((prev) => ({
        ...prev,
        provinceId: pv.ProvinceID,
        province: pv.ProvinceName,
        districtId: dt?.DistrictID ?? prev.districtId ?? null,
        district: dt?.DistrictName ?? prev.district,
        wardCode: wardCode ?? prev.wardCode ?? null,
        ward: wardName ?? prev.ward,
      }));
    } catch {
      // Không match được thì user chọn tay, không chặn form
    }
  };

  const handleOpenDialog = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        userId : address.userId,
        fullName: address.fullName,
        phone: address.phone,
        address: address.address,
        province: address.province || "",
        district: address.district || "",
        ward: address.ward || "",
        provinceId: address.provinceId ?? null,
        districtId: address.districtId ?? null,
        wardCode: address.wardCode ?? null,
        label: address.label || "Nhà",
        isDefault: address.isDefault,
      });
      // Nạp sẵn chuỗi địa giới cho địa chỉ đang sửa; địa chỉ cũ thiếu
      // mã GHN thì tự đối chiếu theo tên để chuẩn hóa dần
      if (address.provinceId) {
        loadDistricts(address.provinceId).then(() => {
          if (address.districtId) loadWards(address.districtId);
        });
      } else if (address.province || address.district || address.ward) {
        autoMatchGeo(address.province || "", address.district || "", address.ward || "");
      }
    } else {
      setEditingAddress(null);
      setDistricts([]);
      setWards([]);
      setFormData({
        userId : "",
        fullName: "",
        phone: "",
        address: "",
        province: "",
        district: "",
        ward: "",
        provinceId: null,
        districtId: null,
        wardCode: null,
        label: "Nhà",
        isDefault: addresses.length === 0,
      });
    }
    loadProvinces();
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingAddress(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.phone || !formData.address) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    if (!formData.districtId || !formData.wardCode) {
      toast.error("Vui lòng chọn Quận/Huyện và Phường/Xã từ danh sách để tính phí ship chính xác");
      return;
    }
    if(!formData.userId){
      formData.userId = user?.id;
    }
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, formData);
        toast.success("Cập nhật địa chỉ thành công");
      } else {
        await createAddress(formData);
        toast.success("Thêm địa chỉ thành công");
      }
      handleCloseDialog();
      loadAddresses();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteAddress(id);
      toast.success("Xóa địa chỉ thành công");
      loadAddresses();
    } catch (error) {
      toast.error("Không thể xóa địa chỉ");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress(id);
      toast.success("Đã đặt làm địa chỉ mặc định");
      loadAddresses();
    } catch (error) {
      toast.error("Không thể đặt địa chỉ mặc định");
    }
  };

  const handleSelectAddress = (address: Address) => {
    if (mode === "select" && onSelect) {
      onSelect(address);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0,1].map(i=>(
          <div key={i} className="animate-pulse rounded-xl border bg-card p-4 space-y-3">
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {mode === "select" ? "Chọn địa chỉ giao hàng" : "Địa chỉ của tôi"}
        </h3>
        <Button onClick={() => handleOpenDialog()} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Thêm địa chỉ mới
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card className="p-8 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="mb-4 text-muted-foreground">Chưa có địa chỉ nào</p>
          <Button onClick={() => handleOpenDialog()}>
            Thêm địa chỉ đầu tiên
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {mode === "select" ? (
            <RadioGroup value={selectedId} onValueChange={(val) => {
              const addr = addresses.find(a => a.id === val);
              if (addr) handleSelectAddress(addr);
            }}>
              {addresses.map((address) => (
                <label key={address.id} htmlFor={`address-${address.id}`} className="cursor-pointer">
                  <Card
                    className={`p-4 transition-all hover:shadow-md ${
                      selectedId === address.id ? "ring-2 ring-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={address.id} id={`address-${address.id}`} />
                      <div className="flex-1">
                        <AddressCard 
                          address={address} 
                          onEdit={() => handleOpenDialog(address)}
                          onDelete={() => setDeleteId(address.id)}
                          onSetDefault={() => handleSetDefault(address.id)}
                          hideActions={mode === "select"}
                        />
                      </div>
                    </div>
                  </Card>
                </label>
              ))}
            </RadioGroup>
          ) : (
            addresses.map((address) => (
              <Card key={address.id} className="p-4">
                <AddressCard 
                  address={address} 
                  onEdit={() => handleOpenDialog(address)}
                  onDelete={() => setDeleteId(address.id)}
                  onSetDefault={() => handleSetDefault(address.id)}
                />
              </Card>
            ))
          )}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? "Cập nhật địa chỉ" : "Thêm địa chỉ mới"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="fullName">Họ và tên *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Số điện thoại *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0912345678"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="province">Tỉnh/Thành phố</Label>
                <select
                  id="province"
                  value={formData.provinceId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    const found = provinces.find((p) => p.ProvinceID === id);
                    setFormData({
                      ...formData,
                      provinceId: id,
                      province: found?.ProvinceName || "",
                      districtId: null,
                      district: "",
                      wardCode: null,
                      ward: "",
                    });
                    if (id) loadDistricts(id);
                    else {
                      setDistricts([]);
                      setWards([]);
                    }
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Chọn tỉnh/thành</option>
                  {provinces.map((p) => (
                    <option key={p.ProvinceID} value={p.ProvinceID}>
                      {p.ProvinceName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="district">Quận/Huyện</Label>
                <select
                  id="district"
                  value={formData.districtId ?? ""}
                  disabled={!formData.provinceId || loadingGeo}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    const found = districts.find((d) => d.DistrictID === id);
                    setFormData({
                      ...formData,
                      districtId: id,
                      district: found?.DistrictName || "",
                      wardCode: null,
                      ward: "",
                    });
                    if (id) loadWards(id);
                    else setWards([]);
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">Chọn quận/huyện</option>
                  {districts.map((d) => (
                    <option key={d.DistrictID} value={d.DistrictID}>
                      {d.DistrictName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="ward">Phường/Xã</Label>
                <select
                  id="ward"
                  value={formData.wardCode ?? ""}
                  disabled={!formData.districtId || loadingGeo}
                  onChange={(e) => {
                    const code = e.target.value || null;
                    const found = wards.find((w) => w.WardCode === code);
                    setFormData({ ...formData, wardCode: code, ward: found?.WardName || "" });
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">Chọn phường/xã</option>
                  {wards.map((w) => (
                    <option key={w.WardCode} value={w.WardCode}>
                      {w.WardName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Địa chỉ cụ thể *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Số nhà, tên đường..."
                required
              />
            </div>

            <div>
              <Label htmlFor="label">Loại địa chỉ</Label>
              <select
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Nhà">Nhà</option>
                <option value="Văn phòng">Văn phòng</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                Đặt làm địa chỉ mặc định
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Hủy
              </Button>
              <Button type="submit">
                {editingAddress ? "Cập nhật" : "Thêm mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Xác nhận xóa địa chỉ"
        description="Bạn có chắc muốn xóa địa chỉ này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  hideActions,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  hideActions?: boolean;
}) {
  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{address.fullName}</h4>
          {address.label && (
            <Badge variant="outline" className="text-xs">
              {address.label}
            </Badge>
          )}
          {address.isDefault && (
            <Badge className="text-xs">
              <Check className="h-3 w-3 mr-1" />
              Mặc định
            </Badge>
          )}
        </div>
        {!hideActions && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            {!address.isDefault && (
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        )}
      </div>
      <p className="mb-1 text-sm text-muted-foreground">
        Số điện thoại: {address.phone}
      </p>
      <p className="text-sm text-foreground">
        {address.address}
        {address.ward && `, ${address.ward}`}
        {address.district && `, ${address.district}`}
        {address.province && `, ${address.province}`}
      </p>
      {!address.isDefault && !hideActions && (
        <Button
          variant="link"
          size="sm"
          onClick={onSetDefault}
          className="p-0 h-auto mt-2 text-primary"
        >
          Đặt làm mặc định
        </Button>
      )}
    </div>
  );
}
