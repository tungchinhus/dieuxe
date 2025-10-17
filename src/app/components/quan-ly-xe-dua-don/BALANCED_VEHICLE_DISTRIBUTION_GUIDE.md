# Hướng dẫn Phân bổ Xe Đồng đều cho 3 Trạm

## Tổng quan

Tính năng phân bổ xe đồng đều đã được cải thiện để giải quyết vấn đề phân bổ không đồng đều ở 3 trạm khi xuất PDF. Hệ thống hiện tại tự động phân bổ xe một cách cân bằng và thông minh.

## Tính năng mới

### 1. Tự động phân bổ xe khi mở dialog
- Khi mở dialog phân công trạm, hệ thống sẽ tự động phân bổ xe cho tất cả các trạm
- Thuật toán đặc biệt được tối ưu cho 3 trạm để đảm bảo phân bổ đồng đều

### 2. Thuật toán phân bổ thông minh
- **Sắp xếp xe theo sức chứa**: Xe được sắp xếp từ lớn đến nhỏ
- **Phân bổ đồng đều**: Mỗi trạm nhận được số lượng xe tương đương
- **Ưu tiên xe phù hợp**: Chọn xe có sức chứa phù hợp với số nhân viên của trạm

### 3. Nút "Phân bổ lại xe"
- Cho phép người dùng phân bổ lại xe nếu không hài lòng với kết quả
- Reset tất cả phân bổ và thực hiện lại thuật toán

### 4. Thông tin tổng quan
- Hiển thị tổng số trạm, xe, nhân viên
- Hiển thị số trạm đã được phân bổ xe
- Thông tin chi tiết về từng trạm

## Thuật toán phân bổ cho 3 trạm

### Công thức tính toán
```typescript
// Số xe cơ bản cho mỗi trạm
const vehiclesPerStation = Math.floor(totalVehicles / 3);

// Số xe thừa
const remainingVehicles = totalVehicles % 3;

// Phân bổ xe thừa cho các trạm đầu tiên
stations.forEach((station, index) => {
  let vehiclesForThisStation = vehiclesPerStation;
  if (index < remainingVehicles) {
    vehiclesForThisStation += 1;
  }
});
```

### Ví dụ thực tế
- **10 xe cho 3 trạm**: Mỗi trạm nhận 3 xe, trạm đầu tiên nhận thêm 1 xe
- **11 xe cho 3 trạm**: Mỗi trạm nhận 3 xe, 2 trạm đầu tiên nhận thêm 1 xe
- **12 xe cho 3 trạm**: Mỗi trạm nhận 4 xe

## Cải thiện PDF Export

### Thông tin mới trong PDF
1. **Tổng số nhân viên**: Hiển thị tổng số nhân viên cần vận chuyển
2. **Phân bổ xe đồng đều**: Kiểm tra và hiển thị trạng thái phân bổ
3. **Thông tin chi tiết**: Số nhân viên và tuyến đường cho từng trạm

### Kiểm tra phân bổ đồng đều
```typescript
private isEvenDistribution(distribution: { [stationId: string]: number }): boolean {
  const values = Object.values(distribution);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // Phân bổ được coi là đồng đều nếu chênh lệch không quá 1
  return (max - min) <= 1;
}
```

## Cách sử dụng

### 1. Mở dialog phân công
1. Vào trang "Quản lý Xe Đưa Đón"
2. Nhấn nút "Phân công & Xuất PDF"
3. Hệ thống tự động phân bổ xe cho tất cả trạm

### 2. Kiểm tra phân bổ
1. Xem thông tin tổng quan ở đầu dialog
2. Kiểm tra từng trạm đã được phân bổ xe chưa
3. Xem thông tin chi tiết về xe được phân bổ

### 3. Phân bổ lại (nếu cần)
1. Nhấn nút "Phân bổ lại xe"
2. Hệ thống sẽ reset và phân bổ lại
3. Kiểm tra kết quả mới

### 4. Xuất PDF
1. Đảm bảo tất cả trạm đã được phân bổ xe
2. Nhấn nút "Xuất PDF"
3. PDF sẽ chứa thông tin phân bổ đồng đều

## Lợi ích

### 1. Phân bổ tự động
- Không cần phân bổ thủ công từng xe
- Tiết kiệm thời gian và giảm sai sót

### 2. Đồng đều cho 3 trạm
- Thuật toán đặc biệt cho 3 trạm
- Đảm bảo phân bổ cân bằng

### 3. Thông tin rõ ràng
- Hiển thị trạng thái phân bổ
- Thông tin chi tiết trong PDF

### 4. Linh hoạt
- Có thể phân bổ lại nếu cần
- Vẫn cho phép chỉnh sửa thủ công

## Kết quả mong đợi

Sau khi áp dụng tính năng này:
- **3 trạm sẽ nhận được số lượng xe đồng đều**
- **PDF xuất ra sẽ hiển thị "Phân bổ xe đồng đều: Có"**
- **Giảm thiểu sự chênh lệch về số lượng xe giữa các trạm**
- **Tăng hiệu quả quản lý và vận hành**

## Lưu ý kỹ thuật

### Dependencies
- Angular Material Dialog
- jsPDF cho xuất PDF
- Angular Forms cho quản lý dữ liệu

### Performance
- Thuật toán có độ phức tạp O(n) với n là số xe
- Tối ưu cho việc phân bổ nhanh chóng

### Extensibility
- Có thể mở rộng cho số trạm khác
- Dễ dàng điều chỉnh thuật toán phân bổ
