# Chính sách giao hàng: GHN vs Shipper nhà

> Chốt ngày 24/09/2026 — **Shipper nhà làm chuẩn trạng thái đơn.**
> Webhook GHN ở chế độ timeline-only (`GHN_WEBHOOK_STATUS_SYNC=false`).

## 1. Khi nào dùng GHN

| Trường hợp | Cách làm |
|---|---|
| Giao **liên tỉnh / xa** (ngoài phạm vi shipper nhà chạy) | Admin tạo vận đơn GHN ở bước `CONFIRMED`, in tem, bàn giao theo mã vận đơn. Webhook GHN chỉ ghi timeline tham khảo. |
| Cần mã vận đơn để khách tự tra cứu trên trang GHN | Dùng mã `shippingOrderCode`, nút "Theo dõi trên GHN". |
| Muốn GHN tự đẩy trạng thái đơn (hành vi cũ) | Bật `GHN_WEBHOOK_STATUS_SYNC=true` trong `server/.env` rồi restart server. |

## 2. Khi nào dùng shipper nhà

| Trường hợp | Cách làm |
|---|---|
| Giao **nội thành / nội tỉnh** (mặc định của shop) | Không cần tạo mã GHN. Admin bấm bàn giao → đơn sang `SHIPPING`, hệ thống tự gán shipper rảnh. |
| Khách hẹn giờ / giao gấp / thu COD trực tiếp | Shipper nhận đơn ở app `/shipper`, bấm GPS, chụp POD khi giao xong. |
| Đơn có sự cố (boom hàng, hẹn lại, lạc địa chỉ) | Shipper ghi chú/sự cố ngay trên đơn; admin thấy trên timeline. |

## 3. Ai được đổi trạng thái đơn (nguồn chuẩn)

| Hành động | Ai làm | Ghi nhận ở đâu |
|---|---|---|
| `PAID → PROCESSING` (tiến hành xử lý) | Admin (nút "Tiến hành xử lý") | `orderStatusHistory` + tự gán shipper + event timeline |
| Bàn giao `→ SHIPPING` | Admin (có/không mã GHN đều được) | `orderStatusHistory` + event timeline |
| GPS / ghi chú / sự cố | Shipper (app `/shipper`) | `shippingMetadata` + `ShipmentEvent` |
| `SHIPPING → DELIVERED` + thu COD | Shipper chụp POD (hoặc admin bấm tay) | `orderStatusHistory` "Thu COD thành công" + mail biên lai |
| `DELIVERED → COMPLETED` | Khách bấm "Đã nhận hàng" (`POST /orders/:id/confirm-receipt`) | `orderStatusHistory` + event timeline |
| Hủy / thất bại / hoàn tiền | Khách / admin | `orderStatusHistory` + event timeline |

## 4. Vai trò của webhook GHN (chế độ hiện tại)

- ✅ Ghi mọi mốc GHN vào timeline (bưu cục nhận, đang luân chuyển, phát thất bại...).
- ✅ Cập nhật ngày dự kiến + payload raw để đối soát.
- ❌ **Không** tự đổi `order.status`.
- ❌ **Không** tự đánh COD đã thu.
- ❌ **Không** báo `delivered` lên badge khi đơn chưa `DELIVERED`/`COMPLETED` thật.

## 5. Quy tắc tiền COD

- COD chỉ chuyển `PENDING → PAID` **trong cùng transaction** với `SHIPPING → DELIVERED`, kèm lịch sử "Thu COD thành công" cho kế toán đối soát.
- Tuyệt đối không đánh PAID khi chuyển trạng thái thất bại.
