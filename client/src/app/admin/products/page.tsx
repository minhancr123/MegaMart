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
import { Edit, Plus, Trash2, Search, Zap, Copy, FileSpreadsheet, Layers, ChevronDown, PackageSearch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useTransition } from "react";
import { fetchAdminProductsPage, deleteProduct } from "@/lib/adminApi";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Pagination } from "@/components/ui/pagination";
import { QuickAddProduct } from "@/components/admin/QuickAddProduct";
import { CloneProduct } from "@/components/admin/CloneProduct";
import { BulkImport } from "@/components/admin/BulkImport";
import { ProductTemplates } from "@/components/admin/ProductTemplates";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProductCategory {
    id: string;
    name: string;
}

interface ProductVariant {
    id: string;
    stock: number;
    reservedQuantity?: number | null;
    availableStock?: number | null;
    price: number;
}

interface ProductImage {
    id: string;
    url: string;
}

interface Product {
    id: string;
    name: string;
    category?: ProductCategory;
    variants?: ProductVariant[];
    images?: ProductImage[];
}

export default function ProductsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialPage = parseInt(searchParams.get("page") || "1", 10) || 1;
    const initialSearch = searchParams.get("search") || "";

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const itemsPerPage = 10;
    const [totalItems, setTotalItems] = useState(0);
    const [serverTotalPages, setServerTotalPages] = useState(1);
    // Search debounce 400ms để không bắn request theo từng ký tự
    const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
    
    // New dialogs
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
    const [productToClone, setProductToClone] = useState<Product | null>(null);
    const [bulkImportOpen, setBulkImportOpen] = useState(false);
    const [templatesOpen, setTemplatesOpen] = useState(false);

    // Debounce ô tìm kiếm: đổi từ khóa thì về trang 1
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
            setDebouncedSearch(searchQuery);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Phân trang + tìm kiếm ở SERVER (shop có ~6000 SP, không đổ hết về client)
    const loadProducts = useCallback(async () => {
        try {
            setLoading(true);
            const result = await fetchAdminProductsPage({
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch.trim() || undefined,
            });
            setProducts(result.items);
            setTotalItems(result.total);
            setServerTotalPages(result.totalPages);
        } catch (error: unknown) {
            console.error("Failed to load products", error);
            toast.error("Không thể tải danh sách sản phẩm");
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, debouncedSearch]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    // Cập nhật query string URL mỗi khi page hoặc debouncedSearch thay đổi
    useEffect(() => {
        const params = new URLSearchParams();
        if (currentPage > 1) params.set("page", currentPage.toString());
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

        const queryString = params.toString();
        const newUrl = queryString ? `/admin/products?${queryString}` : "/admin/products";
        
        // Dùng window.history.replaceState để tránh push rác vào browser history khi user đang gõ search
        window.history.replaceState(null, "", newUrl);
    }, [currentPage, debouncedSearch]);

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!productToDelete) return;

        try {
            setIsDeleting(true);
            await deleteProduct(productToDelete.id);
            toast.success("Xóa sản phẩm thành công");
            setDeleteDialogOpen(false);
            // Xóa dòng cuối của trang thì lùi về trang trước cho khỏi trống
            if (products.length <= 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            } else {
                loadProducts(); // Reload products
            }
        } catch (error: unknown) {
            console.error("Failed to delete product", error);
            toast.error("Không thể xóa sản phẩm");
        } finally {
            setIsDeleting(false);
            setProductToDelete(null);
        }
    };

    const handleCloneClick = (product: Product) => {
        setProductToClone(product);
        setCloneDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Sản phẩm"
                description={`Quản lý danh sách sản phẩm của bạn (${totalItems})`}
                actions={
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Plus className="w-4 h-4 mr-2" />
                                Thêm sản phẩm
                                <ChevronDown className="w-4 h-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => setQuickAddOpen(true)}>
                                <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                                Thêm nhanh
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTemplatesOpen(true)}>
                                <Layers className="w-4 h-4 mr-2 text-primary" />
                                Từ template
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setBulkImportOpen(true)}>
                                <FileSpreadsheet className="w-4 h-4 mr-2 text-primary" />
                                Import CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/admin/products/create" className="cursor-pointer">
                                    <Plus className="w-4 h-4 mr-2 text-primary" />
                                    Tạo đầy đủ
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                }
            />

            {/* Filters */}
            <Card className="gap-0 p-4">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm kiếm sản phẩm..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </Card>

            {/* Table */}
            <Card className="gap-0 overflow-hidden py-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[200px]">Mã SP</TableHead>
                            <TableHead>Tên sản phẩm</TableHead>
                            <TableHead>Danh mục</TableHead>
                            <TableHead>Giá</TableHead>
                            <TableHead>Tồn kho</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <AdminTableSkeleton columns={7} />
                        ) : products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="p-0">
                                    <AdminEmptyState
                                        icon={PackageSearch}
                                        title="Không tìm thấy sản phẩm nào"
                                        description={searchQuery ? "Thử đổi từ khóa tìm kiếm khác." : "Bắt đầu bằng cách thêm sản phẩm đầu tiên."}
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            products.map((product) => {
                                const totalStock = product.variants?.reduce((sum: number, v: ProductVariant) => sum + v.stock, 0) || 0;
                                const totalReserved = product.variants?.reduce((sum: number, v: ProductVariant) => sum + (v.reservedQuantity ?? 0), 0) || 0;
                                const totalAvailable = Math.max(0, totalStock - totalReserved);
                                const minPrice = product.variants?.[0]?.price || 0;

                                return (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-mono text-xs text-muted-foreground select-all" title={product.id}>
                                            {product.id}
                                        </TableCell>
                                        <TableCell className="font-medium text-foreground">
                                            <div className="flex items-center gap-2">
                                                {product.images?.[0]?.url && (
                                                    <img src={product.images[0].url} alt="" className="w-8 h-8 rounded object-cover" />
                                                )}
                                                <span className="line-clamp-1">{product.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{product.category?.name || '---'}</TableCell>
                                        <TableCell>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(minPrice))}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col items-start gap-0.5">
                                                <Badge variant={totalAvailable > 10 ? 'success' : 'destructive'} title={`Tồn thực tế: ${totalStock} • Đang giữ: ${totalReserved}`}>{totalAvailable} khả dụng</Badge>
                                                {totalReserved > 0 && (
                                                    <span className="text-xs text-muted-foreground">Tồn {totalStock} • Giữ {totalReserved}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="info">
                                                Đang bán
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                                                    onClick={() => handleCloneClick(product)}
                                                    title="Sao chép sản phẩm"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                                <Link href={`/admin/products/edit/${product.id}?from=${encodeURIComponent(
                                                    (typeof window !== "undefined" ? window.location.search : "") || ""
                                                )}`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    onClick={() => handleDeleteClick(product)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Pagination */}
            {!loading && serverTotalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={serverTotalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleConfirmDelete}
                title="Xóa sản phẩm"
                description="Bạn có chắc chắn muốn xóa sản phẩm"
                itemName={productToDelete?.name}
                isDeleting={isDeleting}
            />

            {/* Quick Add Dialog */}
            <QuickAddProduct
                open={quickAddOpen}
                onOpenChange={setQuickAddOpen}
                onSuccess={loadProducts}
            />

            {/* Clone Dialog */}
            {productToClone && (
                <CloneProduct
                    product={productToClone as any}
                    open={cloneDialogOpen}
                    onOpenChange={setCloneDialogOpen}
                    onSuccess={loadProducts}
                />
            )}

            {/* Bulk Import Dialog */}
            <BulkImport
                open={bulkImportOpen}
                onOpenChange={setBulkImportOpen}
                onSuccess={loadProducts}
            />

            {/* Templates Dialog */}
            <ProductTemplates
                open={templatesOpen}
                onOpenChange={setTemplatesOpen}
            />
        </div>
    );
}
