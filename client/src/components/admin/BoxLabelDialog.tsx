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
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";

/**
 * Nhãn thùng pallet: QR chứa mã thùng để quét đối chiếu khi
 * nhập/xuất/chuyển kho. Tải PNG hoặc in trực tiếp.
 */
export default function BoxLabelDialog({
  open,
  onOpenChange,
  boxCode,
  sku,
  productName,
  quantity,
  warehouseName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boxCode: string;
  sku?: string;
  productName?: string;
  quantity?: number;
  warehouseName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const pngUrl = () => canvasRef.current?.toDataURL("image/png") || null;

  const handleDownload = () => {
    try {
      const url = pngUrl();
      if (!url) {
        toast.error("Không tạo được ảnh nhãn");
        return;
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = `Nhan-${boxCode}.png`;
      a.click();
      toast.success("Đã tải nhãn thùng");
    } catch {
      toast.error("Không tạo được ảnh nhãn");
    }
  };

  const handlePrint = () => {
    try {
      const url = pngUrl();
      if (!url) {
        toast.error("Không tạo được ảnh nhãn");
        return;
      }
      const w = window.open("", "_blank", "width=420,height=560");
      if (!w) {
        toast.error("Trình duyệt chặn popup in ấn");
        return;
      }
      w.document.write(
        `<html><head><title>Nhãn ${boxCode}</title>` +
          `<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;padding:24px;}` +
          `.label{border:2px solid #111;border-radius:12px;padding:20px;text-align:center;width:300px;}` +
          `.code{font-family:monospace;font-weight:900;font-size:20px;margin:8px 0 2px;}` +
          `.meta{font-size:13px;color:#333;margin:2px 0;}</style></head><body>` +
          `<div class="label"><img src="${url}" width="220" height="220" />` +
          `<div class="code">${boxCode}</div>` +
          (sku ? `<div class="meta">${sku}</div>` : "") +
          (productName ? `<div class="meta">${productName}</div>` : "") +
          (quantity != null ? `<div class="meta">SL: <b>${quantity}</b></div>` : "") +
          (warehouseName ? `<div class="meta">${warehouseName}</div>` : "") +
          `</div><script>window.onload=function(){window.print();};</scr` + `ipt></body></html>`
      );
      w.document.close();
    } catch {
      toast.error("Không mở được cửa sổ in");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Nhãn thùng</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="rounded-2xl border bg-white p-4">
            <QRCodeSVG value={boxCode} size={200} />
          </div>
          <div className="hidden" aria-hidden>
            <QRCodeCanvas ref={canvasRef} value={boxCode} size={512} />
          </div>
          <div className="text-center">
            <p className="font-mono text-sm font-black break-all">{boxCode}</p>
            {(productName || sku) && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {productName || sku}
                {sku && productName ? ` · ${sku}` : ""}
              </p>
            )}
            <p className="text-xs mt-1">
              SL: <strong>{quantity ?? "-"}</strong>
              {warehouseName ? ` · ${warehouseName}` : ""}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Quét để đối chiếu thùng khi nhập / xuất / chuyển kho.
          </p>
        </div>
        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1.5" /> Tải PNG
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5" /> In nhãn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
