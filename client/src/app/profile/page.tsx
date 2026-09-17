"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ChevronDown, Loader2, Mail, MapPin, Package, Phone, ShieldCheck, Award, UserRound, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import axiosClient from "@/lib/axiosClient";
import { Address, fetchAddressesByUser, setDefaultAddress } from "@/lib/addressApi";
import { fetchOrdersByUser } from "@/lib/orderApi";
import { getMyWallet } from "@/lib/walletApi";
import { useAuthStore } from "@/store/authStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { toast } from "sonner";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function ProfilePage() {
  const { user, token, login } = useAuthStore() as any;
  const { totalPoints, getCurrentTier } = useLoyaltyStore();
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [ordersCount, setOrdersCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatAddress = (addr: Address) => [addr.address, addr.ward, addr.district, addr.province].filter(Boolean).join(", ");

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
    });
    setAvatarUrl(user.avatarUrl || null);
    Promise.all([
      fetchOrdersByUser(user.id).catch(() => []),
      getMyWallet().catch(() => null),
      fetchAddressesByUser(user.id).catch(() => []),
    ]).then(([orders, wallet, addressList]) => {
      setOrdersCount(Array.isArray(orders) ? orders.length : 0);
      setWalletBalance(Number((wallet as any)?.balance || 0));
      const list = Array.isArray(addressList) ? addressList : [];
      setAddresses(list);
      const defaultAddress = list.find((addr) => addr.isDefault) || list[0];
      setSelectedAddressId(defaultAddress?.id || "");
      setForm((prev) => ({ ...prev, address: defaultAddress ? formatAddress(defaultAddress) : "" }));
    });
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const uploadAvatar = async () => {
    if (!file) return avatarUrl || user?.avatarUrl || null;
    if (!cloudName || !uploadPreset) {
      toast.warning("Cloudinary chưa cấu hình nên chưa thể đổi ảnh đại diện. Các thông tin khác vẫn được lưu.");
      return avatarUrl || user?.avatarUrl || null;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: formData });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.secure_url) return data.secure_url as string;
    toast.warning("Tải ảnh lên Cloudinary thất bại, giữ nguyên ảnh hiện tại.");
    return avatarUrl || user?.avatarUrl || null;
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!addressId || addressId === selectedAddressId) return;
    setSelectedAddressId(addressId);
    const picked = addresses.find((addr) => addr.id === addressId);
    if (picked) setForm((prev) => ({ ...prev, address: formatAddress(picked) }));
    setAddressSaving(true);
    try {
      await setDefaultAddress(addressId);
      setAddresses((prev) => prev.map((addr) => ({ ...addr, isDefault: addr.id === addressId })));
      toast.success("Đã đặt địa chỉ mặc định");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không thể đặt địa chỉ mặc định");
    } finally {
      setAddressSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return toast.error("Bạn chưa đăng nhập");
    setSaving(true);
    try {
      const finalAvatarUrl = await uploadAvatar();
      await axiosClient.patch(`/users/${user.id}`, {
        name: form.name,
        phone: form.phone,
        ...(finalAvatarUrl ? { avatarUrl: finalAvatarUrl } : {}),
      });
      if (finalAvatarUrl) {
        await axiosClient.patch(`/users/me/avatar/${user.id}`, { avatarUrl: finalAvatarUrl }).catch(() => null);
      }
      const nextUser = { ...user, name: form.name, phone: form.phone, address: form.address, avatarUrl: finalAvatarUrl || avatarUrl };
      if (token) login(nextUser, token);
      setAvatarUrl(nextUser.avatarUrl || null);
      setFile(null);
      setPreview(null);
      toast.success("Đã lưu hồ sơ của bạn");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  const tier = getCurrentTier();
  const selectedAddress = addresses.find((addr) => addr.id === selectedAddressId) || null;
  const avatar = preview || avatarUrl || "/images/placeholder-product.svg";
  const joinedAt = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "Thành viên MegaMart";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff4d00]">Tài khoản MegaMart</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">Thông tin tài khoản</h1>
        <p className="mt-1 text-sm text-zinc-500">Quản lý thông tin cá nhân, ảnh đại diện và các quyền lợi thành viên của bạn.</p>
      </div>

      <Card className="overflow-hidden rounded-3xl border-orange-100 bg-gradient-to-br from-orange-50 via-white to-white shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-zinc-100 shadow-lg ring-1 ring-orange-100">
                <img src={avatar} alt={form.name || "Avatar"} className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/images/placeholder-product.svg"; }} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-[#ff4d00] text-white shadow-md transition hover:bg-[#d94100]"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-zinc-900">{form.name || "Khách hàng MegaMart"}</h2>
                  <Badge className="bg-[#ff4d00] text-white">{tier.icon} {tier.name}</Badge>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500"><Mail className="h-4 w-4" /> {form.email}</p>
                <p className="mt-1 text-xs text-zinc-400">{joinedAt}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-orange-100 bg-white/80 p-4 shadow-sm">
                <Package className="h-5 w-5 text-[#ff4d00]" />
                <p className="mt-2 text-2xl font-black text-zinc-900">{ordersCount}</p>
                <p className="text-xs font-medium text-zinc-500">Đơn hàng</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
                <Wallet className="h-5 w-5 text-emerald-600" />
                <p className="mt-2 text-lg font-black text-zinc-900">{new Intl.NumberFormat("vi-VN").format(walletBalance)}₫</p>
                <p className="text-xs font-medium text-zinc-500">Số dư ví</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-white/80 p-4 shadow-sm">
                <Award className="h-5 w-5 text-amber-600" />
                <p className="mt-2 text-2xl font-black text-zinc-900">{totalPoints.toLocaleString()}</p>
                <p className="text-xs font-medium text-zinc-500">Điểm thưởng</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-zinc-900">Hồ sơ cá nhân</h3>
                <p className="text-xs text-zinc-500">Thông tin này giúp MegaMart giao hàng và hỗ trợ bạn nhanh hơn.</p>
              </div>
              <Badge variant="outline" className="rounded-full"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Đã xác thực</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-700">Họ và tên</Label>
                <div className="relative">
                  <UserRound className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <Input className="h-11 rounded-xl pl-9" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-700">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <Input className="h-11 rounded-xl pl-9" value={form.email} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-700">Số điện thoại</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <Input className="h-11 rounded-xl pl-9" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="VD: 0901234567" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-bold text-zinc-700">Địa chỉ mặc định</Label>
                  <Link href="/profile/addresses" className="text-[11px] font-bold text-[#ff4d00] hover:underline">Quản lý</Link>
                </div>
                {addresses.length > 0 ? (
                  <div className="relative">
                    <button
                      type="button"
                      disabled={addressSaving}
                      onClick={() => setAddressDropdownOpen((v) => !v)}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-sm shadow-sm transition hover:border-orange-200 hover:bg-orange-50/30 focus:outline-none focus:ring-2 focus:ring-[#ff4d00]/20 disabled:opacity-60"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-orange-50 text-[#ff4d00]">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-bold text-zinc-900">{selectedAddress?.label || "Địa chỉ"}</span>
                          {selectedAddress?.isDefault && <Badge className="bg-[#ff4d00] text-white text-[10px]">Mặc định</Badge>}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">{selectedAddress ? formatAddress(selectedAddress) : "Chọn địa chỉ mặc định"}</span>
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition ${addressDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {addressDropdownOpen && (
                      <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-orange-100 bg-white p-2 shadow-xl">
                        {addresses.map((addr) => {
                          const active = addr.id === selectedAddressId;
                          return (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => {
                                setAddressDropdownOpen(false);
                                handleSetDefaultAddress(addr.id);
                              }}
                              className={`w-full rounded-xl px-3 py-2.5 text-left transition ${active ? "bg-orange-50 ring-1 ring-orange-200" : "hover:bg-zinc-50"}`}
                            >
                              <span className="flex items-center justify-between gap-3">
                                <span className="font-bold text-zinc-900">{addr.label || "Địa chỉ"}</span>
                                {active ? <CheckCircle2 className="h-4 w-4 text-[#ff4d00]" /> : addr.isDefault ? <Badge variant="outline" className="text-[10px]">Mặc định</Badge> : null}
                              </span>
                              <span className="mt-1 block text-xs leading-relaxed text-zinc-500">{formatAddress(addr)}</span>
                              <span className="mt-1 block text-[11px] text-zinc-400">{addr.fullName} · {addr.phone}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link href="/profile/addresses" className="flex h-11 items-center rounded-xl border border-dashed border-orange-200 px-3 text-sm font-semibold text-[#ff4d00] hover:bg-orange-50">
                    + Thêm địa chỉ giao hàng
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-zinc-500">Ảnh đại diện hỗ trợ PNG/JPG. {!cloudName || !uploadPreset ? "Local sẽ dùng server upload nếu Cloudinary chưa cấu hình." : ""}</p>
              <Button onClick={handleSave} disabled={saving} className="h-11 rounded-xl bg-[#ff4d00] px-6 font-bold hover:bg-[#d94100]">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu thay đổi
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
