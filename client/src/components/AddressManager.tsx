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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [formData, setFormData] = useState<CreateAddressDto>({
    userId : "",
    fullName: "",
    phone: "",
    address: "",
    province: "",
    district: "",
    ward: "",
    label: "Nhà",
    isDefault: false,
  });

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
    } catch (error) {
      toast.error("Không thể tải danh sách địa chỉ");
    } finally {
      setLoading(false);
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
        label: address.label || "Nhà",
        isDefault: address.isDefault,
      });
    } else {
      setEditingAddress(null);
      setFormData({
        userId : "",
        fullName: "",
        phone: "",
        address: "",
        province: "",
        district: "",
        ward: "",
        label: "Nhà",
        isDefault: addresses.length === 0,
      });
    }
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
    if (!confirm("Bạn có chắc muốn xóa địa chỉ này?")) return;

    try {
      await deleteAddress(id);
      toast.success("Xóa địa chỉ thành công");
      loadAddresses();
    } catch (error) {
      toast.error("Không thể xóa địa chỉ");
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
    return <div className="text-center py-8">Đang tải...</div>;
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
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Chưa có địa chỉ nào</p>
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
                <Card
                  key={address.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedId === address.id ? "ring-2 ring-blue-500" : ""
                  }`}
                  onClick={() => handleSelectAddress(address)}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={address.id} id={address.id} />
                    <div className="flex-1">
                      <AddressCard 
                        address={address} 
                        onEdit={() => handleOpenDialog(address)}
                        onDelete={() => handleDelete(address.id)}
                        onSetDefault={() => handleSetDefault(address.id)}
                        hideActions={mode === "select"}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </RadioGroup>
          ) : (
            addresses.map((address) => (
              <Card key={address.id} className="p-4">
                <AddressCard 
                  address={address} 
                  onEdit={() => handleOpenDialog(address)}
                  onDelete={() => handleDelete(address.id)}
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
            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="province">Tỉnh/Thành phố</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  placeholder="Hồ Chí Minh"
                />
              </div>
              <div>
                <Label htmlFor="district">Quận/Huyện</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="Quận 1"
                />
              </div>
              <div>
                <Label htmlFor="ward">Phường/Xã</Label>
                <Input
                  id="ward"
                  value={formData.ward}
                  onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                  placeholder="Phường Bến Nghé"
                />
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
                className="w-full border rounded-md p-2"
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
            <Badge className="text-xs bg-blue-500">
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
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-1">
        Số điện thoại: {address.phone}
      </p>
      <p className="text-sm text-gray-700">
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
          className="p-0 h-auto mt-2 text-blue-600"
        >
          Đặt làm mặc định
        </Button>
      )}
    </div>
  );
}
