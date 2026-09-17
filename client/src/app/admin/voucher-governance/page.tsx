"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { ShieldCheck, Play, ScrollText } from "lucide-react";
import {
  voucherGovernanceApi,
  apiErrorMessage,
  type GovProposal,
} from "@/lib/agentAdminApi";
import { toast } from "sonner";

const ACTION_LABEL: Record<GovProposal["action"], string> = {
  extend: "Gia hạn",
  add_quota: "Thêm lượt",
  lower_min: "Hạ đơn tối thiểu",
  close_proposal: "Thu hồi (tắt)",
};

const fmtMoney = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(n);

function describeEffect(p: GovProposal): string {
  const params = p.params ?? {};
  switch (p.action) {
    case "extend":
      return `Cộng thêm ${params.days ?? "?"} ngày hiệu lực cho ${p.code}`;
    case "add_quota":
      return `Cộng thêm ${params.addQuota ?? "?"} lượt dùng cho ${p.code}`;
    case "lower_min":
      return `Hạ đơn tối thiểu của ${p.code} xuống ${fmtMoney(params.newMin)}`;
    case "close_proposal":
      return `Tắt voucher ${p.code} (ngừng áp dụng ngay)`;
    default:
      return "Đề xuất không xác định — kiểm tra audit log trước khi xử lý";
  }
}

/** Chỉ cho bấm Áp dụng khi đủ params (tránh server áp giá trị mặc định âm thầm). */
function canApply(p: GovProposal): boolean {
  const params = p.params ?? {};
  switch (p.action) {
    case "extend":
      return (params.days ?? 0) > 0;
    case "add_quota":
      return (params.addQuota ?? 0) > 0;
    case "lower_min":
      return (params.newMin ?? 0) > 0;
    case "close_proposal":
      return true;
    default:
      return false;
  }
}

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString("vi-VN") : "—";

export default function VoucherGovernancePage() {
  const [rows, setRows] = useState<GovProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyId, setApplyId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true);
      setRows(await voucherGovernanceApi.proposals());
    } catch {
      toast.error("Không thể tải đề xuất governance");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleConfirm = async () => {
    if (!applyId) return;
    setProcessing(true);
    try {
      const out = await voucherGovernanceApi.apply(applyId);
      if (out?.applied) {
        toast.success("Đã áp dụng đề xuất");
      } else {
        toast.error(
          out?.reason === "ALREADY_APPLIED"
            ? "Đề xuất này đã được áp dụng trước đó"
            : "Không áp dụng được",
        );
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, "Áp dụng thất bại"));
    } finally {
      setProcessing(false);
      setApplyId(null);
      // Đồng bộ lại kể cả khi lỗi (vd 409 tranh chấp) để nút không còn hiện sai.
      fetchProposals();
    }
  };

  const target = rows.find((r) => r.auditId === applyId);
  const pending = rows.filter((r) => !r.applied);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#fc4c00]" />
          Kiểm toán Voucher AI
        </h1>
        <p className="text-sm text-muted-foreground">
          Agent quét voucher mỗi đêm — đề xuất chỉ có hiệu lực khi bạn bấm Áp dụng (1 lần duy nhất)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Đề xuất chờ xử lý ({pending.length}/{rows.length})
          </CardTitle>
          <CardDescription>
            Gia hạn / thêm lượt / hạ điều kiện / thu hồi — voucher hết hạn & hết quota job đã tự tắt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Đang tải...
            </p>
          ) : rows.length === 0 ? (
            <AdminEmptyState
              icon={ScrollText}
              title="Không có đề xuất"
              description="Hệ thống voucher đang khỏe, agent chưa đề xuất gì."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Đề xuất</TableHead>
                  <TableHead>Lý do (AI)</TableHead>
                  <TableHead>Ngày đề xuất</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.auditId}>
                    <TableCell className="font-mono text-xs font-bold">
                      {p.code}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ACTION_LABEL[p.action] ?? p.action}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {describeEffect(p)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <p className="text-xs line-clamp-3">{p.reason}</p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {fmtDate(p.createdAt)}
                    </TableCell>
                    <TableCell>
                      {p.applied ? (
                        <Badge variant="secondary">Đã áp dụng</Badge>
                      ) : (
                        <Badge>Chờ xử lý</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!p.applied && canApply(p) ? (
                        <Button size="sm" onClick={() => setApplyId(p.auditId)}>
                          <Play className="w-4 h-4 mr-1" />
                          Áp dụng
                        </Button>
                      ) : !p.applied ? (
                        <span
                          className="text-xs text-muted-foreground"
                          title="Thiếu tham số — kiểm tra audit log"
                        >
                          Thiếu tham số
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={applyId !== null}
        onOpenChange={(open) => {
          if (!open) setApplyId(null);
        }}
        onConfirm={handleConfirm}
        title="Áp dụng đề xuất?"
        description={
          target
            ? `${describeEffect(target)}. Chỉ áp dụng 1 lần, ghi audit theo tài khoản của bạn.`
            : undefined
        }
        confirmText="Áp dụng"
        variant={target?.action === "close_proposal" ? "destructive" : "default"}
        isLoading={processing}
      />
    </div>
  );
}
