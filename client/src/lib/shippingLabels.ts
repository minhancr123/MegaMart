/** Nhãn tiếng Việt dùng chung cho trạng thái vận chuyển GHN. */

type BadgeTone = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";

const SHIPPING_STATUS_NAMES: Record<string, string> = {
  // Lấy hàng
  ready_to_pick: "Chờ lấy hàng",
  picking: "Đang lấy hàng",
  picked: "Đã lấy hàng",
  money_collect_picking: "Đang thu tiền lấy hàng",
  // Lưu kho / luân chuyển
  storing: "Lưu kho",
  transporting: "Đang luân chuyển",
  sorting: "Đang phân loại",
  // Giao hàng
  delivering: "Đang giao hàng",
  money_collect_delivering: "Đang thu tiền giao hàng",
  delivered: "Giao thành công",
  // Sự cố
  delivery_fail: "Giao thất bại",
  exception: "Ngoại lệ",
  damage: "Hư hỏng",
  lost: "Thất lạc",
  // Trả hàng / hoàn hàng
  waiting_to_return: "Chờ trả hàng",
  return: "Trả hàng",
  return_transporting: "Đang luân chuyển trả hàng",
  return_sorting: "Đang phân loại trả hàng",
  returning: "Đang hoàn hàng",
  return_fail: "Hoàn hàng thất bại",
  returned: "Đã hoàn hàng",
  // Hủy vận đơn
  cancel: "Đã hủy vận đơn",
  cancelled: "Đã hủy vận đơn",
  // Event nội bộ của MegaMart
  note: "Ghi chú vận hành",
  pod: "Ảnh xác nhận giao hàng",
};

function normalizeStatus(status?: string | null): string {
  return (status || "").toLowerCase().trim();
}

/** Mã trạng thái GHN -> nhãn tiếng Việt. Mã lạ giữ nguyên để không mất thông tin. */
export function shippingStatusName(status?: string | null): string {
  if (!status) return "Chưa có";
  const key = normalizeStatus(status);
  return SHIPPING_STATUS_NAMES[key] || status;
}

const SUCCESS_STATUSES = new Set(["delivered", "returned"]);
const DANGER_STATUSES = new Set(["lost", "damage", "cancel", "cancelled", "return_fail"]);
const WARNING_STATUSES = new Set(["delivery_fail", "waiting_to_return", "exception", "returning", "return", "return_transporting", "return_sorting"]);
const INFO_STATUSES = new Set(["picking", "picked", "delivering", "transporting", "sorting", "money_collect_picking", "money_collect_delivering"]);

/** Tone màu badge theo nhóm trạng thái vận chuyển. */
export function shippingStatusBadgeTone(status?: string | null): BadgeTone {
  const key = normalizeStatus(status);
  if (!key) return "secondary";
  if (SUCCESS_STATUSES.has(key)) return "success";
  if (DANGER_STATUSES.has(key)) return "destructive";
  if (WARNING_STATUSES.has(key)) return "warning";
  if (INFO_STATUSES.has(key)) return "info";
  return "secondary";
}
