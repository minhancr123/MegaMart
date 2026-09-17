"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, ArrowLeft, Save, Search } from "lucide-react";
import { 
  inventoryApi, 
  Warehouse,
  Supplier,
  StockMovementType,
  stockMovementTypeLabels,
  CreateStockMovementDto,
} from "@/lib/inventoryApi";
import { toast } from "sonner";

interface MovementItem {
  variantId: string;
  sku: string;
  productName: string;
  quantity: number;
  orderedQty?: number;
  unitPrice?: number;
  notes?: string;
}

interface VariantSearchResult {
  variantId: string;
  sku: string;
  productId: string;
  productName: string;
  price: number;
  stock: number;
  imageUrl?: string;
  attributes: Record<string, string>;
}

export default function NewMovementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState({
    type: StockMovementType.IMPORT,
    warehouseId: "",
    supplierId: "",
    toWarehouseId: "",
    purchaseOrderId: "",
    notes: "",
  });
  const [openPOs, setOpenPOs] = useState<any[]>([]);
  const [items, setItems] = useState<MovementItem[]>([]);
  const [variantSearch, setVariantSearch] = useState("");
  const [searchResults, setSearchResults] = useState<VariantSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<VariantSearchResult | null>(null);
  const [newItem, setNewItem] = useState({
    quantity: 1,
    unitPrice: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [warehousesRes, suppliersRes] = await Promise.all([
          inventoryApi.getWarehouses(),
          inventoryApi.getSuppliers(),
        ]);
        setWarehouses(warehousesRes.data || []);
        setSuppliers(suppliersRes.data || []);
      } catch (error: unknown) {
        toast.error("Không thể tải dữ liệu");
        setWarehouses([]);
        setSuppliers([]);
      }
    };
    fetchData();
  }, []);

  // PO đang mở (SENT/PARTIAL) để nhập hàng theo PO
  useEffect(() => {
    if (formData.type !== StockMovementType.IMPORT) return;
    (async () => {
      try {
        const [sent, partial]: any[] = await Promise.all([
          inventoryApi.getPurchaseOrders({ status: "SENT", limit: 50 }),
          inventoryApi.getPurchaseOrders({ status: "PARTIAL", limit: 50 }),
        ]);
        const toList = (r: any) => (Array.isArray(r) ? r : (r?.data?.data ?? r?.data ?? []));
        setOpenPOs([...toList(sent), ...toList(partial)]);
      } catch {
        setOpenPOs([]);
      }
    })();
  }, [formData.type]);

  // Đọc ?purchaseOrderId= để tạo phiếu nhập thẳng từ PO
  useEffect(() => {
    const poId = new URLSearchParams(window.location.search).get("purchaseOrderId");
    if (poId) applyPurchaseOrder(poId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPurchaseOrder = async (poId: string) => {
    try {
      const res: any = await inventoryApi.getPurchaseOrder(poId);
      const po = res?.data ?? res;
      if (!po?.id) {
        toast.error("Không tải được PO");
        return;
      }
      setFormData((prev) => ({
        ...prev,
        type: StockMovementType.IMPORT,
        warehouseId: po.warehouseId || prev.warehouseId,
        supplierId: po.supplierId || prev.supplierId,
        purchaseOrderId: po.id,
      }));
      setItems(
        (po.items || [])
          .map((it: any) => {
            const remaining = Math.max(0, (it.orderedQty || 0) - (it.receivedQty || 0));
            if (remaining <= 0) return null;
            return {
              variantId: it.variantId,
              sku: it.variant?.sku || "",
              productName: it.variant?.product?.name || "",
              quantity: remaining,
              orderedQty: it.orderedQty,
              unitPrice: it.unitPrice ?? undefined,
            };
          })
          .filter(Boolean) as MovementItem[]
      );
      toast.success(`Đã nạp ${po.code} (${po.status === "PARTIAL" ? "nhập tiếp phần còn thiếu" : "nhập mới"})`);
    } catch {
      toast.error("Không tải được PO");
    }
  };

  // Search variants when search term changes
  useEffect(() => {
    const searchVariants = async () => {
      if (variantSearch.length < 2) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }
      try {
        setSearchLoading(true);
        const response = await inventoryApi.searchVariants(variantSearch);
        console.log('🔍 Search response:', response);
        
        // Since interceptor returns axios response object for array responses,
        // we need to extract the data property
        let results: VariantSearchResult[] = [];
        
        if (Array.isArray(response)) {
          results = response;
        } else if (response && typeof response === 'object' && 'data' in response && Array.isArray((response as { data: unknown }).data)) {
          results = (response as { data: VariantSearchResult[] }).data;
        }
        
        console.log('✅ Final results:', results.length, 'items');
        setSearchResults(results);
      } catch (error: unknown) {
        console.error("❌ Search error:", error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounce = setTimeout(searchVariants, 300);
    return () => clearTimeout(debounce);
  }, [variantSearch]);

  const handleSelectVariant = (variant: VariantSearchResult) => {
    setSelectedVariant(variant);
    setVariantSearch(variant.sku);
    setSearchOpen(false);
    setSearchResults([]); // Clear search results after selection
    setNewItem({
      ...newItem,
      unitPrice: variant.price,
    });
  };

  const handleSearchOpenChange = (open: boolean) => {
    setSearchOpen(open);
    if (!open) {
      // Reset search when popover closes
      if (!selectedVariant) {
        setVariantSearch("");
      }
      setSearchResults([]);
    }
  };

  const handleAddItem = () => {
    if (!selectedVariant || newItem.quantity < 1) {
      toast.error("Vui lòng chọn sản phẩm và nhập số lượng");
      return;
    }
    
    setItems([
      ...items,
      {
        variantId: selectedVariant.variantId,
        sku: selectedVariant.sku,
        productName: selectedVariant.productName,
        quantity: newItem.quantity,
        unitPrice: newItem.unitPrice,
      }
    ]);
    
    // Reset
    setSelectedVariant(null);
    setVariantSearch("");
    setNewItem({ quantity: 1, unitPrice: 0 });
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.warehouseId) {
      toast.error("Vui lòng chọn kho hàng");
      return;
    }
    if (items.length === 0) {
      toast.error("Vui lòng thêm ít nhất một sản phẩm");
      return;
    }
    if (formData.type === StockMovementType.IMPORT && !formData.supplierId) {
      toast.error("Vui lòng chọn nhà cung cấp");
      return;
    }
    if ((formData.type === StockMovementType.TRANSFER_OUT || formData.type === StockMovementType.TRANSFER_IN) 
        && !formData.toWarehouseId) {
      toast.error("Vui lòng chọn kho đích");
      return;
    }

    try {
      setLoading(true);
      const dto: CreateStockMovementDto = {
        type: formData.type,
        warehouseId: formData.warehouseId,
        supplierId: formData.supplierId || undefined,
        toWarehouseId: formData.toWarehouseId || undefined,
        purchaseOrderId:
          formData.type === StockMovementType.IMPORT && formData.purchaseOrderId
            ? formData.purchaseOrderId
            : undefined,
        notes: formData.notes || undefined,
        items: items.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
          orderedQty: item.orderedQty,
          unitPrice: item.unitPrice,
          notes: item.notes,
        })),
      };
      
      const result = await inventoryApi.createMovement(dto);
      console.log('✅ Movement created:', result);
      toast.success("Tạo phiếu kho thành công");
      
      // Wait a bit for toast to show, then redirect
      setTimeout(() => {
        router.push("/admin/inventory/movements");
        router.refresh(); // Force reload
      }, 500);
    } catch (error: unknown) {
      console.error('❌ Create movement error:', error);
      toast.error(error.response?.data?.message || "Không thể tạo phiếu");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0);

  const showSupplier = formData.type === StockMovementType.IMPORT;
  const showToWarehouse = formData.type === StockMovementType.TRANSFER_OUT || formData.type === StockMovementType.TRANSFER_IN;
  const showUnitPrice = formData.type === StockMovementType.IMPORT;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tạo phiếu kho mới</h1>
          <p className="text-muted-foreground mt-1">Nhập xuất, chuyển kho hoặc điều chỉnh tồn kho</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin phiếu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Loại phiếu *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    type: value as StockMovementType,
                    supplierId: "",
                    toWarehouseId: "",
                    purchaseOrderId: "",
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(stockMovementTypeLabels)
                      // Ẩn SALE (tự sinh khi bán hàng) và TRANSFER_IN (trùng IMPORT,
                      // dùng sai sẽ làm phình tổng tồn). Chuyển kho chỉ cần
                      // "Chuyển kho đi" + chọn kho nhận.
                      .filter(([key]) => key !== StockMovementType.SALE && key !== StockMovementType.TRANSFER_IN)
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              {formData.type === StockMovementType.IMPORT && (
                <div className="space-y-2">
                  <Label>Theo đơn đặt hàng (PO)</Label>
                  <Select
                    value={formData.purchaseOrderId || "none"}
                    onValueChange={(value) => {
                      if (value === "none") {
                        setFormData({ ...formData, purchaseOrderId: "" });
                      } else {
                        applyPurchaseOrder(value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Không theo PO (nhập lẻ)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không theo PO (nhập lẻ)</SelectItem>
                      {openPOs.map((po: any) => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.code} · {po.supplier?.name || ""} · {po.status === "PARTIAL" ? "nhập tiếp" : "mới"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Kho hàng *</Label>
                <Select
                  value={formData.warehouseId}
                  onValueChange={(value) => setFormData({ ...formData, warehouseId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn kho" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showSupplier && (
                <div className="space-y-2">
                  <Label>Nhà cung cấp *</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nhà cung cấp" />
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
              )}

              {showToWarehouse && (
                <div className="space-y-2">
                  <Label>Kho đích *</Label>
                  <Select
                    value={formData.toWarehouseId}
                    onValueChange={(value) => setFormData({ ...formData, toWarehouseId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn kho đích" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses
                        .filter(w => w.id !== formData.warehouseId)
                        .map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name} ({w.code})
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú cho phiếu..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Tổng kết</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Số lượng sản phẩm:</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tổng số lượng:</span>
                <span className="font-medium">{items.reduce((sum, i) => sum + i.quantity, 0)}</span>
              </div>
              {showUnitPrice && (
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Tổng tiền:</span>
                  <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Button onClick={handleSubmit} className="w-full gap-2" disabled={loading}>
            <Save className="w-4 h-4" />
            {loading ? "Đang tạo..." : "Tạo phiếu"}
          </Button>
        </div>

        {/* Right: Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách sản phẩm</CardTitle>
              <CardDescription>Thêm các sản phẩm vào phiếu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Item Form */}
              <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Product Search */}
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs">Tìm sản phẩm (SKU hoặc tên) *</Label>
                    <Popover open={searchOpen} onOpenChange={handleSearchOpenChange}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          {selectedVariant ? (
                            <span className="flex min-w-0 flex-1 items-center gap-2">
                              <code className="shrink-0 bg-primary/5 px-1.5 py-0.5 rounded text-xs max-w-[45%] truncate">{selectedVariant.sku}</code>
                              <span className="truncate text-sm">{selectedVariant.productName}</span>
                            </span>
                          ) : (
                            "Tìm kiếm sản phẩm..."
                          )}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[500px] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Nhập SKU hoặc tên sản phẩm..."
                            value={variantSearch}
                            onValueChange={setVariantSearch}
                          />
                          <CommandEmpty>
                            {searchLoading
                              ? "Đang tìm kiếm..."
                              : variantSearch.length < 2
                              ? "Nhập ít nhất 2 ký tự để tìm kiếm..."
                              : "Không tìm thấy sản phẩm"}
                          </CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {searchResults.map((variant) => (
                                <CommandItem
                                  key={variant.variantId}
                                  onSelect={() => handleSelectVariant(variant)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-3 w-full">
                                    {variant.imageUrl && (
                                      <img
                                        src={variant.imageUrl}
                                        alt={variant.productName}
                                        className="w-10 h-10 object-cover rounded"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{variant.productName}</div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        SKU: {variant.sku} | Tồn kho: {variant.stock} | Giá: {new Intl.NumberFormat('vi-VN').format(variant.price)}đ
                                      </div>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Số lượng *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                {showUnitPrice && selectedVariant && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Giá nhập (VND)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={newItem.unitPrice}
                        onChange={(e) => setNewItem({ ...newItem, unitPrice: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Giá hiện tại sản phẩm</Label>
                      <Input
                        value={new Intl.NumberFormat('vi-VN').format(selectedVariant.price) + 'đ'}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                )}

                <Button onClick={handleAddItem} variant="outline" className="gap-2" disabled={!selectedVariant}>
                  <Plus className="w-4 h-4" />
                  Thêm sản phẩm
                </Button>
              </div>

              {/* Items List */}
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có sản phẩm nào. Hãy thêm sản phẩm vào phiếu.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Tên sản phẩm</TableHead>
                      <TableHead className="text-center">Số lượng</TableHead>
                      {showUnitPrice && <TableHead className="text-right">Giá nhập</TableHead>}
                      {showUnitPrice && <TableHead className="text-right">Thành tiền</TableHead>}
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {item.sku}
                          </code>
                        </TableCell>
                        <TableCell>{item.productName || "-"}</TableCell>
                        <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                        {showUnitPrice && (
                          <TableCell className="text-right">
                            {formatCurrency(item.unitPrice || 0)}
                          </TableCell>
                        )}
                        {showUnitPrice && (
                          <TableCell className="text-right font-medium">
                            {formatCurrency((item.unitPrice || 0) * item.quantity)}
                          </TableCell>
                        )}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
