"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Package,
  Warehouse,
  User,
  Calendar,
  FileText,
} from "lucide-react";
import { 
  inventoryApi, 
  StockMovement,
  StockMovementStatus,
  stockMovementTypeLabels,
} from "@/lib/inventoryApi";
import { toast } from "sonner";

export default function MovementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [movement, setMovement] = useState<StockMovement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovement = async () => {
      try {
        setLoading(true);
        const response = await inventoryApi.getMovementById(params.id as string);
        console.log('Movement detail response:', response);
        
        // Handle both direct object and nested data
        const data = response?.data || response;
        console.log('Movement data:', data);
        console.log('Items:', data?.items);
        if (data?.items?.[0]) {
          console.log('First item:', data.items[0]);
          console.log('First item unitPrice:', data.items[0].unitPrice, 'Type:', typeof data.items[0].unitPrice);
        }
        setMovement(data);
      } catch (error) {
        toast.error("Không thể tải thông tin phiếu kho");
        console.error('Fetch movement error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (params.id) {
      fetchMovement();
    }
  }, [params.id]);

  const handleComplete = async () => {
    if (!confirm("Xác nhận hoàn thành phiếu này? Tồn kho sẽ được cập nhật.")) return;
    try {
      await inventoryApi.completeMovement(params.id as string);
      toast.success("Đã hoàn thành phiếu kho");
      router.push("/admin/inventory/movements");
    } catch (error: unknown) {
      toast.error(error.response?.data?.message || "Không thể hoàn thành");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Bạn có chắc muốn hủy phiếu này?")) return;
    try {
      await inventoryApi.cancelMovement(params.id as string);
      toast.success("Đã hủy phiếu");
      router.push("/admin/inventory/movements");
    } catch (error: unknown) {
      toast.error(error.response?.data?.message || "Không thể hủy phiếu");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: StockMovementStatus) => {
    const config = {
      [StockMovementStatus.PENDING]: { variant: "secondary" as const, label: "Chờ xử lý" },
      [StockMovementStatus.COMPLETED]: { variant: "default" as const, label: "Hoàn thành" },
      [StockMovementStatus.CANCELLED]: { variant: "destructive" as const, label: "Đã hủy" },
    };
    const { variant, label } = config[status] || config[StockMovementStatus.PENDING];
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!movement) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">Không tìm thấy phiếu kho</p>
            <Link href="/admin/inventory/movements">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/inventory/movements">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Chi tiết phiếu kho</h1>
            <p className="text-gray-500">
              {movement.code} - {stockMovementTypeLabels[movement.type]}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {movement.status === StockMovementStatus.PENDING && (
            <>
              <Button onClick={handleComplete} className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Hoàn thành
              </Button>
              <Button onClick={handleCancel} variant="destructive" className="gap-2">
                <XCircle className="w-4 h-4" />
                Hủy phiếu
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Movement Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Thông tin chung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Mã phiếu</p>
                <p className="font-medium">{movement.code}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Loại phiếu</p>
                <p className="font-medium">{stockMovementTypeLabels[movement.type]}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Trạng thái</p>
                <div className="mt-1">
                  {getStatusBadge(movement.status)}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Ngày tạo</p>
                <p className="font-medium">{formatDate(movement.createdAt)}</p>
              </div>
            </div>
            {movement.notes && (
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Ghi chú</p>
                  <p className="font-medium">{movement.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Thông tin kho & đối tác</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Warehouse className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Kho hàng</p>
                <p className="font-medium">
                  {movement.warehouse?.name || 'N/A'}
                  {movement.warehouse?.code && (
                    <span className="text-xs text-gray-500 ml-2">({movement.warehouse.code})</span>
                  )}
                </p>
              </div>
            </div>
            {movement.supplier && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Nhà cung cấp</p>
                  <p className="font-medium">{movement.supplier.name}</p>
                  {movement.supplier.phone && (
                    <p className="text-sm text-gray-500">{movement.supplier.phone}</p>
                  )}
                </div>
              </div>
            )}
            {movement.toWarehouseId && (
              <div className="flex items-start gap-3">
                <Warehouse className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Kho đích</p>
                  <p className="font-medium">{movement.toWarehouseId}</p>
                </div>
              </div>
            )}
            {movement.totalAmount !== undefined && movement.totalAmount > 0 && (
              <div className="flex items-start gap-3 pt-4 border-t">
                <div className="w-full">
                  <p className="text-sm text-gray-500">Tổng tiền</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(movement.totalAmount)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách sản phẩm</CardTitle>
          <CardDescription>
            {movement.items?.length || 0} sản phẩm
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Thuộc tính</TableHead>
                <TableHead className="text-center">Số lượng</TableHead>
                <TableHead className="text-right">Đơn giá</TableHead>
                <TableHead className="text-right">Thành tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movement.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {item.variant?.product?.images?.[0] && (
                        <img
                          src={item.variant.product.images[0].url}
                          alt={item.variant.product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium">{item.variant?.product?.name}</p>
                        {item.notes && (
                          <p className="text-xs text-gray-500">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {item.variant?.sku}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.variant?.attributes && typeof item.variant.attributes === 'object' ? (
                        Object.entries(item.variant.attributes).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {value as string}
                          </Badge>
                        ))
                      ) : '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.unitPrice !== null && item.unitPrice !== undefined 
                      ? formatCurrency(Number(item.unitPrice)) 
                      : item.variant?.price 
                      ? formatCurrency(Number(item.variant.price))
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.unitPrice !== null && item.unitPrice !== undefined
                      ? formatCurrency(Number(item.unitPrice) * item.quantity)
                      : item.variant?.price
                      ? formatCurrency(Number(item.variant.price) * item.quantity)
                      : '-'
                    }
                  </TableCell>
                </TableRow>
              ))}
              {(!movement.items || movement.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    Không có sản phẩm nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
