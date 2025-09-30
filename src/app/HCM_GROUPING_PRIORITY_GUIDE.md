# Hướng dẫn Logic Ưu tiên Gom Nhóm HCM và BH Routes

## Tổng quan

Theo yêu cầu từ hình ảnh, tất cả 3 tuyến HCM (HCM01, HCM02, HCM03) và 3 tuyến BH (BH01, BH02, BH03) đều có chung trạm "Hàng xanh" khi đi từ KCN Long Đức. Do đó, hệ thống đã được cập nhật để ưu tiên gom tất cả nhân viên HCM vào tuyến HCM01 trước và tất cả nhân viên BH vào tuyến BH01 trước.

## Logic mới

### 1. Nguyên tắc hoạt động

- **Trạm trước hoặc tại "Hàng xanh"**: 
  - Tất cả nhân viên HCM01, HCM02, HCM03 tại các trạm này sẽ được gom vào HCM01
  - Tất cả nhân viên BH01, BH02, BH03 tại các trạm này sẽ được gom vào BH01
- **Trạm sau "Hàng xanh"**: 
  - Các nhân viên HCM01, HCM02, HCM03 tại các trạm này sẽ giữ nguyên tuyến gốc
  - Các nhân viên BH01, BH02, BH03 tại các trạm này sẽ giữ nguyên tuyến gốc
- **Các tuyến khác**: Không thay đổi logic gom nhóm

### 2. Danh sách trạm trước "Hàng xanh"

Theo thứ tự từ KCN Long Đức đến Hàng xanh:
1. KCN Long Đức
2. Ngã 3 Bến Gỗ
3. Ngã 3 Long Bình Tân
4. Ngã 4 Thủ Đức
5. RMK
6. Ngã 3 Cát Lái
7. Hàng xanh

### 3. Ví dụ thực tế

#### Trước khi áp dụng logic mới:
```
HCM01: 5 nhân viên (KCN Long Đức, Ngã 4 Thủ Đức, Hàng xanh, Đinh Tiên Hoàng, BV Hòa Hảo)
HCM02: 4 nhân viên (Ngã 3 Bến Gỗ, RMK, Bà Chiểu, Trường Lý Tự Trọng)
HCM03: 4 nhân viên (Ngã 3 Long Bình Tân, Ngã 3 Cát Lái, Chợ Gò Vấp, Hóc Môn)
BH01: 3 nhân viên (KCN Long Đức, Ngã 4 Thủ Đức, Hàng xanh)
BH02: 3 nhân viên (Ngã 3 Bến Gỗ, RMK, Bà Chiểu)
BH03: 3 nhân viên (Ngã 3 Long Bình Tân, Ngã 3 Cát Lái, Chợ Gò Vấp)
```

#### Sau khi áp dụng logic mới:
```
HCM01: 11 nhân viên (tất cả từ HCM01, HCM02, HCM03 tại trạm trước/tại Hàng xanh)
HCM02: 2 nhân viên (Bà Chiểu, Trường Lý Tự Trọng - trạm sau Hàng xanh)
HCM03: 2 nhân viên (Chợ Gò Vấp, Hóc Môn - trạm sau Hàng xanh)
BH01: 9 nhân viên (tất cả từ BH01, BH02, BH03 tại trạm trước/tại Hàng xanh)
BH02: 1 nhân viên (Bà Chiểu - trạm sau Hàng xanh)
BH03: 1 nhân viên (Chợ Gò Vấp - trạm sau Hàng xanh)
```

## Các file đã được cập nhật

### 1. `src/app/services/pdf-export.service.ts`
- Thêm phương thức `applyHCMGroupingPriority()`
- Thêm phương thức `isStationBeforeOrAtHangXanh()`
- Cập nhật `groupRegistrationsByRoute()` để áp dụng logic mới

### 2. `src/app/services/pdf-export-employee-station.service.ts`
- Thêm phương thức `applyHCMGroupingPriority()`
- Thêm phương thức `isStationBeforeOrAtHangXanh()`
- Cập nhật `groupEmployeesByRouteAndStation()` để áp dụng logic mới

### 3. `src/app/services/employee-allocation.service.ts`
- Thêm phương thức `applyHCMGroupingPriority()`
- Thêm phương thức `isStationBeforeOrAtHangXanh()`
- Cập nhật `groupEmployeesByRouteAndStation()` để áp dụng logic mới

### 4. `src/app/examples/hcm-grouping-test.example.ts`
- Tạo file test case để kiểm tra logic mới
- Bao gồm các test case cho các trường hợp khác nhau

## Cách sử dụng

Logic mới sẽ tự động được áp dụng khi:
1. Xuất PDF báo cáo đăng ký xe
2. Xuất PDF báo cáo nhân viên theo trạm
3. Phân bổ nhân viên theo tuyến đường

Không cần thay đổi gì trong giao diện người dùng.

## Test và kiểm tra

Để test logic mới, có thể sử dụng file test case:
```typescript
import { testHCMGroupingLogic } from './examples/hcm-grouping-test.example';
testHCMGroupingLogic();
```

## Lưu ý quan trọng

1. **Tính nhất quán**: Logic mới được áp dụng đồng bộ trên tất cả các service
2. **Tương thích ngược**: Các tuyến khác (BH, T1, T2, v.v.) không bị ảnh hưởng
3. **Linh hoạt**: Có thể dễ dàng thay đổi danh sách trạm trước "Hàng xanh" nếu cần
4. **Hiệu suất**: Logic kiểm tra trạm được tối ưu để không ảnh hưởng đến hiệu suất

## Cập nhật trong tương lai

Nếu cần thay đổi danh sách trạm trước "Hàng xanh", chỉ cần cập nhật mảng `stationsBeforeHangXanh` trong các phương thức `isStationBeforeOrAtHangXanh()` của 3 service trên.
