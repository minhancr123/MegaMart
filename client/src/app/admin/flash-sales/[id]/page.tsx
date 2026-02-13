"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ArrowLeft, Plus, Trash2, Search, Circle, Edit } from "lucide-react";
import { flashSaleApi, FlashSale, FlashSaleItem } from "@/lib/marketingApi";
import { Product } from "@/interfaces/product";
import { toast } from "sonner";
import axiosClient from "@/lib/axiosClient";

interface Variant {
  id: string;
  sku: string;
  price: number;
  stock: number;
  product: {
    id: string;
    name: string;
    images: Array<{ url: string }>;
  };
}

export default function FlashSaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const flashSaleId = params.id as string;

  const [flashSale, setFlashSale] = useState<FlashSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);

  // Edit Flash Sale form
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    startTime: "",
    endTime: "",
    active: true,
  });

  // Edit Item form
  const [editingItem, setEditingItem] = useState<FlashSaleItem | null>(null);
  const [editItemSalePrice, setEditItemSalePrice] = useState("");
  const [editItemDiscountPercent, setEditItemDiscountPercent] = useState("");
  const [editItemQuantity, setEditItemQuantity] = useState("");

  // Delete confirmation
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add item form
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [salePrice, setSalePrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [quantity, setQuantity] = useState("");

  const fetchFlashSale = async () => {
    try {
      setLoading(true);
      const response = await flashSaleApi.getById(flashSaleId);
      setFlashSale(response.data || response);
    } catch (error) {
      toast.error("Không thể tải thông tin Flash Sale");
      router.push("/admin/flash-sales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashSale();
  }, [flashSaleId]);

  // Search variants
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Vui lòng nhập từ khóa tìm kiếm");
      return;
    }

    try {
      console.log('Searching for:', searchQuery);
      const response = await axiosClient.get(`/products?search=${encodeURIComponent(searchQuery)}`);
      console.log('Search response:', response);

      // Handle different response structures
      let products = [];
      if (Array.isArray(response.data)) {
        products = response.data;
      } else if (response.data?.data) {
        products = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
      } else {
        console.error('Unexpected response structure:', response.data);
        toast.error("Không tìm thấy sản phẩm nào");
        return;
      }

      console.log('Products found:', products.length);

      // Flatten variants from all products
      const variants: Variant[] = [];
      products.forEach((product: Product) => {
        if (product.variants && Array.isArray(product.variants)) {
          product.variants.forEach((variant: Variant) => {
            variants.push({
              id: variant.id,
              sku: variant.sku,
              price: Number(variant.price) || 0,
              stock: variant.stock || 0,
              product: {
                id: product.id,
                name: product.name,
                images: product.images || [],
              },
            });
          });
        }
      });

      console.log('Variants extracted:', variants.length);
      setSearchResults(variants);

      if (variants.length === 0) {
        toast.info("Không tìm thấy sản phẩm nào");
      }
    } catch (error: unknown) {
      console.error('Search error:', error);
      toast.error(error instanceof Error ? error.message : "Không thể tìm kiếm sản phẩm");
    }
  };

  const handleSelectVariant = (variant: Variant) => {
    setSelectedVariant(variant);
    const defaultDiscount = 20;
    setDiscountPercent(defaultDiscount.toString());
    setSalePrice(Math.round(variant.price * (1 - defaultDiscount / 100)).toString());
    setQuantity("10"); // Default quantity
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const price = e.target.value;
    setSalePrice(price);

    if (selectedVariant && price) {
      const p = parseFloat(price);
      if (!isNaN(p) && p > 0 && selectedVariant.price > 0) {
        const percent = ((selectedVariant.price - p) / selectedVariant.price) * 100;
        setDiscountPercent(percent.toFixed(0));
      }
    } else {
      setDiscountPercent("");
    }
  };

  const handlePercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = e.target.value;
    setDiscountPercent(percent);

    if (selectedVariant && percent) {
      const p = parseFloat(percent);
      if (!isNaN(p) && p >= 0 && p < 100) {
        const price = selectedVariant.price * (1 - p / 100);
        setSalePrice(Math.round(price).toString());
      }
    }
  };

  const handleAddItem = async () => {
    if (!selectedVariant) {
      toast.error("Vui lòng chọn sản phẩm");
      return;
    }

    if (!salePrice || parseFloat(salePrice) <= 0) {
      toast.error("Vui lòng nhập giá sale hợp lệ");
      return;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      toast.error("Vui lòng nhập số lượng hợp lệ");
      return;
    }

    try {
      await flashSaleApi.addItems(flashSaleId, [
        {
          variantId: selectedVariant.id,
          salePrice: parseFloat(salePrice),
          quantity: parseInt(quantity),
        },
      ]);

      toast.success("Thêm sản phẩm thành công");
      setDialogOpen(false);
      resetForm();
      fetchFlashSale();
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data ? (error.response.data as { message: string }).message : "Không thể thêm sản phẩm";
      toast.error(message);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setIsDeleting(true);
    try {
      await flashSaleApi.removeItem(flashSaleId, itemId);
      toast.success("Xóa sản phẩm thành công");
      fetchFlashSale();
    } catch (error: unknown) {
      toast.error("Không thể xóa sản phẩm");
    } finally {
      setIsDeleting(false);
      setDeleteItemId(null);
    }
  };

  const handleOpenEditDialog = () => {
    if (flashSale) {
      setEditFormData({
        name: flashSale.name,
        description: flashSale.description || "",
        startTime: flashSale.startTime.slice(0, 16),
        endTime: flashSale.endTime.slice(0, 16),
        active: flashSale.active,
      });
      setEditDialogOpen(true);
    }
  };

  const handleUpdateFlashSale = async () => {
    if (!editFormData.name.trim()) {
      toast.error("Vui lòng nhập tên Flash Sale");
      return;
    }

    if (!editFormData.startTime || !editFormData.endTime) {
      toast.error("Vui lòng chọn thời gian");
      return;
    }

    try {
      await flashSaleApi.update(flashSaleId, editFormData);
      toast.success("Cập nhật Flash Sale thành công");
      setEditDialogOpen(false);
      fetchFlashSale();
    } catch (error: unknown) {
      toast.error("Không thể cập nhật Flash Sale");
    }
  };

  // Edit item handlers
  const handleOpenEditItem = (item: FlashSaleItem) => {
    setEditingItem(item);
    setEditItemSalePrice(item.salePrice.toString());
    setEditItemQuantity(item.quantity.toString());
    
    // Calculate discount percent from original and sale price
    const originalPrice = parseFloat(item.variant.price);
    const itemSalePrice = parseFloat(item.salePrice);
    const calculatedPercent = ((originalPrice - itemSalePrice) / originalPrice * 100).toFixed(0);
    setEditItemDiscountPercent(calculatedPercent);
    
    setEditItemDialogOpen(true);
  };

  const handleEditItemPriceChange = (value: string) => {
    setEditItemSalePrice(value);
    
    if (editingItem && value) {
      const originalPrice = parseFloat(editingItem.variant.price);
      const newSalePrice = parseFloat(value);
      
      if (newSalePrice > 0 && newSalePrice < originalPrice) {
        const percent = ((originalPrice - newSalePrice) / originalPrice * 100).toFixed(0);
        setEditItemDiscountPercent(percent);
      }
    }
  };

  const handleEditItemPercentChange = (value: string) => {
    setEditItemDiscountPercent(value);
    
    if (editingItem && value) {
      const originalPrice = parseFloat(editingItem.variant.price);
      const percent = parseFloat(value);
      
      if (percent > 0 && percent < 100) {
        const newSalePrice = (originalPrice * (1 - percent / 100)).toFixed(0);
        setEditItemSalePrice(newSalePrice);
      }
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    if (!editItemSalePrice || parseFloat(editItemSalePrice) <= 0) {
      toast.error("Vui lòng nhập giá sale hợp lệ");
      return;
    }

    if (!editItemQuantity || parseInt(editItemQuantity) <= 0) {
      toast.error("Vui lòng nhập số lượng hợp lệ");
      return;
    }

    try {
      await flashSaleApi.updateItem(flashSaleId, editingItem.id, {
        salePrice: parseFloat(editItemSalePrice),
        quantity: parseInt(editItemQuantity),
      });

      toast.success("Cập nhật sản phẩm thành công");
      setEditItemDialogOpen(false);
      setEditingItem(null);
      fetchFlashSale();
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data ? (error.response.data as { message: string }).message : "Không thể cập nhật sản phẩm";
      toast.error(message);
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedVariant(null);
    setSalePrice("");
    setDiscountPercent("");
    setQuantity("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div><Circle className="w-10 h-10 animate-spin " /></div>
      </div>
    );
  }

  if (!flashSale) {
    return null;
  }

  const now = new Date();
  const startTime = new Date(flashSale.startTime);
  const endTime = new Date(flashSale.endTime);
  const isActive = now >= startTime && now <= endTime && flashSale.active;
  const isUpcoming = now < startTime;
  const isEnded = now > endTime;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{flashSale.name}</h1>
            <p className="text-gray-500 text-sm">
              {new Date(flashSale.startTime).toLocaleString('vi-VN')} - {new Date(flashSale.endTime).toLocaleString('vi-VN')}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={handleOpenEditDialog}>
            <Edit className="w-4 h-4 mr-2" />
            Chỉnh sửa
          </Button>
          {isActive && <Badge className="bg-green-600">Đang diễn ra</Badge>}
          {isUpcoming && <Badge className="bg-yellow-600">Sắp diễn ra</Badge>}
          {isEnded && <Badge variant="secondary">Đã kết thúc</Badge>}
          {!flashSale.active && <Badge variant="secondary">Tắt</Badge>}
        </div>
      </div>

      {/* Flash Sale Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin Flash Sale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Mô tả</Label>
              <p className="text-sm text-gray-600">{flashSale.description || "Không có mô tả"}</p>
            </div>
            <div>
              <Label>Tổng sản phẩm</Label>
              <p className="text-sm font-bold">{flashSale.items?.length || 0} sản phẩm</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Danh sách sản phẩm</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm sản phẩm
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Thêm sản phẩm vào Flash Sale</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Search */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tìm kiếm sản phẩm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button onClick={handleSearch}>
                      <Search className="w-4 h-4 mr-2" />
                      Tìm
                    </Button>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sản phẩm</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Giá</TableHead>
                            <TableHead>Tồn kho</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {searchResults.map((variant) => (
                            <TableRow key={variant.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {variant.product.images[0] && (
                                    <img
                                      src={variant.product.images[0].url}
                                      alt={variant.product.name}
                                      className="w-10 h-10 object-cover rounded"
                                    />
                                  )}
                                  <span className="text-sm">{variant.product.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>{variant.sku}</TableCell>
                              <TableCell>{variant.price.toLocaleString('vi-VN')}đ</TableCell>
                              <TableCell>{variant.stock}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant={selectedVariant?.id === variant.id ? "default" : "outline"}
                                  onClick={() => handleSelectVariant(variant)}
                                >
                                  {selectedVariant?.id === variant.id ? "Đã chọn" : "Chọn"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Selected Product Form */}
                  {selectedVariant && (
                    <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
                      <h4 className="font-semibold">Sản phẩm đã chọn:</h4>
                      <div className="flex items-center gap-2">
                        {selectedVariant.product.images[0] && (
                          <img
                            src={selectedVariant.product.images[0].url}
                            alt={selectedVariant.product.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium">{selectedVariant.product.name}</p>
                          <p className="text-sm text-gray-500">SKU: {selectedVariant.sku}</p>
                          <p className="text-sm">Giá gốc: {selectedVariant.price.toLocaleString('vi-VN')}đ</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Giá sale *</Label>
                          <Input
                            type="number"
                            value={salePrice}
                            onChange={handlePriceChange}
                            placeholder="Nhập giá sale"
                          />
                        </div>
                        <div>
                          <Label>% Giảm</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={discountPercent}
                              onChange={handlePercentChange}
                              placeholder="20"
                              className="pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                          </div>
                        </div>
                        <div>
                          <Label>Số lượng *</Label>
                          <Input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="Nhập số lượng"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={resetForm}>
                          Hủy
                        </Button>
                        <Button onClick={handleAddItem}>
                          Thêm vào Flash Sale
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {(!flashSale.items || flashSale.items.length === 0) ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có sản phẩm nào. Nhấn &quot;Thêm sản phẩm&quot; để bắt đầu.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Giá gốc</TableHead>
                  <TableHead>Giá sale</TableHead>
                  <TableHead>Giảm</TableHead>
                  <TableHead>Số lượng</TableHead>
                  <TableHead>Đã bán</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flashSale.items.map((item: FlashSaleItem) => {
                  const originalPrice = item.variant?.price || 0;
                  const discount = originalPrice > 0 ? Math.round(((originalPrice - item.salePrice) / originalPrice) * 100) : 0;
                  const imageUrl = item.variant?.product?.images?.[0]?.url || '';

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {imageUrl && (
                            <img
                              src={imageUrl}
                              alt={item.variant?.product?.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <span className="text-sm">{item.variant?.product?.name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.variant?.sku || 'N/A'}</TableCell>
                      <TableCell>{originalPrice.toLocaleString('vi-VN')}đ</TableCell>
                      <TableCell className="font-bold text-red-600">
                        {item.salePrice.toLocaleString('vi-VN')}đ
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-red-600">-{discount}%</Badge>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        <span className={item.soldCount > 0 ? "text-green-600 font-medium" : ""}>
                          {item.soldCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditItem(item)}
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteItemId(item.id)}
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Flash Sale Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Flash Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Tên chương trình *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="VD: Flash Sale Cuối Tuần"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Mô tả</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Mô tả ngắn về chương trình..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startTime">Thời gian bắt đầu *</Label>
                <Input
                  id="edit-startTime"
                  type="datetime-local"
                  value={editFormData.startTime}
                  onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endTime">Thời gian kết thúc *</Label>
                <Input
                  id="edit-endTime"
                  type="datetime-local"
                  value={editFormData.endTime}
                  onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={editFormData.active}
                onCheckedChange={(checked) => setEditFormData({ ...editFormData, active: checked })}
              />
              <Label htmlFor="edit-active">Kích hoạt</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleUpdateFlashSale}>
                Cập nhật
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editItemDialogOpen} onOpenChange={setEditItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa sản phẩm trong Flash Sale</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              {/* Product Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {editingItem.variant?.product?.images?.[0]?.url && (
                  <img
                    src={editingItem.variant.product.images[0].url}
                    alt={editingItem.variant.product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div>
                  <div className="font-medium">{editingItem.variant?.product?.name}</div>
                  <div className="text-sm text-gray-500">SKU: {editingItem.variant?.sku}</div>
                  <div className="text-sm text-gray-700 mt-1">
                    Giá gốc: <span className="font-medium">{parseFloat(editingItem.variant?.price || 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </div>

              {/* Price Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-item-salePrice">Giá sale (đ) *</Label>
                  <Input
                    id="edit-item-salePrice"
                    type="number"
                    value={editItemSalePrice}
                    onChange={(e) => handleEditItemPriceChange(e.target.value)}
                    placeholder="Nhập giá sale"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-item-discountPercent">% Giảm giá</Label>
                  <Input
                    id="edit-item-discountPercent"
                    type="number"
                    value={editItemDiscountPercent}
                    onChange={(e) => handleEditItemPercentChange(e.target.value)}
                    placeholder="Nhập % giảm"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="edit-item-quantity">Số lượng *</Label>
                <Input
                  id="edit-item-quantity"
                  type="number"
                  value={editItemQuantity}
                  onChange={(e) => setEditItemQuantity(e.target.value)}
                  placeholder="Nhập số lượng"
                />
                <p className="text-sm text-gray-500">
                  Đã bán: {editingItem.soldCount} sản phẩm
                </p>
              </div>

              {/* Preview */}
              {editItemSalePrice && editItemDiscountPercent && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900 mb-1">Xem trước:</div>
                  <div className="flex justify-between text-sm">
                    <span>Giá gốc:</span>
                    <span className="line-through">{parseFloat(editingItem.variant?.price || 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Giá sale:</span>
                    <span className="font-bold text-red-600">{parseFloat(editItemSalePrice).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Giảm giá:</span>
                    <span className="font-bold text-green-600">-{editItemDiscountPercent}%</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditItemDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleUpdateItem}>
                  Cập nhật
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteItemId}
        onOpenChange={(open) => !open && setDeleteItemId(null)}
        onConfirm={() => deleteItemId && handleRemoveItem(deleteItemId)}
        title="Xác nhận xóa sản phẩm"
        description="Bạn có chắc muốn xóa sản phẩm này khỏi Flash Sale? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
