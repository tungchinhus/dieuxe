# Hướng dẫn Popup Chọn Xe cho Phiếu Báo Làm Thêm Giờ

## Tổng quan

Tính năng popup chọn xe cho các tuyến đã được thêm vào luồng xuất PDF "Phiếu báo làm thêm giờ". Khi người dùng bấm vào "Phiếu báo làm thêm giờ", hệ thống sẽ hiển thị popup để chọn xe gán cho từng tuyến trước khi xuất PDF.

## Tính năng mới

### 1. Popup Chọn Xe cho Các Tuyến
- **Component**: `RouteVehicleAssignmentDialogComponent`
- **Vị trí**: `src/app/components/quan-ly-xe-dua-don/route-vehicle-assignment-dialog/`
- **Chức năng**: 
  - Hiển thị danh sách các tuyến cần phân công xe
  - Cho phép chọn xe cho từng tuyến
  - Tự động phân bổ xe dựa trên số nhân viên
  - Hiển thị thông tin chi tiết về từng tuyến

### 2. Các Tuyến Được Hỗ Trợ
- **HCM Routes**: HCM01, HCM02, HCM03
- **BH Routes**: BH01, BH02, BH03, BH04
- **Tổng cộng**: 7 tuyến

### 3. Thông Tin Hiển Thị cho Mỗi Tuyến
- Số nhân viên và tỷ lệ phần trăm
- Loại xe được đề xuất
- Xe đã được phân công
- Trạng thái hoàn thành

## Luồng Hoạt Động

### 1. Người dùng bấm "Phiếu báo làm thêm giờ"
```
Người dùng → Bấm "Phiếu báo làm thêm giờ" → Mở popup chọn xe
```

### 2. Popup hiển thị với thông tin các tuyến
- **Tổng quan**: Số tuyến, xe, nhân viên
- **Danh sách tuyến**: HCM01, HCM02, HCM03, BH01, BH02, BH03, BH04
- **Tự động phân bổ**: Hệ thống tự động phân bổ xe cho các tuyến

### 3. Người dùng có thể điều chỉnh
- Chọn xe khác cho từng tuyến
- Phân bổ lại xe bằng nút "Phân bổ lại xe"
- Kiểm tra trạng thái hoàn thành

### 4. Xuất PDF
- Nhấn "Xuất PDF" khi tất cả tuyến đã được phân công xe
- Hệ thống xuất PDF với thông tin phân công xe

## Thuật Toán Phân Bổ Xe

### 1. Phân Bổ Dựa Trên Số Nhân Viên
```typescript
// Tính tỷ lệ nhân viên của từng tuyến
const employeeRatio = route.employeeCount / totalEmployees;

// Phân bổ xe dựa trên tỷ lệ
let vehiclesNeeded = Math.ceil(vehicles.length * employeeRatio);
```

### 2. Chọn Xe Phù Hợp
```typescript
// Tính điểm phù hợp của xe với số nhân viên
const score = calculateVehicleScore(capacity, employeeCount);

// Ưu tiên xe có sức chứa phù hợp nhất
return sortedVehicles[0];
```

### 3. Đề Xuất Loại Xe
- **≤ 7 nhân viên**: Taxi 7 chỗ
- **8-16 nhân viên**: Xe 16 chỗ
- **17-29 nhân viên**: Xe 29 chỗ
- **30-45 nhân viên**: Xe 45 chỗ
- **> 45 nhân viên**: Nhiều xe 45 chỗ

## Dữ Liệu Mock

### Các Tuyến HCM
- **HCM01**: Ngã 4 Thủ Đức - 28 nhân viên
- **HCM02**: RMK - 2 nhân viên
- **HCM03**: Bến Gỗ - 8 nhân viên

### Các Tuyến BH
- **BH01**: KCN Long Đức - 15 nhân viên
- **BH02**: Ngã 3 Bến Gỗ - 12 nhân viên
- **BH03**: Ngã 3 Long Bình Tân - 6 nhân viên
- **BH04**: Hàng Xanh - 9 nhân viên

## Giao Diện Người Dùng

### 1. Header Dialog
- Tiêu đề: "Chọn xe cho các tuyến trước khi xuất PDF"
- Nút đóng dialog

### 2. Tổng Quan
- Tổng số tuyến: 7
- Tổng số xe: [Số xe khả dụng]
- Tổng số nhân viên: 80
- Tuyến đã phân bổ: X/7
- Phân bổ đồng đều: Có/Không

### 3. Danh Sách Tuyến
- Mỗi tuyến hiển thị trong một card riêng
- Thông tin chi tiết về tuyến
- Dropdown chọn xe
- Thông tin xe đã chọn

### 4. Nút Hành Động
- **Hủy**: Đóng dialog
- **Phân bổ lại xe**: Reset và phân bổ lại
- **Xuất PDF**: Xuất PDF với thông tin phân công

## Cách Sử Dụng

### 1. Truy Cập Tính Năng
1. Vào trang "Đăng ký xe"
2. Nhấn nút "Xuất PDF"
3. Chọn "Phiếu báo làm thêm giờ"
4. Popup chọn xe sẽ mở ra

### 2. Phân Công Xe
1. Xem thông tin tổng quan
2. Kiểm tra phân bổ tự động
3. Điều chỉnh xe cho từng tuyến nếu cần
4. Nhấn "Phân bổ lại xe" nếu muốn reset

### 3. Xuất PDF
1. Đảm bảo tất cả tuyến đã được phân công xe
2. Nhấn "Xuất PDF"
3. File PDF sẽ được tạo với thông tin phân công xe

## Lợi Ích

### 1. Kiểm Soát Tốt Hơn
- Người dùng có thể chọn xe cụ thể cho từng tuyến
- Tránh phân bổ không phù hợp

### 2. Thông Tin Rõ Ràng
- Hiển thị số nhân viên và tỷ lệ của từng tuyến
- Đề xuất loại xe phù hợp

### 3. Phân Bổ Thông Minh
- Tự động phân bổ dựa trên số nhân viên
- Ưu tiên xe có sức chứa phù hợp

### 4. Linh Hoạt
- Có thể điều chỉnh phân bổ
- Có thể phân bổ lại nếu cần

## Kết Quả Mong Đợi

Sau khi áp dụng tính năng này:
- **Người dùng có thể chọn xe cụ thể cho từng tuyến**
- **PDF xuất ra sẽ chứa thông tin phân công xe**
- **Phân bổ xe hợp lý dựa trên số nhân viên**
- **Tăng hiệu quả quản lý và vận hành**

## Lưu Ý Kỹ Thuật

### Dependencies
- Angular Material Dialog
- Angular Forms cho quản lý dữ liệu
- jsPDF cho xuất PDF

### Performance
- Thuật toán có độ phức tạp O(n) với n là số xe
- Tối ưu cho việc phân bổ nhanh chóng

### Extensibility
- Dễ dàng thêm tuyến mới
- Có thể điều chỉnh thuật toán phân bổ
- Có thể mở rộng cho các loại xe khác
