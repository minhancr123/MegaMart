# Cải thiện Quản lý Trạng thái Đơn hàng

## ⚠️ Vấn đề hiện tại

### 1. Trạng thái không đủ
```
PENDING → PAID/FAILED/CANCELED
```
❌ Thiếu: Xác nhận đơn, Đang xử lý, Đang giao, Đã giao

### 2. Không có validation chuyển trạng thái
```typescript
// Hiện tại: Có thể chuyển bất kỳ trạng thái nào
updateOrderStatus(id, { status: 'DELIVERED' }) // OK từ PENDING → DELIVERED ❌
```

### 3. Không restore stock khi hủy
```typescript
cancelOrder() {
  // Chỉ update status = CANCELED
  // Không trả lại stock cho variants ❌
}
```

### 4. Không có audit trail
- Không biết ai đổi trạng thái khi nào
- Không có lý do hủy đơn

---

## ✅ Giải pháp

### 1. Thêm trạng thái mới (schema.prisma)
```prisma
enum OrderStatus {
  PENDING       // Chờ xác nhận
  CONFIRMED     // Đã xác nhận (admin confirm)
  PROCESSING    // Đang chuẩn bị hàng
  SHIPPING      // Đang giao hàng
  DELIVERED     // Đã giao thành công
  COMPLETED     // Hoàn thành (customer confirm)
  CANCELED      // Đã hủy
  FAILED        // Thanh toán thất bại
  REFUNDED      // Đã hoàn tiền
}
```

### 2. State Machine - Luồng chuyển trạng thái hợp lệ
```typescript
const VALID_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELED', 'FAILED'],
  CONFIRMED: ['PROCESSING', 'CANCELED'],
  PROCESSING: ['SHIPPING', 'CANCELED'],
  SHIPPING: ['DELIVERED', 'FAILED'],
  DELIVERED: ['COMPLETED', 'REFUNDED'],
  COMPLETED: ['REFUNDED'],
  CANCELED: [], // Terminal state
  FAILED: ['PENDING'], // Retry payment
  REFUNDED: [] // Terminal state
}
```

### 3. Restore stock khi hủy
```typescript
async cancelOrder(orderId, userId, reason?) {
  // 1. Validate can cancel
  // 2. Update status
  // 3. Restore stock cho từng variant
  for (const item of order.items) {
    await prisma.variant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } }
    });
  }
  // 4. Log reason
}
```

### 4. Thêm OrderStatusHistory table
```prisma
model OrderStatusHistory {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id])
  
  fromStatus OrderStatus?
  toStatus   OrderStatus
  
  changedBy  String?  // Admin/System ID
  reason     String?  // Lý do thay đổi
  note       String?  // Ghi chú
  
  createdAt  DateTime @default(now())
  
  @@index([orderId])
}
```

### 5. Validation logic
```typescript
async updateOrderStatus(orderId, newStatus, userId?, reason?) {
  const order = await findOrder(orderId);
  
  // Validate transition
  if (!canTransition(order.status, newStatus)) {
    throw new BadRequestException(
      `Không thể chuyển từ ${order.status} sang ${newStatus}`
    );
  }
  
  // Special handling
  if (newStatus === 'CANCELED' || newStatus === 'REFUNDED') {
    await restoreStock(order);
  }
  
  if (newStatus === 'DELIVERED') {
    await sendNotification(order.user, 'Đơn hàng đã giao');
  }
  
  // Update + log history
  await Promise.all([
    prisma.order.update({ where: { id: orderId }, data: { status: newStatus } }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        changedBy: userId,
        reason
      }
    })
  ]);
}
```

---

## 📊 Luồng đơn hàng hoàn chỉnh

### A. COD (Thanh toán khi nhận hàng)
```
PENDING (User đặt)
  ↓ [Admin xác nhận]
CONFIRMED
  ↓ [Đóng gói]
PROCESSING
  ↓ [Giao cho shipper]
SHIPPING
  ↓ [Giao thành công + thu tiền]
DELIVERED
  ↓ [Customer xác nhận]
COMPLETED
```

### B. Online Payment
```
PENDING (User đặt)
  ↓ [Payment gateway callback]
PAID → CONFIRMED
  ↓
PROCESSING → SHIPPING → DELIVERED → COMPLETED
```

### C. Hủy đơn
```
PENDING/CONFIRMED/PROCESSING
  ↓ [User/Admin cancel]
CANCELED (+ restore stock)
```

### D. Hoàn tiền
```
DELIVERED
  ↓ [Customer yêu cầu hoàn]
REFUNDED (+ restore stock + refund payment)
```

---

## 🔧 Implementation Steps

1. **Update Schema**
   - Thêm OrderStatus mới
   - Tạo OrderStatusHistory table
   - Run migration

2. **Update Service**
   - Implement canTransition()
   - Implement restoreStock()
   - Update updateOrderStatus() với validation
   - Update cancelOrder() với restore stock

3. **Update Admin UI**
   - Dropdown status chỉ show valid transitions
   - Form nhập lý do khi cancel/refund
   - Hiển thị history timeline

4. **Notifications**
   - Email khi status thay đổi
   - Push notification cho mobile app

---

## 🎯 Priority

1. **High**: Thêm trạng thái CONFIRMED, PROCESSING, SHIPPING, DELIVERED
2. **High**: Implement state transition validation
3. **High**: Restore stock khi cancel
4. **Medium**: OrderStatusHistory table
5. **Low**: Advanced notifications
