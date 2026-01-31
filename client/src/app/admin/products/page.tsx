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
import { Edit, Plus, Trash2, Search, Loader2, Zap, Copy, FileSpreadsheet, Layers, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useEffect } from "react";
import { fetchAdminProducts, deleteProduct } from "@/lib/adminApi";
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

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    // New dialogs
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
    const [productToClone, setProductToClone] = useState<any>(null);
    const [bulkImportOpen, setBulkImportOpen] = useState(false);
    const [templatesOpen, setTemplatesOpen] = useState(false);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const data = await fetchAdminProducts();
            setProducts(data);
        } catch (error) {
            console.error("Failed to load products", error);
            toast.error("Không thể tải danh sách sản phẩm");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (product: any) => {
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
            loadProducts(); // Reload products
        } catch (error) {
            console.error("Failed to delete product", error);
            toast.error("Không thể xóa sản phẩm");
        } finally {
            setIsDeleting(false);
            setProductToDelete(null);
        }
    };

    const handleCloneClick = (product: any) => {
        setProductToClone(product);
        setCloneDialogOpen(true);
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Pagination calculations
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Sản phẩm</h1>
                    <p className="text-gray-500 mt-1">Quản lý danh sách sản phẩm của bạn ({products.length})</p>
                </div>
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="border-blue-200">
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
                                <Layers className="w-4 h-4 mr-2 text-purple-500" />
                                Từ template
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setBulkImportOpen(true)}>
                                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-500" />
                                Import CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/admin/products/create" className="cursor-pointer">
                                    <Plus className="w-4 h-4 mr-2 text-blue-500" />
                                    Tạo đầy đủ
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Tìm kiếm sản phẩm..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            <TableHead className="w-[100px]">Mã SP</TableHead>
                            <TableHead>Tên sản phẩm</TableHead>
                            <TableHead>Danh mục</TableHead>
                            <TableHead>Giá</TableHead>
                            <TableHead>Tồn kho</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    Không tìm thấy sản phẩm nào
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedProducts.map((product) => {
                                const totalStock = product.variants?.reduce((sum: number, v: any) => sum + v.stock, 0) || 0;
                                const minPrice = product.variants?.[0]?.price || 0;

                                return (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium text-xs text-gray-500">#{product.id.slice(-6)}</TableCell>
                                        <TableCell className="font-medium text-gray-900">
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
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${totalStock > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {totalStock}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                Đang bán
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                                    onClick={() => handleCloneClick(product)}
                                                    title="Sao chép sản phẩm"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                                <Link href={`/admin/products/edit/${product.id}`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
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
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredProducts.length}
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
                    product={productToClone}
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
