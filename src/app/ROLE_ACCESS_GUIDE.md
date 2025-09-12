# Hướng dẫn Phân quyền Truy cập

## Tổng quan
Hệ thống đã được cấu hình để chỉ cho phép user có role `admin` và `super_admin` truy cập vào các chức năng quản lý người dùng và phân quyền.

## Cấu hình hiện tại

### 1. Routes được bảo vệ
- `/quan-ly-user` - Quản lý người dùng
- `/quan-ly-phan-quyen` - Quản lý phân quyền

Cả hai routes này đều yêu cầu:
- User phải đã đăng nhập (`AuthGuard`)
- User phải có role `admin` hoặc `super_admin`
- User phải có quyền tương ứng (`user_view` hoặc `role_view`)

### 2. Navigation Menu
Menu sidebar chỉ hiển thị các link quản lý cho user có role admin/super_admin:
- Sử dụng `*ngIf="hasAdminRole()"` để kiểm tra quyền truy cập
- Method `hasAdminRole()` kiểm tra xem user có role `admin` hoặc `super_admin` không

### 3. AuthGuard
`AuthGuard` được cải thiện để:
- Kiểm tra xác thực trước
- Kiểm tra role trực tiếp từ user object (không cần gọi API)
- Chuyển hướng đến `/unauthorized` nếu không có quyền

### 4. AuthService
`AuthService` có method `hasAnyRole()` được tối ưu để:
- Kiểm tra role trực tiếp từ user object
- Trả về kết quả ngay lập tức (không cần async)

## Cách test

### 1. Sử dụng Test Component
Truy cập `/test-role-access` để kiểm tra:
- Thông tin user hiện tại
- Quyền truy cập các chức năng
- Test navigation links

### 2. Test với các user khác nhau
1. Đăng nhập với user có role `admin` hoặc `super_admin`:
   - Có thể thấy menu "Quản lý người dùng" và "Quản lý phân quyền"
   - Có thể truy cập các routes này
   - Test component sẽ hiển thị "YES" cho các quyền

2. Đăng nhập với user có role khác (user, manager, viewer):
   - Không thấy menu quản lý
   - Không thể truy cập các routes (sẽ chuyển hướng đến `/unauthorized`)
   - Test component sẽ hiển thị "NO" cho các quyền

## Cấu trúc Role

### Predefined Roles
```typescript
export const PREDEFINED_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  VIEWER: 'viewer'
};
```

### User Model
```typescript
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[]; // Array of role names
  isActive: boolean;
  // ... other fields
}
```

## Bảo mật

### 1. Route Protection
- Tất cả routes nhạy cảm đều được bảo vệ bởi `AuthGuard`
- Kiểm tra cả authentication và authorization

### 2. UI Protection
- Menu items chỉ hiển thị cho user có quyền
- Sử dụng `*ngIf` để ẩn/hiện các element

### 3. Server-side Validation
- Cần implement validation ở backend
- Không nên chỉ dựa vào frontend validation

## Troubleshooting

### 1. User không thể truy cập mặc dù có role admin
- Kiểm tra user object có đúng structure không
- Kiểm tra role name có chính xác không (case-sensitive)
- Xem console logs để debug

### 2. Menu không hiển thị
- Kiểm tra method `hasAdminRole()` trong `app.ts`
- Kiểm tra user có role trong array `roles` không

### 3. Unauthorized redirect
- Kiểm tra `AuthGuard` logic
- Kiểm tra route data configuration

## Mở rộng

### Thêm role mới
1. Thêm vào `PREDEFINED_ROLES`
2. Cập nhật `hasAdminRole()` method nếu cần
3. Cập nhật route data nếu cần

### Thêm permission mới
1. Thêm vào `PREDEFINED_PERMISSIONS`
2. Cập nhật route data
3. Implement logic kiểm tra permission

### Thêm route được bảo vệ
1. Thêm route vào `app.routes.ts`
2. Thêm `canActivate: [AuthGuard]`
3. Thêm `data: { roles: [...], permissions: [...] }`
4. Thêm menu item với `*ngIf` check
