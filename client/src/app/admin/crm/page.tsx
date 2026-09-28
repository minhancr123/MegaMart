"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Award, Loader2, Tag, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CRM_SEGMENT_LABELS, crmApi, getCrmSegmentLabel, type CrmCustomer, type CustomerTag } from "@/lib/crmApi";
import { toast } from "sonner";
import { formatPrice, getErrorMessage } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

type DashboardData = {
  totalCustomers: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  bySegment: Record<string, number>;
  atRiskCount: number;
};

const SEGMENTS = ["ALL", "NEW", "POTENTIAL", "LOYAL", "CHAMPION", "AT_RISK", "DORMANT"];

export default function AdminCrmPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("ALL");
  const [tagId, setTagId] = useState("ALL");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkTagId, setBulkTagId] = useState("");
  const [bulkPoints, setBulkPoints] = useState("");
  const [voucherValue, setVoucherValue] = useState("");

  const load = async () => {
    if (!data) setLoading(true);
    try {
      const [dashboard, tagsData, customerData] = await Promise.all([
        crmApi.dashboard(),
        crmApi.getTags(),
        crmApi.listCustomers({
          page: 1,
          limit: 50,
          search: search || undefined,
          segment: segment !== "ALL" ? segment : undefined,
          tagId: tagId !== "ALL" ? tagId : undefined,
        }),
      ]);
      setData(dashboard);
      setTags(tagsData);
      setCustomers(customerData.items || []);
      setSelected([]);
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Không thể tải dữ liệu CRM"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-zinc-500 animate-pulse">Đang chuẩn bị dữ liệu khách hàng...</p>
      </div>
    );
  }

  const toggleSelected = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const runBulkTag = async () => {
    if (!selected.length || !bulkTagId) return toast.error("Chọn khách hàng và nhãn");
    try {
      const res = await crmApi.bulkTag({ userIds: selected, tagId: bulkTagId });
      res.successCount > 0 ? toast.success(`Đã gắn nhãn cho ${res.successCount} khách`) : toast.error("Không gắn nhãn được khách nào");
      setBulkTagId("");
      load();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Gắn nhãn hàng loạt thất bại"));
    }
  };

  const runBulkPoints = async () => {
    if (!selected.length || !bulkPoints) return toast.error("Chọn khách hàng và nhập điểm");
    try {
      const res = await crmApi.bulkPoints({ userIds: selected, amount: Number(bulkPoints), reason: "Điều chỉnh hàng loạt từ CRM" });
      res.successCount > 0 ? toast.success(`Đã điều chỉnh điểm cho ${res.successCount} khách`) : toast.error("Không điều chỉnh được khách nào");
      setBulkPoints("");
      load();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Điều chỉnh điểm hàng loạt thất bại"));
    }
  };

  const runBulkVoucher = async () => {
    if (!selected.length || !voucherValue) return toast.error("Chọn khách hàng và nhập giá trị voucher");
    try {
      const res = await crmApi.issuePersonalVouchers({ userIds: selected, title: "Mã giảm giá chăm sóc khách hàng", type: "FIXED", value: Number(voucherValue) });
      res.successCount > 0 ? toast.success(`Đã cấp voucher riêng cho ${res.successCount} khách`) : toast.error("Không cấp được voucher nào");
      setVoucherValue("");
      setSelected([]);
      load();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Cấp voucher thất bại"));
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý quan hệ khách hàng"
        description="Theo dõi sức khỏe khách hàng, phân khúc RFM và rủi ro rời bỏ."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Khách hàng" value={(data?.totalCustomers || 0).toLocaleString("vi-VN")} />
        <MetricCard icon={TrendingUp} label="Doanh thu khách hàng" value={formatPrice(data?.totalRevenue || 0, "0 ₫")} />
        <MetricCard icon={Award} label="Giá trị đơn trung bình" value={formatPrice(Math.round(data?.averageOrderValue || 0), "0 ₫")} />
        <MetricCard icon={Activity} label="Nguy cơ rời bỏ" value={(data?.atRiskCount || 0).toLocaleString("vi-VN")} danger />
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle>Phân bổ phân khúc</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {Object.entries(data?.bySegment || {}).length === 0 ? (
            <p className="text-sm text-zinc-400">Chưa đủ dữ liệu phân khúc.</p>
            ) : Object.entries(data?.bySegment || {}).map(([name, count]) => (
            <Badge key={name} variant="outline" className="rounded-full px-4 py-2 text-sm">{getCrmSegmentLabel(name)}: {count}</Badge>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-5 space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px_auto]">
            <Input placeholder="Tìm khách hàng..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SEGMENTS.map((s) => <SelectItem key={s} value={s}>{CRM_SEGMENT_LABELS[s] || s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={tagId} onValueChange={setTagId}>
              <SelectTrigger><SelectValue placeholder="Lọc nhãn" /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">Tất cả nhãn</SelectItem>{tags.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={load} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lọc</Button>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl border border-orange-100 bg-orange-50 p-3 lg:flex-row lg:items-center">
              <span className="text-sm font-bold text-primary">Đã chọn {selected.length} khách</span>
              <Select value={bulkTagId} onValueChange={setBulkTagId}>
                <SelectTrigger className="bg-white lg:w-56"><SelectValue placeholder="Gắn nhãn hàng loạt" /></SelectTrigger>
                <SelectContent>{tags.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={runBulkTag} variant="outline" className="bg-white"><Tag className="mr-2 h-4 w-4" />Gắn nhãn</Button>
              <Input className="bg-white lg:w-40" type="number" placeholder="Điểm +/-" value={bulkPoints} onChange={(e) => setBulkPoints(e.target.value)} />
              <Button onClick={runBulkPoints} variant="outline" className="bg-white"><Award className="mr-2 h-4 w-4" />Tặng/trừ điểm</Button>
              <Input className="bg-white lg:w-44" type="number" placeholder="Giá trị mã giảm" value={voucherValue} onChange={(e) => setVoucherValue(e.target.value)} />
              <Button onClick={runBulkVoucher} variant="outline" className="bg-white">Cấp mã giảm riêng</Button>
            </div>
          )}

          <div className={`overflow-hidden rounded-2xl border relative ${loading ? "opacity-50" : ""}`}>
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/30 backdrop-blur-[1px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <Table>
              <TableHeader className="bg-muted/50"><TableRow><TableHead className="w-10"></TableHead><TableHead>Khách hàng</TableHead><TableHead>Phân khúc</TableHead><TableHead>Sức khỏe</TableHead><TableHead>Chi tiêu</TableHead><TableHead>Tag</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelected(c.id)} /></TableCell>
                    <TableCell><div className="font-bold">{c.name || "Khách hàng"}</div><div className="text-xs text-zinc-500">{c.email}</div></TableCell>
                    <TableCell><Badge variant="outline" className="rounded-full">{getCrmSegmentLabel(c.segment)}</Badge></TableCell>
                    <TableCell><Badge className={c.healthScore < 40 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}>{c.healthScore}/100</Badge></TableCell>
                    <TableCell className="font-bold">{formatPrice(c.totalSpent, "0 ₫")}</TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{c.tags?.map((t) => <Badge key={t.id} variant="outline" style={{ color: t.color, borderColor: t.color }}>{t.name}</Badge>)}</div></TableCell>
                    <TableCell className="text-right"><Link href={`/admin/users/${c.id}`}><Button size="sm" variant="ghost">Xem hồ sơ</Button></Link></TableCell>
                  </TableRow>
                ))}
                {!customers.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-zinc-400">Không có khách phù hợp</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, danger }: any) {
  return (
    <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`grid h-11 w-11 place-items-center rounded-2xl ${danger ? "bg-red-50 text-red-600" : "bg-orange-50 text-primary"}`}><Icon className="h-5 w-5" /></div>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-zinc-400">{label}</p>
        <p className="mt-1 text-2xl font-black text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  );
}
