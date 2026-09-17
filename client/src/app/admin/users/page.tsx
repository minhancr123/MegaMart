"use client";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, Search, Loader2, User as UserIcon, Users, Plus, Eye, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchAdminUsers, deleteUser, updateUser, createUser } from "@/lib/adminApi";
import { inventoryApi } from "@/lib/inventoryApi";
import type { Supplier } from "@/lib/inventoryApi";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";

function SupplierSelect({
  value,
  onChange,
  currentSupplierId,
}: {
  value: string;
  onChange: (v: string) => void;
  currentSupplierId?: string | null;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res: any = await inventoryApi.getSuppliers();
        setSuppliers(res?.data ?? res ?? []);
      } catch {
        setSuppliers([]);
      }
    })();
  }, []);
  return (
    <div className="grid gap-2">
      <Label>Nhà cung cấp *</Label>
      <Select value={value || currentSupplierId || ""} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Chọn NCC để gắn tài khoản" />
        </SelectTrigger>
        <SelectContent>
          {suppliers.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name} ({s.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface AdminUser {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    role?: string;
    phone?: string;
    supplierId?: string | null;
    supplier?: { id: string; name: string; code: string } | null;
}

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRole, setSelectedRole] = useState("USER");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Delete State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Edit Role State
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [newRole, setNewRole] = useState("");
    const [newSupplierId, setNewSupplierId] = useState("");
    const [updating, setUpdating] = useState(false);

    // Create User State (tài khoản NCC / khách)
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [form, setForm] = useState({ email: "", password: "", name: "", role: "USER", supplierId: "" });

    useEffect(() => {
        loadUsers();
        setCurrentPage(1);
    }, [selectedRole]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await fetchAdminUsers(selectedRole);
            setUsers(data);
        } catch (error) {
            console.error("Failed to load users", error);
            toast.error("Không thể tải danh sách người dùng");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (user: AdminUser) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;

        try {
            setIsDeleting(true);
            await deleteUser(userToDelete.id);
            toast.success("Xóa người dùng thành công");
            setDeleteDialogOpen(false);
            loadUsers(); // Reload users
        } catch (error) {
            console.error("Failed to delete user", error);
            toast.error("Không thể xóa người dùng");
        } finally {
            setIsDeleting(false);
            setUserToDelete(null);
        }
    };

    const handleEditClick = (user: AdminUser) => {
        setSelectedUser(user);
        setNewRole(user.role || "USER");
        setNewSupplierId(user.supplierId || "");
        setEditDialogOpen(true);
    };

    const handleUpdateRole = async () => {
        if (!selectedUser || !newRole) return;
        if (newRole === "SUPPLIER" && !newSupplierId) {
            toast.error("Gán role NCC phải chọn nhà cung cấp");
            return;
        }

        try {
            setUpdating(true);
            await updateUser(selectedUser.id, {
                role: newRole,
                supplierId: newRole === "SUPPLIER" ? newSupplierId : undefined,
            } as any);
            toast.success("Cập nhật vai trò thành công");
            setEditDialogOpen(false);
            loadUsers();
        } catch (error: any) {
            console.error("Failed to update user role", error);
            toast.error(error?.data?.message || error?.errormassage || "Không thể cập nhật vai trò");
        } finally {
            setUpdating(false);
        }
    };

    const openCreateDialog = async () => {
        setForm({ email: "", password: "", name: "", role: "USER", supplierId: "" });
        setCreateDialogOpen(true);
        try {
            const res: any = await inventoryApi.getSuppliers();
            setSuppliers(res?.data ?? res ?? []);
        } catch {
            setSuppliers([]);
        }
    };

    const handleCreateUser = async () => {
        if (!form.email.trim() || !form.password || form.password.length < 6) {
            toast.error("Email và mật khẩu (≥ 6 ký tự) là bắt buộc");
            return;
        }
        if (form.role === "SUPPLIER" && !form.supplierId) {
            toast.error("Tạo tài khoản NCC phải chọn nhà cung cấp");
            return;
        }
        try {
            setCreating(true);
            await createUser({
                email: form.email.trim(),
                password: form.password,
                name: form.name.trim() || undefined,
                role: form.role,
                supplierId: form.role === "SUPPLIER" ? form.supplierId : undefined,
            });
            toast.success("Đã tạo tài khoản");
            setCreateDialogOpen(false);
            loadUsers();
        } catch (error: any) {
            toast.error(error?.data?.message || error?.errormassage || "Không tạo được tài khoản");
        } finally {
            setCreating(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone?.includes(searchQuery)
    );

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Reset to page 1 when search changes or when currentPage exceeds totalPages
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Người dùng"
                description={`Quản lý khách hàng, admin và tài khoản NCC (${users.length})`}
                actions={
                    <Button onClick={openCreateDialog}>
                        <Plus className="w-4 h-4 mr-2" /> Thêm người dùng
                    </Button>
                }
            />

            {/* Filters */}
            <Card className="gap-0 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm mb-2 sm:mb-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm kiếm khách hàng..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-52">
                    <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="USER">Khách hàng</SelectItem>
                            <SelectItem value="SUPPLIER">Nhà cung cấp</SelectItem>
                            <SelectItem value="SHIPPER">Shipper</SelectItem>
                            <SelectItem value="ADMIN">Quản trị viên</SelectItem>
                            <SelectItem value="ALL">Tất cả</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Table */}
            <Card className="gap-0 overflow-hidden py-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[80px]">Avatar</TableHead>
                            <TableHead>Họ và tên</TableHead>
                            <TableHead>Vai trò</TableHead>
                            <TableHead>Ví MegaMart</TableHead>
                            <TableHead>Loyalty</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <AdminTableSkeleton columns={6} />
                        ) : paginatedUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="p-0">
                                    <AdminEmptyState
                                        icon={Users}
                                        title="Không tìm thấy khách hàng nào"
                                        description={searchQuery ? "Thử đổi từ khóa tìm kiếm khác." : "Chưa có khách hàng nào đăng ký."}
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted">
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <UserIcon className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <span className="font-bold text-zinc-900 truncate">{user.name}</span>
                                            <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 items-start">
                                            <Badge variant={user.role === 'ADMIN' ? 'info' : user.role === 'SHIPPER' ? 'warning' : user.role === 'SUPPLIER' ? 'default' : 'secondary'} className="text-[10px] px-1.5 h-5">
                                                {user.role}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-bold text-zinc-900 text-xs">
                                            {new Intl.NumberFormat('vi-VN').format(Number((user as any).wallet?.balance || 0))}₫
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <Award className="h-3.5 w-3.5 text-amber-500" />
                                            <span className="font-black text-xs">{(user as any).loyaltyPoints || 0} đ</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                onClick={() => router.push(`/admin/users/${user.id}`)}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                                                aria-label="Sửa vai trò"
                                                onClick={() => handleEditClick(user)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                aria-label="Xóa người dùng"
                                                onClick={() => handleDeleteClick(user)}
                                                disabled={user.role === 'ADMIN'} // Prevent deleting admin
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredUsers.length}
                    itemsPerPage={itemsPerPage}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleConfirmDelete}
                title="Xóa người dùng"
                description="Bạn có chắc chắn muốn xóa tài khoản"
                itemName={userToDelete?.name || userToDelete?.email}
                isDeleting={isDeleting}
            />

            {/* Edit Role Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Cập nhật vai trò</DialogTitle>
                        <DialogDescription>
                            Thay đổi quyền hạn cho người dùng {selectedUser?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                            <Label htmlFor="role" className="sm:text-right">
                                Vai trò
                            </Label>
                            <Select value={newRole} onValueChange={setNewRole}>
                                <SelectTrigger className="w-full sm:col-span-3">
                                    <SelectValue placeholder="Chọn vai trò" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USER">USER (Khách hàng)</SelectItem>
                                    <SelectItem value="SHIPPER">SHIPPER (Nhân viên giao hàng)</SelectItem>
                                    <SelectItem value="SUPPLIER">SUPPLIER (Nhà cung cấp)</SelectItem>
                                    <SelectItem value="ADMIN">ADMIN (Quản trị viên)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {newRole === "SUPPLIER" && (
                            <SupplierSelect
                                value={newSupplierId}
                                onChange={setNewSupplierId}
                                currentSupplierId={selectedUser?.supplierId}
                            />
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleUpdateRole} disabled={updating}>
                            {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Lưu thay đổi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create User Dialog (tài khoản NCC / khách) */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Thêm người dùng</DialogTitle>
                        <DialogDescription>
                            Tạo tài khoản khách, NCC (gắn nhà cung cấp) hoặc admin.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-email">Email *</Label>
                            <Input
                                id="new-email"
                                type="email"
                                placeholder="supplier@congty.vn"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="new-password">Mật khẩu * (≥ 6 ký tự)</Label>
                                <Input
                                    id="new-password"
                                    type="text"
                                    placeholder="Mật khẩu tạm"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="new-name">Tên hiển thị</Label>
                                <Input
                                    id="new-name"
                                    placeholder="Nguyễn Văn A"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Vai trò</Label>
                            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v, supplierId: "" })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn vai trò" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USER">USER (Khách hàng)</SelectItem>
                                    <SelectItem value="SHIPPER">SHIPPER (Nhân viên giao hàng)</SelectItem>
                                    <SelectItem value="SUPPLIER">SUPPLIER (Nhà cung cấp)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {form.role === "SUPPLIER" && (
                            <SupplierSelect value={form.supplierId} onChange={(v) => setForm({ ...form, supplierId: v })} />
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleCreateUser} disabled={creating}>
                            {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Tạo tài khoản
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
