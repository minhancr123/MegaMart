"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tag, Search, Plus, Edit, Trash2, Calendar } from "lucide-react";
import { salesApi, SaleVariant } from "@/lib/salesApi";
import { toast } from "sonner";
import Image from "next/image";

export default function SalesManagementPage() {
  const [sales, setSales] = useState<SaleVariant[]>([]);
  const [filteredSales, setFilteredSales] = useState<SaleVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState<SaleVariant | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const loadSales = useCallback(async () => {
    try {
      setLoading(true);
      const response = await salesApi.getActiveSales();
      // Response is already the SaleVariant[] array
      const data = Array.isArray(response) ? response : [];
      setSales(data);
      setFilteredSales(data);
    } catch (error: unknown) {
      console.error("Error fetching sales:", error);
      toast.error("Không thể tải danh sách sale");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = sales.filter(
        (s) =>
          s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSales(filtered);
    } else {
      setFilteredSales(sales);
    }
  }, [searchTerm, sales]);

  const handleRemoveSale = async () => {
    if (!selectedSale) return;

    try {
      await salesApi.removeSale([selectedSale.id]);
      toast.success("Đã xóa sale thành công");
      setShowRemoveDialog(false);
      setSelectedSale(null);
      
      // Reload sales after removal
      const response = await salesApi.getActiveSales();
      const data = Array.isArray(response) ? response : [];
      setSales(data);
      setFilteredSales(data);
    } catch (error: unknown) {
      console.error("Error removing sale:", error);
      toast.error("Không thể xóa sale");
    }
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Number(price));
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Không giới hạn";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const isExpiringSoon = (endDate: string | null | undefined) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  };

  const totalSavings = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.savedAmount || 0),
    0
  );

  const averageDiscount =
    filteredSales.length > 0
      ? filteredSales.reduce((sum, sale) => sum + (sale.discountPercent || 0), 0) /
        filteredSales.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý Sale</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Quản lý giảm giá cho sản phẩm (khác với Flash Sale)
          </p>
        </div>
        <Button className="gap-2" onClick={() => (window.location.href = "/admin/sales/apply")}>
          <Plus className="w-4 h-4" />
          Áp dụng Sale
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Sản phẩm đang Sale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{filteredSales.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Giảm giá TB
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-500">
              {averageDiscount.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Tổng tiết kiệm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">
              {formatPrice(totalSavings.toString())}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Sắp hết hạn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-500">
              {filteredSales.filter((s) => isExpiringSoon(s.saleEndDate)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Tìm kiếm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Tìm theo tên sản phẩm hoặc SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách sản phẩm đang Sale</CardTitle>
          <CardDescription>
            {filteredSales.length} sản phẩm
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-16 w-16 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">Chưa có sản phẩm nào đang sale</p>
              <Button
                className="mt-4"
                onClick={() => (window.location.href = "/admin/sales/apply")}
              >
                Áp dụng Sale ngay
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Hình ảnh</TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Giá gốc</TableHead>
                    <TableHead className="text-right">Giá sale</TableHead>
                    <TableHead className="text-center">Giảm</TableHead>
                    <TableHead className="text-right">Tiết kiệm</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {sale.image ? (
                          <Image
                            src={sale.image}
                            alt={sale.productName}
                            width={50}
                            height={50}
                            className="rounded object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <Tag className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sale.productName}</div>
                          {isExpiringSoon(sale.saleEndDate) && (
                            <Badge variant="destructive" className="mt-1">
                              Sắp hết hạn
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm dark:text-gray-300">
                        {sale.sku}
                      </TableCell>
                      <TableCell className="text-right text-gray-500 dark:text-gray-400 line-through">
                        {formatPrice(sale.originalPrice)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-orange-600 dark:text-orange-500">
                        {sale.salePrice ? formatPrice(sale.salePrice) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                          -{sale.discountPercent}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-500 font-medium">
                        {formatPrice(sale.savedAmount)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                            <Calendar className="w-3 h-3" />
                            {formatDate(sale.saleStartDate)}
                          </div>
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300 mt-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(sale.saleEndDate)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              (window.location.href = `/admin/sales/edit/${sale.id}`)
                            }
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedSale(sale);
                              setShowRemoveDialog(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa sale</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa sale cho sản phẩm{" "}
              <span className="font-semibold">{selectedSale?.productName}</span>?
              <br />
              Sản phẩm sẽ trở về giá gốc.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleRemoveSale}>
              Xóa sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
