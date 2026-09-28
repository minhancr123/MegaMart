/**
 * Công tắc bật/tắt từng agent job qua env.
 * Tắt = job không đăng ký vào registry → cron không bắn, dashboard không hiện.
 * Đổi env phải restart server (không hot-reload).
 *
 * JOB_PRODUCT_ENRICHMENT=true
 * JOB_FLASH_SALE=true
 * JOB_VOUCHER_GOVERNANCE=true
 * JOB_LOYALTY_NURTURE=true
 * JOB_RECOMMENDATION=true
 */
export function isJobEnabled(key: string, defaultOn = true): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return defaultOn;
  }
  return ["1", "true", "yes", "on"].includes(String(raw).trim().toLowerCase());
}
