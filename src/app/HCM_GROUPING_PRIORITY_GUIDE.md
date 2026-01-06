# Hướng dẫn Logic Ưu tiên Gom Nhóm HCM và BH Routes

## Tổng quan

Theo yêu cầu từ hình ảnh, hệ thống đã được cập nhật để phân bổ các trạm cụ thể cho HCM01 và HCM02 dựa trên dữ liệu thực tế từ hình ảnh.

## Logic mới (Đã cập nhật theo hình ảnh)

### 1. Nguyên tắc hoạt động

- **HCM01**: Bao gồm các trạm: Ngã 3 Bến Gỗ, Ngã 3 Long Bình Tân, Ngã 4 Thủ Đức, RMK, Ngã 3 Cát Lái, Hàng Xanh (Gần Văn Thánh), Đinh Tiên Hoàng-ĐBP, Hai Bà Trưng-ĐBP, BV Hòa Hảo
- **HCM02**: Bao gồm các trạm: Ngã 3 Bến Gỗ, Ngã 3 Long Bình Tân, Ngã 4 Thủ Đức, RMK, Ngã 3 Cát Lái, Bà Chiểu, Chợ Gò Vấp, Hóc Môn (Chùa Hoằng Pháp), Trường Lý Tự Trọng
- **Đặc biệt**: 
  - **Ngã 3 Hãng dầu** luôn thuộc **BH04**, không phân biệt tuyến gốc
  - **Ngã 4 Thủ Đức** không được gom vào BH01 nếu thuộc các tuyến khác
- **Các tuyến khác**: Không thay đổi logic gom nhóm

### 2. Danh sách trạm ưu tiên cho HCM01 (MỚI)

Các trạm sau sẽ được ưu tiên phân bổ vào tuyến HCM01:
1. **Đinh Tiên Hoàng-ĐBP** (các biến thể: đinh tien hoang, dinh tien hoang)
2. **Hai Bà Trưng-ĐBP** (các biến thể: hai ba trung, hai ba trung)
3. **BV Hòa Hảo** (các biến thể: bv hoa hao, benh vien hoa hao, bệnh viện hòa hảo)

### 3. Danh sách trạm ưu tiên cho HCM02 (Đã cập nhật)

Các trạm sau sẽ được ưu tiên phân bổ vào tuyến HCM02:
1. **Bà Chiểu** (các biến thể: ba chieu)
2. **Chợ Gò Vấp** (các biến thể: cho go vap, gò vấp, go vap)
3. **Hóc Môn (Chùa Hoằng Pháp)** (các biến thể: hoc mon, hóc môn, chùa hoằng pháp, chua hoang phap)
4. **Trường Lý Tự Trọng** (các biến thể: truong ly tu trong) - **MỚI THÊM**

### 3. Danh sách trạm trước "Hàng xanh" (Đã cập nhật)

Theo thứ tự từ KCN Long Đức đến Hàng xanh:
1. KCN Long Đức
2. Ngã 3 Bến Gỗ
3. Ngã 3 Long Bình Tân
4. RMK
5. Ngã 3 Cát Lái
6. Hàng xanh

**Lưu ý**: Đã loại bỏ **Ngã 4 Thủ Đức** khỏi danh sách để tránh gom sai vào BH01.

### 4. Ví dụ thực tế

#### Trước khi áp dụng logic mới:
```
HCM01: 5 nhân viên (KCN Long Đức, Ngã 4 Thủ Đức, Hàng xanh, Đinh Tiên Hoàng, BV Hòa Hảo)
HCM02: 4 nhân viên (Ngã 3 Bến Gỗ, RMK, Bà Chiểu, Trường Lý Tự Trọng)
HCM03: 4 nhân viên (Ngã 3 Long Bình Tân, Ngã 3 Cát Lái, Chợ Gò Vấp, Hóc Môn)
BH01: 3 nhân viên (KCN Long Đức, Ngã 4 Thủ Đức, Hàng xanh)
BH02: 3 nhân viên (Ngã 3 Bến Gỗ, RMK, Bà Chiểu)
BH03: 3 nhân viên (Ngã 3 Long Bình Tân, Ngã 3 Cát Lái, Chợ Gò Vấp)
```

