# Hướng dẫn khắc phục vấn đề đăng nhập Admin

## Vấn đề
Khi đăng nhập với tài khoản admin, hệ thống báo lỗi "Không thể tải danh sách người dùng" vì không có dữ liệu user trong Firebase.

## Nguyên nhân
- Migration chưa chạy thành công để tạo dữ liệu user mẫu
- Firebase chưa có dữ liệu user admin
- Có thể có lỗi trong quá trình kết nối Firebase

## Cách khắc phục

### Bước 1: Truy cập Debug Page
1. Mở trình duyệt và truy cập: `http://localhost:4200/debug-admin`
2. Trang debug sẽ hiển thị:
   - Số lượng user hiện tại trong hệ thống
   - Trạng thái admin user (có tồn tại hay không)
   - User hiện tại đang đăng nhập

### Bước 2: Tạo Admin User
1. Nhấn nút **"Create Admin User"** để tạo user admin
2. Hệ thống sẽ tạo user admin với thông tin:
   - Username: `admin`
   - Password: `admin123`
   - Role: `super_admin`
   - Email: `admin@company.com`

### Bước 3: Test Login
1. Nhấn nút **"Test Login as Admin"** để test đăng nhập
2. Hoặc quay lại trang đăng nhập và đăng nhập với:
   - Username: `admin`
   - Password: `admin123`

### Bước 4: Kiểm tra kết quả
Sau khi đăng nhập thành công, bạn sẽ thấy:
- Menu "Quản lý người dùng" và "Quản lý phân quyền" xuất hiện
- Có thể truy cập các chức năng quản lý
- User info hiển thị role "super_admin"

## Các nút Debug khác

### Refresh Users
- Làm mới danh sách user từ Firebase
- Hiển thị số lượng user hiện tại

### Run Full Migration
- Chạy migration đầy đủ để tạo tất cả dữ liệu mẫu
- Bao gồm users, roles, và permissions

## Troubleshooting

### Nếu vẫn không có user sau khi tạo:
1. Kiểm tra console browser để xem lỗi
2. Kiểm tra kết nối Firebase
3. Thử nhấn "Refresh Users" nhiều lần
4. Thử "Run Full Migration"

### Nếu không thể truy cập debug page:
1. Kiểm tra route có được thêm đúng không
2. Restart development server
3. Clear browser cache

### Nếu đăng nhập vẫn thất bại:
1. Kiểm tra password có đúng không (`admin123`)
2. Kiểm tra user có `isActive: true` không
3. Kiểm tra role có được gán đúng không

## Thông tin Admin User
```json
{
  "username": "admin",
  "email": "admin@company.com", 
  "fullName": "Quản trị viên",
  "phone": "0901234567",
  "department": "IT",
  "position": "System Administrator",
  "isActive": true,
  "roles": ["super_admin"],
  "password": "admin123"
}
```

## Lưu ý
- Debug page chỉ nên sử dụng trong môi trường development
- Trong production, cần xóa route debug này
- Đảm bảo Firebase đã được cấu hình đúng cách
