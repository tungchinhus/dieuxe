# Quản lý Xe Đưa Đón

## Tổng quan
Component quản lý xe đưa đón cung cấp đầy đủ chức năng CRUD (Create, Read, Update, Delete) cho việc quản lý thông tin xe đưa đón trong hệ thống.

## Tính năng chính

### 1. Quản lý xe đưa đón
- **Thêm xe mới**: Thêm thông tin xe đưa đón mới với đầy đủ thông tin
- **Chỉnh sửa**: Cập nhật thông tin xe đã có
- **Xóa**: Xóa xe đưa đón (có xác nhận)
- **Xem danh sách**: Hiển thị danh sách tất cả xe đưa đón

### 2. Tìm kiếm và lọc
- **Tìm kiếm**: Tìm kiếm theo biển số xe, tên tài xế, số điện thoại
- **Lọc theo loại xe**: Lọc xe theo các loại khác nhau (4 chỗ, 7 chỗ, 16 chỗ, 29 chỗ, 45 chỗ)
- **Xóa bộ lọc**: Reset tất cả bộ lọc

### 3. Chọn nhiều xe
- **Chọn đơn lẻ**: Chọn từng xe riêng lẻ
- **Chọn tất cả**: Chọn tất cả xe trong danh sách
- **Xóa hàng loạt**: Xóa nhiều xe cùng lúc

### 4. Giao diện thân thiện
- **Responsive**: Tương thích với mọi kích thước màn hình
- **Material Design**: Sử dụng Angular Material cho giao diện đẹp
- **Thông báo**: Hiển thị thông báo thành công/lỗi
- **Xác nhận**: Xác nhận trước khi xóa

## Cấu trúc dữ liệu

### Model XeDuaDon
```typescript
interface XeDuaDon {
  MaXe: string;              // ID duy nhất của xe
  BienSoXe: string;          // Biển số xe
  TenTaiXe: string;          // Tên tài xế
  SoDienThoaiTaiXe: string;  // Số điện thoại tài xế
  LoaiXe: string;            // Loại xe (enum)
  GhiChu?: string;           // Ghi chú thêm
  createdAt?: Date;          // Ngày tạo
  updatedAt?: Date;          // Ngày cập nhật
}
```

### Loại xe hỗ trợ
- Xe 4 chỗ
- Xe 7 chỗ  
- Xe 16 chỗ
- Xe 29 chỗ
- Xe 45 chỗ

## Cách sử dụng

### 1. Truy cập
- Điều hướng đến `/quan-ly-xe-dua-don` trong ứng dụng
- Hoặc click vào menu "Quản lý xe đưa đón" trong sidebar

### 2. Thêm xe mới
1. Click nút "Thêm xe đưa đón"
2. Điền đầy đủ thông tin bắt buộc:
   - Biển số xe
   - Tên tài xế
   - Số điện thoại tài xế
   - Loại xe
3. Thêm ghi chú (tùy chọn)
4. Click "Thêm mới"

### 3. Chỉnh sửa xe
1. Click vào menu 3 chấm ở cột "Thao tác"
2. Chọn "Chỉnh sửa"
3. Cập nhật thông tin cần thiết
4. Click "Cập nhật"

### 4. Xóa xe
1. **Xóa đơn lẻ**: Click menu 3 chấm → "Xóa" → Xác nhận
2. **Xóa hàng loạt**: 
   - Chọn các xe cần xóa (checkbox)
   - Click "Xóa đã chọn" → Xác nhận

### 5. Tìm kiếm và lọc
1. **Tìm kiếm**: Nhập từ khóa vào ô "Tìm kiếm"
2. **Lọc loại xe**: Chọn loại xe từ dropdown
3. **Xóa bộ lọc**: Click "Xóa bộ lọc"

## Tích hợp Firebase

### Collection: `xeDuaDon`
- Tự động lưu trữ và đồng bộ dữ liệu với Firebase Firestore
- Hỗ trợ real-time updates
- Validation dữ liệu trước khi lưu

### CRUD Operations
- **Create**: `createXeDuaDon()`
- **Read**: `getAllXeDuaDon()`, `getXeDuaDonById()`
- **Update**: `updateXeDuaDon()`
- **Delete**: `deleteXeDuaDon()`

## Validation

### Biển số xe
- Chỉ cho phép chữ cái và số
- Tối đa 10 ký tự
- Tự động chuyển thành chữ hoa

### Số điện thoại
- Chỉ cho phép số
- 10-11 chữ số
- Tự động format

### Tên tài xế
- Bắt buộc nhập
- Tối đa 50 ký tự

### Loại xe
- Bắt buộc chọn
- Chọn từ danh sách có sẵn

## Responsive Design

### Desktop (>768px)
- Sidebar cố định với bộ lọc
- Bảng hiển thị đầy đủ cột
- Giao diện rộng rãi

### Tablet (768px - 480px)
- Sidebar có thể thu gọn
- Bảng vẫn hiển thị đầy đủ
- Font size điều chỉnh

### Mobile (<480px)
- Sidebar overlay
- Bảng chỉ hiển thị cột quan trọng
- Nút full-width

## Lỗi thường gặp

### 1. Lỗi validation
- **Nguyên nhân**: Thiếu thông tin bắt buộc hoặc format sai
- **Giải pháp**: Kiểm tra lại các trường bắt buộc và format

### 2. Lỗi Firebase
- **Nguyên nhân**: Kết nối mạng hoặc quyền truy cập
- **Giải pháp**: Kiểm tra kết nối mạng và cấu hình Firebase

### 3. Lỗi hiển thị
- **Nguyên nhân**: Dữ liệu không đồng bộ
- **Giải pháp**: Refresh trang hoặc kiểm tra console

## Phát triển thêm

### Tính năng có thể thêm
1. **Import/Export Excel**: Nhập/xuất dữ liệu từ Excel
2. **Lịch sử thay đổi**: Theo dõi lịch sử chỉnh sửa
3. **Backup dữ liệu**: Sao lưu dữ liệu định kỳ
4. **Thống kê**: Báo cáo số liệu xe đưa đón
5. **Tích hợp GPS**: Theo dõi vị trí xe real-time

### Cải tiến giao diện
1. **Dark mode**: Chế độ tối
2. **Drag & drop**: Kéo thả để sắp xếp
3. **Infinite scroll**: Cuộn vô hạn thay vì phân trang
4. **Advanced filters**: Bộ lọc nâng cao

## Liên hệ hỗ trợ
Nếu gặp vấn đề hoặc cần hỗ trợ, vui lòng liên hệ team phát triển.
