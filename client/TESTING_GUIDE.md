# Hướng Dẫn Kiểm Tra Tính Năng Mới

## ✅ Checklist

### 1. Cài Đặt và Cấu Hình

- [x] Đã cài đặt `react-quill` thành công
- [ ] Đã tạo file `.env.local` với thông tin Cloudinary
- [ ] Đã khởi động dev server

### 2. Kiểm Tra Upload Ảnh

Truy cập: `http://localhost:3000/admin/posts/create`

- [ ] Khu vực upload ảnh hiển thị đúng
- [ ] Click vào khu vực upload mở được Cloudinary widget
- [ ] Upload ảnh thành công
- [ ] Preview ảnh hiển thị đúng
- [ ] Nút xóa ảnh hoạt động
- [ ] Có thể chọn ảnh khác sau khi xóa

### 3. Kiểm Tra Rich Text Editor

- [ ] Toolbar hiển thị đầy đủ các tool
- [ ] Có thể định dạng văn bản (bold, italic, underline)
- [ ] Có thể thay đổi tiêu đề (H1-H6)
- [ ] Có thể tạo danh sách
- [ ] Có thể thay đổi màu chữ
- [ ] Có thể căn chỉnh văn bản
- [ ] Có thể chèn link
- [ ] Placeholder hiển thị đúng

### 4. Kiểm Tra Form

- [ ] Validation hoạt động (các trường bắt buộc)
- [ ] Có thể tick/untick checkbox "Xuất bản"
- [ ] Nút "Tạo mới" hoạt động
- [ ] Nút "Hủy" redirect về trang danh sách

### 5. Kiểm Tra Dark Mode

- [ ] Chuyển sang dark mode
- [ ] Editor hiển thị đúng trong dark mode
- [ ] Toolbar có màu phù hợp
- [ ] Text có contrast tốt

### 6. Kiểm Tra Responsive

- [ ] Form hiển thị tốt trên mobile
- [ ] Editor có thể scroll trên mobile
- [ ] Upload widget hoạt động trên mobile

## 🧪 Test Cases

### Test 1: Tạo Bài Viết Đầy Đủ

1. Điền tiêu đề: "Bài viết test"
2. Điền tóm tắt: "Đây là tóm tắt"
3. Upload 1 ảnh
4. Viết nội dung với các định dạng khác nhau
5. Tick "Xuất bản"
6. Click "Tạo mới"
7. **Kỳ vọng**: Toast success, redirect về danh sách

### Test 2: Validation Lỗi

1. Để trống tất cả các trường
2. Click "Tạo mới"
3. **Kỳ vọng**: Hiển thị lỗi validation cho các trường bắt buộc

### Test 3: Chỉnh Sửa Bài Viết

1. Vào trang edit một bài viết có sẵn
2. Form load đúng dữ liệu cũ
3. Thay đổi nội dung
4. Click "Cập nhật"
5. **Kỳ vọng**: Toast success, redirect về danh sách

### Test 4: Upload Nhiều Ảnh

1. Upload ảnh lần 1
2. Xóa ảnh
3. Upload ảnh lần 2
4. **Kỳ vọng**: Ảnh mới replace ảnh cũ

## 🐛 Các Lỗi Thường Gặp và Cách Fix

### Lỗi 1: Editor không hiển thị

**Nguyên nhân**: SSR issue với React Quill

**Cách fix**: 
- Component đã được load dynamic với `{ ssr: false }`
- Nếu vẫn lỗi, clear cache: `pnpm store prune`

### Lỗi 2: Upload ảnh bị lỗi 404

**Nguyên nhân**: Chưa cấu hình Cloudinary

**Cách fix**:
1. Tạo file `.env.local`
2. Thêm đúng cloud name và upload preset
3. Restart dev server

### Lỗi 3: CSS của editor bị lỗi

**Nguyên nhân**: Import CSS chưa đúng

**Cách fix**:
- Kiểm tra `globals.css` đã có styles cho Quill
- Import đúng `react-quill/dist/quill.snow.css`

### Lỗi 4: Form không submit được

**Nguyên nhân**: Validation schema không đúng

**Cách fix**:
- Kiểm tra tất cả trường bắt buộc đã điền
- Kiểm tra URL ảnh hợp lệ
- Check console log để xem lỗi cụ thể

## 📊 Kết Quả Mong Đợi

Sau khi hoàn thành tất cả checklist:

✅ Upload ảnh hoạt động mượt mà
✅ Editor có đầy đủ tính năng rich text
✅ Form validation chặt chẽ
✅ UI/UX thân thiện
✅ Dark mode support
✅ Responsive tốt trên mọi thiết bị

## 📸 Screenshots

Hãy chụp screenshots của:
1. Trang create post
2. Upload ảnh thành công
3. Editor với nội dung đã format
4. Dark mode
5. Bài viết sau khi tạo thành công

---

**Happy Testing! 🚀**