#### Sau khi áp dụng logic mới (với overflow):
```
HCM01: 15 nhân viên (xe 15 chỗ)
HCM02: 15 nhân viên (xe 15 chỗ) - bao gồm Ngã 3 Long Bình Tân, Bà Chiểu, Chợ Gò Vấp, Hóc Môn
BH01: 9 + 4 nhân viên dư thừa = 13 nhân viên (tất cả từ BH01, BH02, BH03 tại trạm trước/tại Hàng xanh + 4 nhân viên HCM trùng trạm BH)
BH02: 1 nhân viên (Bà Chiểu - trạm sau Hàng xanh)
BH03: 1 nhân viên (Chợ Gò Vấp - trạm sau Hàng xanh)

Tổng: HCM01 (15) + HCM02 (15) = 30 nhân viên trong 2 xe 15 chỗ
Dư thừa: 4 nhân viên HCM có trạm trùng với BH được chuyển sang BH01
```

### 5. Logic Overflow cho HCM Routes (Đã cập nhật)

Khi tổng số nhân viên HCM vượt quá khả năng của 2 xe 15 chỗ (30 chỗ):

1. **Ưu tiên phân bổ**:
   - HCM01: Bao gồm các trạm ưu tiên (Đinh Tiên Hoàng-ĐBP, Hai Bà Trưng-ĐBP, BV Hòa Hảo)
   - HCM02: Bao gồm các trạm ưu tiên (Bà Chiểu, Chợ Gò Vấp, Hóc Môn, Trường Lý Tự Trọng)
   - Mỗi tuyến tối đa 15 nhân viên (xe 15 chỗ)

2. **Logic Overflow mới - Ưu tiên Thủ Đức đi Taxi**:
   - **Ưu tiên cao nhất**: Tách số dư từ trạm **Thủ Đức** trước - **đi taxi**
   - **Tối ưu chi phí**: Sau khi tách hết Thủ Đức đi taxi, các trạm khác sẽ đi tuyến BH theo thứ tự gần-xa
   - **Thứ tự ưu tiên tối ưu chi phí cho BH routes**:
     1. Ngã 3 Bến Gỗ
     2. Ngã 3 Long Bình Tân
     3. RMK
     4. Ngã 3 Cát Lái
     5. Hàng Xanh
     6. Bà Chiểu
     7. Chợ Gò Vấp
     8. Hóc Môn
     9. Đinh Tiên Hoàng
     10. Hai Bà Trưng
     11. BV Hòa Hảo
     12. Trường Lý Tự Trọng

3. **Mapping sang tuyến BH gần nhất** (chỉ áp dụng cho các trạm không phải Thủ Đức):
   - **Ngã 3 Bến Gỗ, Ngã 3 Long Bình Tân** → **BH03**
   - **RMK, Ngã 3 Cát Lái, Hàng Xanh, Đinh Tiên Hoàng, Hai Bà Trưng, BV Hòa Hảo** → **BH01**
   - **Bà Chiểu, Chợ Gò Vấp, Hóc Môn, Trường Lý Tự Trọng** → **BH02**
   - **Thủ Đức dư thừa** → **TAXI** (không phân bổ vào tuyến BH)

4. **Tính toán tự động**:
   - Hệ thống tự động tính toán số nhân viên dư thừa
   - Ưu tiên tách từ Thủ Đức đi taxi trước, sau đó các trạm khác theo thứ tự tối ưu chi phí đi BH
   - Đảm bảo tối ưu hóa việc sử dụng xe và giảm chi phí vận chuyển

### 6. Ví dụ Logic Overflow mới

**Trường hợp**: Có 35 nhân viên HCM với 2 xe 15 chỗ (30 chỗ), dư 5 nhân viên

**Phân bổ nhân viên theo trạm**:
- Thủ Đức: 8 nhân viên
- Ngã 3 Bến Gỗ: 3 nhân viên
- Ngã 3 Long Bình Tân: 4 nhân viên
- RMK: 2 nhân viên
- Bà Chiểu: 5 nhân viên
- Chợ Gò Vấp: 6 nhân viên
- Hóc Môn: 3 nhân viên
- Đinh Tiên Hoàng: 2 nhân viên
- Hai Bà Trưng: 2 nhân viên

**Logic Overflow áp dụng**:

1. **Ưu tiên Thủ Đức đi Taxi**: Tách 5 nhân viên từ Thủ Đức đi taxi
2. **Không phân bổ vào BH**: Thủ Đức dư thừa không đi tuyến BH

