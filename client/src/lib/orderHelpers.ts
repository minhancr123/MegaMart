interface ProcessableOrder {
    status: string;
    payments?: Array<{ provider: string; status?: string }>;
}

/** Đơn COD/trả sau (thu tiền khi giao). */
export const isCodOrder = (order: ProcessableOrder) =>
    (order.payments || []).some((p) => ["COD", "OTHER"].includes(String(p.provider)));

/**
 * Đơn có thể bấm "Tiến hành xử lý" ngay: đã PAID,
 * hoặc PENDING mà không còn nợ online (COD/OTHER/WALLET).
 * Khớp guard backend (chặn khi còn pending online).
 */
export const canFastProcess = (order: ProcessableOrder | null | undefined) => {
    if (!order) return false;
    if (order.status === "PAID") return true;
    if (order.status !== "PENDING") return false;
    return !(order.payments || []).some(
        (p) => !["COD", "OTHER", "WALLET"].includes(String(p.provider)) && p.status === "PENDING",
    );
};
