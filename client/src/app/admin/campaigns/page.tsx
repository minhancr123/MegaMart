"use client";

import { useEffect, useState } from "react";
import { Megaphone, Loader2, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_TRIGGER_LABELS, CAMPAIGN_TYPE_LABELS, campaignApi, type MarketingCampaign } from "@/lib/marketingCampaignApi";
import { CRM_SEGMENT_LABELS } from "@/lib/crmApi";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

const SEGMENTS = ["NEW", "POTENTIAL", "LOYAL", "CHAMPION", "AT_RISK", "DORMANT"];

export default function CampaignsPage() {
  const [items, setItems] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "Chiến dịch giữ chân khách hàng",
    type: "VOUCHER",
    trigger: "MANUAL",
    targetSegment: "AT_RISK",
    rewardType: "FIXED",
    rewardValue: "50000",
    minHealthScore: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      setItems(await campaignApi.list());
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Không tải được chiến dịch"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const rewardLabel = form.type === "LOYALTY_POINTS" ? "Số điểm thưởng" : form.rewardType === "PERCENT" ? "Giá trị (% giảm)" : "Giá trị (VNĐ)";
  const rewardPlaceholder = form.type === "LOYALTY_POINTS" ? "VD: 100 điểm" : form.rewardType === "PERCENT" ? "VD: 10 (1% - 100%)" : "VD: 50000 (VNĐ)";
  const rewardStep = form.type === "LOYALTY_POINTS" || form.rewardType === "PERCENT" ? 1 : 1000;

  const createCampaign = async () => {
    if (!form.name.trim()) return toast.error("Nhập tên chiến dịch");
    const rewardValue = Number(form.rewardValue || 0);
    if (form.rewardType === "PERCENT" && (rewardValue < 1 || rewardValue > 100)) return toast.error("Phần trăm giảm phải từ 1 đến 100");
    if (form.type === "VOUCHER" && form.rewardType === "FIXED" && rewardValue < 1000) return toast.error("Mã giảm tiền cần tối thiểu 1.000đ");
    if (form.type === "LOYALTY_POINTS" && rewardValue < 1) return toast.error("Điểm thưởng phải lớn hơn 0");
    if (form.minHealthScore && (Number(form.minHealthScore) < 0 || Number(form.minHealthScore) > 100)) return toast.error("Sức khỏe tối đa phải từ 0 đến 100");
    try {
      setSaving(true);
      await campaignApi.create({
        name: form.name.trim(),
        type: form.type as any,
        trigger: form.trigger as any,
        targetSegment: form.targetSegment,
        rewardType: form.type === "VOUCHER" ? form.rewardType : undefined,
        rewardValue,
        minHealthScore: form.minHealthScore ? Number(form.minHealthScore) : undefined,
        status: form.trigger === "HEALTH_DROP" ? "ACTIVE" : undefined,
      });
      toast.success("Đã tạo chiến dịch");
      await load();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Tạo chiến dịch thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item: MarketingCampaign) => {
    try {
      const next = item.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      await campaignApi.updateStatus(item.id, next);
      toast.success(next === "ACTIVE" ? "Đã bật tự động" : "Đã tạm dừng chiến dịch");
      await load();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Không đổi được trạng thái"));
    }
  };

  const executeCampaign = async (id: string) => {
    try {
      setExecutingId(id);
      const res = await campaignApi.execute(id);
      toast.success(`Đã chạy chiến dịch cho ${res.targetedCount || res.successCount || 0} khách`);
      await load();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Chạy chiến dịch thất bại"));
    } finally {
      setExecutingId(null);
    }
  };

  if (loading) {
    return <div className="flex flex-col items-center justify-center py-32 gap-3"><Loader2 className="h-9 w-9 animate-spin text-primary" /><p className="text-sm font-bold text-zinc-500">Đang tải chiến dịch...</p></div>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Trung tâm chiến dịch"
        description="Tạo chiến dịch giữ chân khách hàng bằng mã giảm giá hoặc điểm thưởng theo phân khúc."
      />

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" /> Tạo chiến dịch nhanh</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2 xl:col-span-2"><Label>Tên chiến dịch</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid gap-2"><Label>Loại quà tặng</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="VOUCHER">Mã giảm giá</SelectItem><SelectItem value="LOYALTY_POINTS">Điểm thưởng</SelectItem></SelectContent></Select></div>
          <div className="grid gap-2"><Label>Cách chạy</Label><Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MANUAL">Chạy thủ công</SelectItem><SelectItem value="HEALTH_DROP">Khi sức khỏe giảm</SelectItem><SelectItem value="BIRTHDAY">Sinh nhật</SelectItem></SelectContent></Select></div>
          <div className="grid gap-2"><Label>Phân khúc</Label><Select value={form.targetSegment} onValueChange={(v) => setForm({ ...form, targetSegment: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SEGMENTS.map((s) => <SelectItem key={s} value={s}>{CRM_SEGMENT_LABELS[s]}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2"><Label>Kiểu mã giảm</Label><Select disabled={form.type !== "VOUCHER"} value={form.rewardType} onValueChange={(v) => setForm({ ...form, rewardType: v, rewardValue: v === "PERCENT" && Number(form.rewardValue) > 100 ? "10" : form.rewardValue })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="FIXED">Giảm tiền cố định</SelectItem><SelectItem value="PERCENT">Giảm theo %</SelectItem></SelectContent></Select></div>
          <div className="grid gap-2"><Label>{rewardLabel}</Label><Input type="number" min={1} max={form.rewardType === "PERCENT" ? 100 : undefined} step={rewardStep} value={form.rewardValue} onChange={(e) => setForm({ ...form, rewardValue: e.target.value })} placeholder={rewardPlaceholder} /></div>
          <div className="grid gap-2"><Label>Sức khỏe tối đa</Label><Input type="number" value={form.minHealthScore} onChange={(e) => setForm({ ...form, minHealthScore: e.target.value })} placeholder="VD: 40" /></div>
          <div className="flex items-end"><Button onClick={createCampaign} disabled={saving} className="w-full"><Plus className="mr-2 h-4 w-4" />{saving ? "Đang tạo..." : "Tạo chiến dịch"}</Button></div>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader className="bg-muted/50"><TableRow><TableHead>Tên chiến dịch</TableHead><TableHead>Loại</TableHead><TableHead>Cách chạy</TableHead><TableHead>Phân khúc</TableHead><TableHead>Trạng thái</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
          <TableBody>
            {!items.length ? <TableRow><TableCell colSpan={6} className="p-0"><AdminEmptyState title="Chưa có chiến dịch nào" description="Tạo chiến dịch đầu tiên để giữ chân khách hàng." /></TableCell></TableRow> : items.map((item) => (
              <TableRow key={item.id}>
                <TableCell><div className="font-bold">{item.name}</div><div className="text-xs text-zinc-500">Đã chạy: {item._count?.history || 0} khách</div></TableCell>
                <TableCell>{CAMPAIGN_TYPE_LABELS[item.type]}</TableCell>
                <TableCell>{CAMPAIGN_TRIGGER_LABELS[item.trigger]}</TableCell>
                <TableCell>{item.targetSegment ? CRM_SEGMENT_LABELS[item.targetSegment] : "Tất cả"}</TableCell>
                <TableCell><Badge variant={item.status === "COMPLETED" ? "success" : item.status === "ACTIVE" ? "info" : "secondary"}>{CAMPAIGN_STATUS_LABELS[item.status]}</Badge></TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => executeCampaign(item.id)} disabled={executingId === item.id || item.status === "COMPLETED"}>{executingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="mr-1 h-3.5 w-3.5" />Chạy ngay</>}</Button>{item.trigger === "HEALTH_DROP" && item.status !== "COMPLETED" && <Button size="sm" variant="ghost" onClick={() => toggleStatus(item)}>{item.status === "ACTIVE" ? "Tạm dừng" : "Bật tự động"}</Button>}</div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
