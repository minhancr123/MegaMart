/**
 * Badge trạng thái dùng chung cho module Inventory / Supplier.
 * Luôn có dark mode variants để không bị chói khi bật theme tối.
 */

export const PO_STATUS_STYLE: Record<string, string> = {
  DRAFT:
    "bg-zinc-100 text-zinc-600 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  SENT: "bg-blue-50 text-blue-700 border-blue-200 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
  PARTIAL:
    "bg-amber-50 text-amber-700 border-amber-200 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  COMPLETED:
    "bg-green-50 text-green-700 border-green-200 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300",
  CANCELLED:
    "bg-red-50 text-red-500 border-red-200 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
};

/** Nhãn PO nhìn từ phía Admin (kho MegaMart). */
export const PO_STATUS_LABEL_ADMIN: Record<string, string> = {
  DRAFT: "Nháp",
  SENT: "Đã gửi NCC",
  PARTIAL: "Nhập một phần",
  COMPLETED: "Nhập đủ",
  CANCELLED: "Đã hủy",
};

/** Nhãn PO nhìn từ phía Nhà cung cấp (cổng /supplier). */
export const PO_STATUS_LABEL_SUPPLIER: Record<string, string> = {
  DRAFT: "Nháp",
  SENT: "Mới (chờ xác nhận)",
  PARTIAL: "Nhập một phần",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const STOCK_MOVEMENT_STATUS_STYLE: Record<string, string> = {
  PENDING:
    "bg-zinc-100 text-zinc-600 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  COMPLETED:
    "bg-green-50 text-green-700 border-green-200 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300",
  CANCELLED:
    "bg-red-50 text-red-500 border-red-200 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
};

export const STOCK_MOVEMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ xử lý",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const PALLET_STATUS_STYLE: Record<string, string> = {
  ACTIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  EMPTY:
    "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  LOCKED:
    "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
};

export const PALLET_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Đang dùng",
  EMPTY: "Trống",
  LOCKED: "Đang khóa",
};