**Kết quả cuối cùng**:
```
HCM01: 15 nhân viên (xe 15 chỗ)
- Ngã 3 Bến Gỗ: 3 nhân viên
- Ngã 3 Long Bình Tân: 4 nhân viên
- RMK: 2 nhân viên
- Đinh Tiên Hoàng: 2 nhân viên
- Hai Bà Trưng: 2 nhân viên
- Các trạm khác: 2 nhân viên

HCM02: 15 nhân viên (xe 15 chỗ)
- Bà Chiểu: 5 nhân viên
- Chợ Gò Vấp: 6 nhân viên
- Hóc Môn: 3 nhân viên
- Các trạm khác: 1 nhân viên

TAXI: 5 nhân viên (từ Thủ Đức)
- Thủ Đức: 5 nhân viên

Tổng: HCM01 (15) + HCM02 (15) + TAXI (5) = 35 nhân viên
```

**Trường hợp khác**: Nếu chỉ có 2 nhân viên Thủ Đức nhưng dư 5 nhân viên

**Logic Overflow**:
1. **Ưu tiên Thủ Đức đi Taxi**: Tách 2 nhân viên từ Thủ Đức đi taxi
2. **Tối ưu chi phí cho BH**: Tách thêm 3 nhân viên từ Ngã 3 Bến Gỗ (gần nhất) đi BH03
3. **Kết quả**: 2 Thủ Đức → TAXI, 3 Ngã 3 Bến Gỗ → BH03

## Các file đã được cập nhật

### 1. `src/app/services/pdf-export.service.ts`
- Thêm phương thức `applyHCMGroupingPriority()`
- Thêm phương thức `isStationBeforeOrAtHangXanh()`
- Cập nhật `isHCM02PriorityStation()` để bao gồm Chợ Gò Vấp và Hóc Môn
- Cập nhật `groupRegistrationsByRoute()` để áp dụng logic mới

### 2. `src/app/services/pdf-export-employee-station.service.ts`
- Thêm phương thức `applyHCMGroupingPriority()`
- Thêm phương thức `isStationBeforeOrAtHangXanh()`
- Cập nhật `isHCM02PriorityStation()` để bao gồm Chợ Gò Vấp và Hóc Môn
- Cập nhật `groupEmployeesByRouteAndStation()` để áp dụng logic mới

### 3. `src/app/services/employee-allocation.service.ts`
- Thêm phương thức `applyHCMGroupingPriority()`
- Thêm phương thức `isStationBeforeOrAtHangXanh()`
- Cập nhật `isHCM02PriorityStation()` để bao gồm Chợ Gò Vấp và Hóc Môn
- Cập nhật `groupEmployeesByRouteAndStation()` để áp dụng logic mới

### 4. `src/app/components/dangkyxe/dangkyxe.component.ts`
- Cập nhật `isHCM02PriorityStation()` để bao gồm Chợ Gò Vấp và Hóc Môn
- Cập nhật `applyHCMGroupingPriority()` để áp dụng logic mới

### 5. `src/app/examples/hcm02-grouping-priority-test.example.ts`
- Cập nhật test case để bao gồm các trạm ưu tiên mới
- Bao gồm các test case cho Chợ Gò Vấp và Hóc Môn

## Cách sử dụng

Logic mới sẽ tự động được áp dụng khi:
1. Xuất PDF báo cáo đăng ký xe
2. Xuất PDF báo cáo nhân viên theo trạm
3. Phân bổ nhân viên theo tuyến đường
4. Đăng ký xe và phân công tài xế

Không cần thay đổi gì trong giao diện người dùng.

## Test và kiểm tra

Để test logic mới, có thể sử dụng file test case:
```typescript
import { testHCM02PriorityInGrouping } from './examples/hcm02-grouping-priority-test.example';
testHCM02PriorityInGrouping();
```

## Lưu ý quan trọng

1. **Tính nhất quán**: Logic mới được áp dụng đồng bộ trên tất cả các service và component
2. **Tương thích ngược**: Các tuyến khác (BH, T1, T2, v.v.) không bị ảnh hưởng
3. **Linh hoạt**: Có thể dễ dàng thay đổi danh sách trạm ưu tiên HCM02 nếu cần
4. **Hiệu suất**: Logic kiểm tra trạm được tối ưu để không ảnh hưởng đến hiệu suất
5. **Ưu tiên HCM02**: Chợ Gò Vấp và Hóc Môn (Chùa Hoằng Pháp) sẽ được ưu tiên phân bổ vào HCM02

## Cập nhật trong tương lai

Nếu cần thay đổi danh sách trạm ưu tiên HCM02, chỉ cần cập nhật mảng `hcm02PriorityStations` trong các phương thức `isHCM02PriorityStation()` của tất cả các service và component.
