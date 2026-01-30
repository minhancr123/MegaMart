# Tính Năng Quản Lý Bài Viết (Posts)

## Tổng Quan

Trang quản lý bài viết đã được nâng cấp với các tính năng mới:

### ✨ Tính Năng Mới

1. **Upload Ảnh Từ Máy Tính**
   - Chọn và upload ảnh trực tiếp từ máy tính
   - Xem trước ảnh trước khi lưu
   - Hỗ trợ các định dạng: PNG, JPG, GIF (tối đa 10MB)
   - Tích hợp Cloudinary để lưu trữ ảnh

2. **Trình Soạn Thảo Văn Bản Đa Dạng (Rich Text Editor)**
   - Sử dụng React Quill - trình soạn thảo WYSIWYG mạnh mẽ
   - Hỗ trợ định dạng văn bản: bold, italic, underline, strikethrough
   - Danh sách có thứ tự và không có thứ tự
   - Tiêu đề (H1-H6)
   - Màu sắc văn bản và nền
   - Căn chỉnh văn bản
   - Chèn link, ảnh, và video
   - Blockquote và code block

3. **Giao Diện Thân Thiện**
   - Design hiện đại với Tailwind CSS
   - Responsive trên mọi thiết bị
   - Hỗ trợ Dark Mode
   - Form validation với Zod
   - Thông báo toast cho các action

## 🚀 Cài Đặt

### 1. Cài Đặt Dependencies

Các thư viện đã được cài đặt:
```bash
pnpm add react-quill
```

### 2. Cấu Hình Cloudinary

Tạo file `.env.local` trong thư mục `client/`:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

**Hướng dẫn lấy thông tin Cloudinary:**

1. Đăng ký tài khoản miễn phí tại: https://cloudinary.com
2. Vào Dashboard để lấy `Cloud Name`
3. Vào Settings > Upload > Upload presets để tạo upload preset:
   - Click "Add upload preset"
   - Đặt tên (ví dụ: "megamart")
   - Signing Mode: "Unsigned"
   - Folder: để trống hoặc đặt tên thư mục (ví dụ: "posts")
   - Save

### 3. Khởi Động Ứng Dụng

```bash
cd client
pnpm dev
```

## 📖 Cách Sử Dụng

### Tạo Bài Viết Mới

1. Truy cập: `/admin/posts/create`
2. Điền các thông tin:
   - **Tiêu đề**: Tên bài viết (bắt buộc)
   - **Tóm tắt**: Mô tả ngắn gọn về bài viết (bắt buộc)
   - **Hình ảnh đại diện**: 
     - Click vào khu vực upload
     - Chọn ảnh từ máy tính
     - Xem trước và có thể xóa để chọn ảnh khác
   - **Nội dung**: 
     - Sử dụng toolbar để định dạng văn bản
     - Thêm ảnh, video, link vào nội dung
     - Tạo danh sách, bảng biểu
   - **Xuất bản**: Tick checkbox để xuất bản ngay

3. Click "Tạo mới" để lưu bài viết

### Chỉnh Sửa Bài Viết

1. Truy cập: `/admin/posts/edit/[id]`
2. Thay đổi các thông tin cần thiết
3. Click "Cập nhật" để lưu thay đổi

## 🎨 Các Công Cụ Trong Trình Soạn Thảo

### Toolbar Chính:

- **Tiêu đề**: H1, H2, H3, H4, H5, H6
- **Font**: Các font chữ khác nhau
- **Size**: Kích thước chữ
- **Bold (B)**: In đậm
- **Italic (I)**: In nghiêng
- **Underline (U)**: Gạch chân
- **Strikethrough (S)**: Gạch ngang
- **Blockquote**: Trích dẫn
- **List**: Danh sách có số và bullet
- **Indent**: Thụt lề
- **Color**: Màu chữ và màu nền
- **Align**: Căn trái, giữa, phải, đều
- **Link**: Chèn liên kết
- **Image**: Chèn ảnh (URL)
- **Video**: Chèn video (URL)
- **Clean**: Xóa format

## 🎯 Tính Năng Kỹ Thuật

### Components

- **PostForm.tsx**: Component form chính
  - React Hook Form để quản lý form
  - Zod validation
  - Cloudinary upload widget
  - React Quill editor

### API Endpoints

- `POST /posts` - Tạo bài viết mới
- `PATCH /posts/:id` - Cập nhật bài viết
- `GET /posts/:id` - Lấy thông tin bài viết

### Styling

- Tailwind CSS cho layout
- Custom CSS cho Quill editor
- Dark mode support
- Responsive design

## 🐛 Xử Lý Lỗi

### Lỗi Upload Ảnh

Nếu gặp lỗi khi upload ảnh:
1. Kiểm tra file `.env.local` có đúng thông tin không
2. Kiểm tra upload preset là "Unsigned" trong Cloudinary
3. Kiểm tra kích thước file (< 10MB)
4. Kiểm tra định dạng file (PNG, JPG, GIF)

### Lỗi Trình Soạn Thảo

Nếu editor không hiển thị:
1. Kiểm tra file `globals.css` đã import Quill CSS
2. Xóa cache và restart dev server
3. Kiểm tra console log để xem lỗi cụ thể

## 📝 Notes

- Editor được load dynamic để tránh SSR issues
- Ảnh upload lên Cloudinary sẽ được tối ưu tự động
- Content được lưu dưới dạng HTML
- Form validation real-time với Zod

## 🔄 Updates

**Version 2.0**
- ✅ Thêm upload ảnh từ máy tính
- ✅ Thêm rich text editor với React Quill
- ✅ Cải thiện UI/UX
- ✅ Thêm validation
- ✅ Hỗ trợ dark mode

---

**Developed with ❤️ for MegaMart Admin Panel**
