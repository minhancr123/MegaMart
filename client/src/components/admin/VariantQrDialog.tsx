"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import { toast } from "sonner";

/**
 * Nhãn QR của 1 biến thể: mã QR chứa đúng SKU để quét đối chiếu khi
 * nhập/xuất/chuyển kho. Kèm nút tải PNG để in dán kệ.
 */
export default function VariantQrDialog({
  open,
  onOpenChange,
  sku,
  productName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sku: string;
  productName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleDownload = () => {
    try {
      const url = canvasRef.current?.toDataURL("image/png");
      if (!url) {
        toast.error("Không tạo được ảnh QR");
        return;
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR-${sku || "san-pham"}.png`;
      a.click();
      toast.success("Đã tải nhãn QR");
    } catch {
      toast.error("Không tạo được ảnh QR");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Nhãn QR biến thể</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="rounded-2xl border bg-white p-4">
            <QRCodeSVG value={sku} size={200} />
          </div>
          {/* Canvas ẩn để xuất PNG */}
          <div className="hidden" aria-hidden>
            <QRCodeCanvas ref={canvasRef} value={sku} size={512} />
          </div>
          <div className="text-center">
            <p className="font-mono text-sm font-bold break-all">{sku}</p>
            {productName && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{productName}</p>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Quét để đối chiếu SKU khi nhập / xuất / chuyển kho.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1.5" /> Tải PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
