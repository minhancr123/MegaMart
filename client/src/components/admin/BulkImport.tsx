"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileSpreadsheet, Download, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import axiosClient from "@/lib/axiosClient";

interface BulkImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkImport({ open, onOpenChange, onSuccess }: BulkImportProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const downloadTemplate = () => {
    const csvContent = `Tên sản phẩm,Mô tả,Danh mục ID,SKU,Giá (VNĐ),Số lượng,Thuộc tính (JSON)
iPhone 15 Pro Max,Điện thoại cao cấp,category-id-here,IP15PM001,25000000,50,"{""RAM"":""8GB"",""Storage"":""256GB""}"
MacBook Pro M3,Laptop chuyên nghiệp,category-id-here,MBP2024,45000000,30,"{""RAM"":""16GB"",""Storage"":""512GB""}"`;
    
    // Add BOM for UTF-8 Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'product_import_template.csv';
    link.click();
    
    toast.success("Đã tải template về máy");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error("Vui lòng chọn file CSV");
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const products = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < 6) continue;
      
      try {
        const product = {
          name: values[0]?.trim(),
          description: values[1]?.trim(),
          categoryId: values[2]?.trim(),
          variants: [{
            sku: values[3]?.trim(),
            price: parseFloat(values[4]?.trim()) * 100, // Convert to cents
            stock: parseInt(values[5]?.trim()),
            attributes: values[6] ? JSON.parse(values[6].trim()) : {}
          }]
        };
        
        if (product.name && product.categoryId && product.variants[0].sku) {
          products.push(product);
        }
      } catch (error) {
        console.error(`Error parsing line ${i + 1}:`, error);
      }
    }
    
    return products;
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Vui lòng chọn file");
      return;
    }

    try {
      setLoading(true);
      
      const text = await file.text();
      const products = parseCSV(text);
      
      if (products.length === 0) {
        toast.error("Không tìm thấy sản phẩm hợp lệ trong file");
        return;
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const product of products) {
        try {
          await axiosClient.post("/products", product);
          success++;
        } catch (error: any) {
          failed++;
          errors.push(`${product.name}: ${error.response?.data?.message || 'Unknown error'}`);
        }
      }

      setImportResult({ success, failed, errors });
      
      if (success > 0) {
        toast.success(`Import thành công ${success} sản phẩm!`);
        onSuccess();
      }
      
      if (failed > 0) {
        toast.error(`${failed} sản phẩm import thất bại`);
      }
      
    } catch (error: any) {
      console.error("Failed to import", error);
      toast.error("Có lỗi xảy ra khi import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-500" />
            Import sản phẩm hàng loạt
          </DialogTitle>
          <DialogDescription>
            Upload file CSV để thêm nhiều sản phẩm cùng lúc
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download Template */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1">Bước 1: Tải file mẫu</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Tải file CSV mẫu và điền thông tin sản phẩm theo định dạng
                </p>
                <Button size="sm" variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Tải file mẫu
                </Button>
              </div>
            </div>
          </div>

          {/* Upload File */}
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 mb-2">Bước 2: Upload file CSV</h4>
            <p className="text-sm text-gray-600 mb-4">
              {file ? file.name : "Chọn file CSV đã điền thông tin"}
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <Button asChild size="sm" variant="outline">
                <span>Chọn file</span>
              </Button>
            </label>
          </div>

          {/* Import Result */}
          {importResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-700 font-medium">
                  Thành công: {importResult.success} sản phẩm
                </span>
              </div>
              
              {importResult.failed > 0 && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-700 font-medium">
                      Thất bại: {importResult.failed} sản phẩm
                    </span>
                  </div>
                  
                  {importResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                      <p className="text-xs font-medium text-red-900 mb-1">Chi tiết lỗi:</p>
                      <ul className="text-xs text-red-700 space-y-1">
                        {importResult.errors.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Lưu ý:</strong> File CSV phải có đúng định dạng:
              Tên, Mô tả, Category ID, SKU, Giá (VNĐ), Số lượng, Thuộc tính (JSON)
            </p>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button onClick={handleImport} disabled={loading || !file}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
