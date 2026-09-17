"use client";
import { useState, useEffect, useCallback } from "react";
import { CronExpressionParser } from "cron-parser";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bot, Save } from "lucide-react";
import {
  agentJobsApi,
  apiErrorMessage,
  type AgentJobRow,
} from "@/lib/agentAdminApi";
import { toast } from "sonner";

/** Đếm ngược kỳ cron tới (cron chạy theo giờ UTC — Inngest chốt vậy). */
function nextRunAt(cron: string): Date | null {
  try {
    return CronExpressionParser.parse(cron, {
      currentDate: new Date(),
      tz: "UTC",
    })
      .next()
      .toDate();
  } catch {
    return null;
  }
}

function countdownText(target: Date, now: number): string {
  const ms = target.getTime() - now;
  if (ms <= 0) return "sắp chạy";
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `còn ${d} ngày ${h}h`;
  if (h > 0) return `còn ${h}h ${m}p`;
  return `còn ${m}p`;
}

function NextRun({
  cron,
  off,
  nowTs,
}: {
  cron: string;
  off: boolean;
  nowTs: number;
}) {
  if (off) {
    return (
      <span className="text-xs text-muted-foreground">tạm dừng (đang tắt)</span>
    );
  }
  const next = nextRunAt(cron);
  if (!next) return <span className="text-xs">—</span>;
  return (
    <>
      <div className="text-sm font-bold">{countdownText(next, nowTs)}</div>
      <div className="text-[11px] text-muted-foreground">
        {next.toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </>
  );
}

export default function AgentJobsPage() {
  const [rows, setRows] = useState<AgentJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchDrafts, setBatchDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  // Tick nhẹ mỗi 30s để đếm ngược "kỳ tới" (không fetch lại server).
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const list = await agentJobsApi.list();
      setRows(list);
      const drafts: Record<string, string> = {};
      for (const r of list) drafts[r.id] = String(r.batchSize);
      setBatchDrafts(drafts);
    } catch {
      toast.error("Không thể tải cấu hình agent jobs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleToggle = async (row: AgentJobRow, next: boolean) => {
    // Cập nhật lạc quan, lỗi thì reload lại từ server.
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id ? { ...r, enabled: next, effectiveOn: next && r.envOn } : r,
      ),
    );
    try {
      await agentJobsApi.update(row.id, { enabled: next });
      toast.success(next ? `Đã bật ${row.name}` : `Đã tắt ${row.name} (kỳ tới bỏ qua)`);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Lưu thất bại"));
      fetchRows();
    }
  };

  const handleSaveBatch = async (row: AgentJobRow) => {
    const n = Number.parseInt(batchDrafts[row.id] ?? "", 10);
    if (!Number.isSafeInteger(n) || n < 1 || n > 50) {
      toast.error("Batch phải là số nguyên 1–50");
      return;
    }
    setSaving((s) => ({ ...s, [row.id]: true }));
    try {
      await agentJobsApi.update(row.id, { batchSize: n });
      toast.success(`Đã lưu batch ${row.name} = ${n}`);
      fetchRows();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Lưu batch thất bại"));
    } finally {
      setSaving((s) => ({ ...s, [row.id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="w-6 h-6 text-[#fc4c00]" />
          Điều khiển Agent Jobs
        </h1>
        <p className="text-sm text-muted-foreground">
          Bật/tắt và chỉnh batch có hiệu lực ngay kỳ cron tới, không cần restart.
          Cron trong code chạy giờ UTC — cột Kỳ tới đã quy ra giờ VN (UTC+7).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jobs ({rows.length})</CardTitle>
          <CardDescription>
            Tắt ở đây = kỳ tới bỏ qua, 0 token. Tắt bằng env (server/.env) thì
            job biến mất khỏi Inngest (cần restart).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Đang tải...
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Cron (UTC)</TableHead>
                  <TableHead>Kỳ tới</TableHead>
                  <TableHead>Env boot</TableHead>
                  <TableHead>Chạy</TableHead>
                  <TableHead>Batch / lần</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {r.id}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px] line-clamp-3">
                        {r.description}
                      </p>
                      {!r.effectiveOn && (
                        <Badge variant="destructive" className="mt-1">
                          ĐANG TẮT
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.cron}
                    </TableCell>
                    <TableCell>
                      <NextRun cron={r.cron} off={!r.effectiveOn} nowTs={nowTs} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.envOn ? "secondary" : "destructive"}>
                        {r.envOn ? r.envKey + ": ON" : r.envKey + ": OFF"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={r.enabled}
                        disabled={!r.envOn}
                        title={
                          r.envOn
                            ? "Bật/tắt (hiệu lực ngay)"
                            : "Env đang OFF — bật trong server/.env + restart trước"
                        }
                        onCheckedChange={(next) => handleToggle(r, next)}
                      />
                    </TableCell>
                    <TableCell>
                      {r.batchLabel ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={50}
                            className="w-20"
                            disabled={!r.envOn}
                            title={
                              r.envOn
                                ? r.batchLabel
                                : "Env đang OFF — bật trong server/.env + restart trước, lưu lúc này vô nghĩa"
                            }
                            value={batchDrafts[r.id] ?? ""}
                            onChange={(e) =>
                              setBatchDrafts((d) => ({
                                ...d,
                                [r.id]: e.target.value,
                              }))
                            }
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!!saving[r.id] || !r.envOn}
                            onClick={() => handleSaveBatch(r)}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Lưu
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Quét toàn bộ (cố định)
                        </span>
                      )}
                      {r.batchLabel && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {r.batchLabel} · mặc định {r.defaultBatch}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
