"use client";

import { useState, useEffect, useCallback } from "react";
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
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, MapPin, Edit, Trash2, Check, Navigation } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";

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
    lat: null,
    lng: null,
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

  // Chuẩn hóa tên để đối chiếu địa chỉ text cũ với master-data GHN.
  // Giữ số (Phường 1 -> "1") để so khớp số-học riêng, tránh "1" includes bậy.
  // Hỗ trợ viết tắt "P. 12"/"Q. 1" và dính dấu chấm "TP.HCM".
  const normGeo = (s?: string | null) =>
    (s || "")
      .toLowerCase()
      .replace(/(^|[\s,])([pq])\.\s*/g, "$1")
      .replace(/^(tỉnh|thành phố|tp|quận|huyện|thị xã|phường|xã|thị trấn)[\s.]+/, "")
      .replace(/[^a-z0-9à-ỹđ ]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const isNumericGeo = (s: string) => /^\d+$/.test(s);

  // So khớp tên địa giới, hiểu đúng tên đánh số (Quận 1, Phường 12...).
  // Bản cũ strip prefix rồi `return false` với mọi tên số -> không bao giờ
  // tự điền được Quận 1 / Phường 1 / Xã... rất phổ biến ở HCM.
  const matchGeoName = (name: string, text: string) => {
    const n = normGeo(name);
    const t = normGeo(text);
    if (!n || !t) return false;
    if (n === t) return true;
    if (isNumericGeo(n) && isNumericGeo(t)) return Number(n) === Number(t);
    if (isNumericGeo(n) || isNumericGeo(t)) return false;
    if (n.length <= 2 || t.length <= 2) return false;
    return n.includes(t) || t.includes(n);
  };

  // Tên đánh số phải đi kèm tiền tố trong text ("Quận 1", "P.12"...),
  // không dùng includes trần vì "1" là substring của gần như mọi chuỗi.
  // Có boundary trái để "Shop 1"/"Tháp 1" không bị nhận nhầm thành Phường 1.
  const numericGeoInText = (name: string, fullText: string) => {
    const m = (name || "").toLowerCase().trim().match(
      /^(tỉnh|thành phố|tp\.?|quận|huyện|thị xã|phường|xã|thị trấn)\s+0*(\d+)\b/
    );
    if (!m) return false;
    const prefix = m[1].replace(/\./g, "");
    const num = m[2];
    const alt: Record<string, string> = {
      "tỉnh": "tỉnh",
      "thành phố": "thành phố|tp",
      "tp": "tp|thành phố",
      "quận": "quận|q",
      "huyện": "huyện|h",
      "thị xã": "thị xã",
      "phường": "phường|p",
      "xã": "xã",
      "thị trấn": "thị trấn",
    };
    const f = (fullText || "").toLowerCase();
    return new RegExp(`(?:^|[^a-z0-9à-ỹđ])(?:${alt[prefix] || prefix})\\.?\\s*0*${num}\\b`).test(f);
  };

  // Tên địa giới (kể cả dạng số) có xuất hiện trong đoạn text không?
  const geoNameInText = (name: string, fullText: string) => {
    const n = normGeo(name);
    if (!n) return false;
    if (isNumericGeo(n)) return numericGeoInText(name, fullText);
    if (n.length <= 2) return false;
    return normGeo(fullText).includes(n);
  };

  const byNameLenDesc = <T,>(arr: T[], get: (x: T) => string) =>
    [...arr].sort((a, b) => get(b).length - get(a).length);

  // Địa chỉ cũ chỉ có text: tự đối chiếu sang mã GHN để khỏi bắt user chọn lại
  const autoMatchGeo = async (provinceText: string, districtText: string, wardText: string, fullAddressText?: string) => {
    try {
      const matchName = matchGeoName;
      const provs = await getGhnProvinces();
      setProvinces(provs);
      let pv = provs.find((p) => matchName(p.ProvinceName, provinceText));
      // Fallback matching if province contains HCM / Sai Gon
      const pCombined = `${provinceText} ${fullAddressText || ""}`.toLowerCase();
      if (!pv && (pCombined.includes("hồ chí minh") || pCombined.includes("ho chi minh") || pCombined.includes("sài gòn") || pCombined.includes("hcm"))) {
        pv = provs.find((p) => p.ProvinceName.toLowerCase().includes("hồ chí minh"));
      }
      if (!pv) return;

      const dists = await getGhnDistricts(pv.ProvinceID);
      setDistricts(dists);

      // Match district text or search within full address/districtText
      const dCombined = `${districtText} ${fullAddressText || ""}`.toLowerCase();
      let dt = dists.find((d) => matchName(d.DistrictName, districtText));
      if (!dt) {
        dt = byNameLenDesc(dists, (d) => d.DistrictName).find((d) =>
          geoNameInText(d.DistrictName, dCombined)
        );
      }

      let wardCode: string | null = null;
      let wardName: string | undefined;
      if (dt) {
        const wds = await getGhnWards(dt.DistrictID);
        setWards(wds);
        const wCombined = `${wardText} ${fullAddressText || ""}`.toLowerCase();
        let wd = wds.find((w) => matchName(w.WardName, wardText));
        if (!wd) {
          wd = byNameLenDesc(wds, (w) => w.WardName).find((w) =>
            geoNameInText(w.WardName, wCombined)
          );
        }
        if (wd) {
          wardCode = String(wd.WardCode);
          wardName = wd.WardName;
        }
      } else {
        setWards([]);
      }
      setFormData((prev) => ({
        ...prev,
        provinceId: pv.ProvinceID,
        province: pv.ProvinceName,
        districtId: dt?.DistrictID ?? null,
        district: dt?.DistrictName ?? prev.district,
        wardCode: wardCode ?? null,
        ward: wardName ?? prev.ward,
      }));
    } catch (err) {
      console.warn("autoMatchGeo failed:", err);
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
        lat: address.lat ?? null,
        lng: address.lng ?? null,
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
        autoMatchGeo(address.province || "", address.district || "", address.ward || "", address.address || "");
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
        lat: null,
        lng: null,
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

  const handleGooglePlaceSelect = useCallback((place: {
    formattedAddress?: string;
    streetAddress: string;
    province: string;
    district: string;
    ward: string;
    lat: number;
    lng: number;
  }) => {
    setFormData((prev) => ({
      ...prev,
      address: place.streetAddress || prev.address,
      province: place.province || prev.province,
      district: place.district || prev.district,
      ward: place.ward || prev.ward,
      districtId: null,
      wardCode: null,
      lat: place.lat,
      lng: place.lng,
    }));
    // Đồng thời trigger load data GHN trực tiếp
    (async () => {
      try {
        const provs = await getGhnProvinces();
        setProvinces(provs);
        const combined = `${place.province} ${place.district} ${place.ward} ${place.streetAddress} ${place.formattedAddress || ""}`;
        // Khớp tỉnh theo tên thật (HN, ĐN, tỉnh lẻ...), chỉ fallback HCM
        // khi text có nhắc tới Sài Gòn/HCM như trước đây.
        let pv =
          provs.find((p) => matchGeoName(p.ProvinceName, place.province)) ||
          byNameLenDesc(provs, (p) => p.ProvinceName).find((p) =>
            geoNameInText(p.ProvinceName, combined)
          );
        if (!pv) {
          const lc = combined.toLowerCase();
          const mentionsHcm =
            lc.includes("hồ chí minh") || lc.includes("ho chi minh") ||
            lc.includes("sài gòn") || lc.includes("sai gon") || /\bhcm\b/.test(lc);
          // Giữ hành vi cũ: địa chỉ ngắn không rõ tỉnh (place rỗng) thì mặc
          // định thử HCM để vẫn tự điền được Quận/Phường.
          if (mentionsHcm || !place.province?.trim()) {
            pv = provs.find((p) => p.ProvinceName.toLowerCase().includes("hồ chí minh"));
          }
        }
        if (!pv) {
          // Không đoán mò: reset mã GHN để khỏi lệch ID cũ với text mới,
          // user chọn tay từ dropdown (provinces đã nạp ở trên).
          setDistricts([]);
          setWards([]);
          setFormData((prev) => ({
            ...prev,
            provinceId: null,
            districtId: null,
            wardCode: null,
          }));
          return;
        }

        const dists = await getGhnDistricts(pv.ProvinceID);
        setDistricts(dists);

        let dt =
          dists.find((d) => matchGeoName(d.DistrictName, place.district)) ||
          byNameLenDesc(dists, (d) => d.DistrictName).find((d) =>
            geoNameInText(d.DistrictName, combined)
          );

        let wardCode: string | null = null;
        let wardName: string | undefined;

        if (dt) {
          const wds = await getGhnWards(dt.DistrictID);
          setWards(wds);

          let wd =
            wds.find((w) => matchGeoName(w.WardName, place.ward)) ||
            byNameLenDesc(wds, (w) => w.WardName).find((w) =>
              geoNameInText(w.WardName, combined)
            );

          if (wd) {
            wardCode = String(wd.WardCode);
            wardName = wd.WardName;
          }
        } else {
          setWards([]);
        }

        setFormData((prev) => ({
          ...prev,
          provinceId: pv.ProvinceID,
          province: pv.ProvinceName,
          districtId: dt?.DistrictID ?? prev.districtId,
          district: dt?.DistrictName ?? prev.district,
          wardCode: wardCode ?? prev.wardCode,
          ward: wardName ?? prev.ward,
        }));
      } catch (err) {
        console.warn("Direct GHN load error:", err);
      }
    })();
  }, []);

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
      toast.error(getErrorMessage(error, "Có lỗi xảy ra"));
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
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(event) => {
            if ((event.target as HTMLElement | null)?.closest?.(".pac-container")) {
              event.preventDefault();
            }
          }}
        >
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

            <div>
              <Label>Tìm địa chỉ chính xác trên Google Maps</Label>
              <GooglePlacesAutocomplete onPlaceSelect={handleGooglePlaceSelect} />
              {formData.lat != null && formData.lng != null && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                  <Navigation className="h-3.5 w-3.5" />
                  <span>Đã ghim tọa độ: {Number(formData.lat).toFixed(6)}, {Number(formData.lng).toFixed(6)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setFormData((prev) => ({ ...prev, lat: null, lng: null }))}
                  >
                    Xóa ghim
                  </Button>
                </div>
              )}
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
          {address.lat != null && address.lng != null && (
            <Badge variant="outline" className="text-xs text-primary border-primary/30">
              <Navigation className="h-3 w-3 mr-1" />
              GPS
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
