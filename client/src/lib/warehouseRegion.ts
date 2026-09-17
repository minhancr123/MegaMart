export type RegionTone = "north" | "central" | "south" | "unknown";

export interface WarehouseRegion {
  label: string;
  tone: RegionTone;
}

/**
 * Suy miền từ mã/tên/địa chỉ kho (DB chưa có cột region riêng).
 * KHO-HN -> Bắc, KHO-DN -> Trung, KHO-HCM/KHO-CT -> Nam.
 */
export function getWarehouseRegion(
  warehouse?: { code?: string | null; name?: string | null; address?: string | null } | null,
): WarehouseRegion {
  const code = (warehouse?.code || "").toUpperCase();
  if (/(^|-)HN(-|$)/.test(code)) return { label: "Miền Bắc", tone: "north" };
  if (/(^|-)DN(-|$)/.test(code)) return { label: "Miền Trung", tone: "central" };
  if (/(^|-)(HCM|CT|SGN)(-|$)/.test(code)) return { label: "Miền Nam", tone: "south" };

  const text = `${warehouse?.name || ""} ${warehouse?.address || ""}`.toLowerCase();
  if (
    text.includes("hà nội") || text.includes("ha noi") ||
    text.includes("hải phòng") || text.includes("hai phong")
  ) {
    return { label: "Miền Bắc", tone: "north" };
  }
  if (
    text.includes("đà nẵng") || text.includes("da nang") ||
    text.includes("huế") || text.includes("miền trung")
  ) {
    return { label: "Miền Trung", tone: "central" };
  }
  if (
    text.includes("hồ chí minh") || text.includes("ho chi minh") ||
    text.includes("sài gòn") || text.includes("sai gon") ||
    text.includes("cần thơ") || text.includes("can tho") ||
    text.includes("miền nam")
  ) {
    return { label: "Miền Nam", tone: "south" };
  }
  return { label: "Chưa rõ", tone: "unknown" };
}

const TONE_CLASS: Record<RegionTone, string> = {
  north: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  central: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  south: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
  unknown: "bg-muted text-muted-foreground border-border",
};

export function regionBadgeClass(tone: RegionTone): string {
  return TONE_CLASS[tone];
}
