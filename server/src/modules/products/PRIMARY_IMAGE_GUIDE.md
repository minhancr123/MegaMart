# Hướng dẫn cập nhật ảnh chính (Primary Image) cho sản phẩm

## Tổng quan

Khi cập nhật sản phẩm, bạn có thể chọn ảnh nào sẽ được hiển thị làm ảnh chính trên trang chủ bằng cách sử dụng flag `isPrimary`.

## Cách sử dụng

### 1. Sử dụng mảng URL đơn giản (cách cũ - tương thích ngược)

Ảnh đầu tiên sẽ tự động trở thành ảnh chính:

```json
{
  "name": "iPhone 15 Pro Max",
  "images": [
    "https://example.com/image1.jpg",  // ← Ảnh này sẽ là ảnh chính
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg"
  ]
}
```

### 2. Sử dụng mảng đối tượng với flag `isPrimary`

Bạn có thể chỉ định ảnh nào là ảnh chính:

```json
{
  "name": "iPhone 15 Pro Max",
  "images": [
    {
      "url": "https://example.com/image1.jpg",
      "alt": "Mặt trước iPhone",
      "isPrimary": false,
      "displayOrder": 0
    },
    {
      "url": "https://example.com/image2.jpg",
      "alt": "Mặt sau iPhone",
      "isPrimary": true,  // ← Ảnh này sẽ là ảnh chính
      "displayOrder": 1
    },
    {
      "url": "https://example.com/image3.jpg",
      "alt": "Góc nghiêng",
      "isPrimary": false,
      "displayOrder": 2
    }
  ]
}
```

### 3. Sử dụng `primaryImageId` để chọn ảnh có sẵn làm ảnh chính

Nếu bạn không muốn xóa và tạo lại ảnh, có thể chỉ định ID của ảnh có sẵn:

```json
{
  "name": "iPhone 15 Pro Max",
  "primaryImageId": "clxxx1234567890abcdef"  // ← ID của ảnh muốn đặt làm ảnh chính
}
```

**Lưu ý:** Khi sử dụng `primaryImageId`:
- Tất cả ảnh khác sẽ được đặt `isPrimary = false`
- Chỉ ảnh có ID được chỉ định sẽ có `isPrimary = true`
- `primaryImageId` sẽ ghi đè các flag `isPrimary` trong mảng `images` nếu cả hai đều được cung cấp

## API Endpoint

```http
PATCH /api/products/:productId
Content-Type: application/json
Authorization: Bearer <token>
```

## Ví dụ đầy đủ

```json
{
  "name": "MacBook Pro 16 inch M3 Max",
  "description": "Laptop cao cấp cho developer",
  "brand": "Apple",
  "categoryId": "laptop-category-id",
  "images": [
    {
      "url": "https://cdn.example.com/macbook-front.jpg",
      "alt": "MacBook Pro mặt trước",
      "isPrimary": false,
      "displayOrder": 0
    },
    {
      "url": "https://cdn.example.com/macbook-side.jpg",
      "alt": "MacBook Pro góc nghiêng",
      "isPrimary": true,  // ← Ảnh này hiển thị trên trang chủ
      "displayOrder": 1
    },
    {
      "url": "https://cdn.example.com/macbook-open.jpg",
      "alt": "MacBook Pro mở màn hình",
      "isPrimary": false,
      "displayOrder": 2
    }
  ],
  "variants": [
    {
      "sku": "MBP-M3MAX-16-1TB",
      "price": 89990000,
      "stock": 10,
      "attributes": {
        "storage": "1TB",
        "ram": "32GB",
        "color": "Space Gray"
      }
    }
  ]
}
```

## Lưu ý quan trọng

1. **Chỉ một ảnh chính:** Hệ thống sẽ đảm bảo chỉ có một ảnh có `isPrimary = true` tại một thời điểm.

2. **Ảnh chính mặc định:** Nếu không chỉ định ảnh nào là ảnh chính, ảnh đầu tiên trong mảng sẽ tự động trở thành ảnh chính.

3. **Thứ tự ưu tiên:**
   - `primaryImageId` (cao nhất - ghi đè tất cả)
   - `isPrimary` trong mảng `images`
   - Ảnh đầu tiên trong mảng (mặc định)

4. **Hiển thị trên trang chủ:** Chỉ ảnh có `isPrimary = true` mới được hiển thị trên trang chủ và trong danh sách sản phẩm.

## Frontend Integration

Khi query sản phẩm, ảnh sẽ được sắp xếp với ảnh chính ở đầu:

```typescript
// Response từ API
{
  "id": "product-id",
  "name": "iPhone 15 Pro Max",
  "images": [
    {
      "id": "image-2",
      "url": "https://cdn.example.com/image2.jpg",
      "isPrimary": true,  // ← Ảnh này đầu tiên
      "displayOrder": 1
    },
    {
      "id": "image-1",
      "url": "https://cdn.example.com/image1.jpg",
      "isPrimary": false,
      "displayOrder": 0
    }
  ]
}
```

Frontend có thể lấy ảnh chính đơn giản:

```typescript
const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
```
