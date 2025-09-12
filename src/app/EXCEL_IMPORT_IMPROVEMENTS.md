# Cải thiện Import Excel cho Đăng ký xe

## Tổng quan

Đã cải thiện logic import Excel trong `ExcelService` để lấy thông tin tuyến xe (`maTuyenXe`) dựa trên:
- **Họ và tên** (`hoTen`) - Cột C
- **Trạm xe** (`tramXe`) - Cột D  
- **Quản lý nhân viên** (`quanLyNhanVien`) - Cột G (nếu có)

## Các cải tiến chính

### 1. Database Lookup với Cache
- Tích hợp với `FirestoreService` để lấy dữ liệu nhân viên từ database
- Implement cache 5 phút để tối ưu hiệu suất
- Fallback về hardcoded mapping nếu không tìm thấy trong database

### 2. Logic tìm kiếm thông minh
```typescript
// Thứ tự ưu tiên tìm kiếm:
1. Exact match: Tên + Trạm xe
2. Fuzzy match: Tên (nếu trạm không khớp)
3. Manager lookup: Dựa trên quản lý nhân viên
4. Station lookup: Tuyến phổ biến nhất tại trạm
5. Hardcoded fallback: Mapping cố định
```

### 3. Fuzzy Name Matching
- So sánh tên chính xác
- So sánh tên chứa nhau
- So sánh họ (phần cuối của tên)

### 4. Error Handling & Logging
- Logging chi tiết cho debug
- Error handling với fallback
- Performance monitoring

## Cách sử dụng

### Import Excel thông thường
```typescript
const registrations = await this.excelService.readExcelFile(file);
// Tự động sử dụng logic mới để lấy maTuyenXe
```

### Test route lookup
```typescript
const result = await this.excelService.testRouteLookup(
  'Trạm xe Công Viên Tam Hiệp',
  'Lê Văn Thư',
  'Nguyễn Văn A' // optional
);
console.log(result);
```

## Cấu trúc Excel file

| Cột | Tên | Mô tả | Bắt buộc |
|-----|-----|-------|----------|
| A | STT | Số thứ tự | ✓ |
| B | Mã nhân viên | Mã nhân viên | ✓ |
| C | Họ và tên | Tên đầy đủ | ✓ |
| D | Trạm xe | Tên trạm xe | ✓ |
| E | Điện thoại | Số điện thoại | |
| F | Nội dung công việc | Mô tả công việc | |
| G | Quản lý nhân viên | Tên người quản lý | |
| H | Ca | Loại ca làm việc | |
| I | Thời gian bắt đầu | Giờ bắt đầu | |
| J | Thời gian kết thúc | Giờ kết thúc | |

## Mapping tuyến đường

### Database mapping (ưu tiên)
- Tìm trong database dựa trên tên nhân viên và trạm xe
- Sử dụng thông tin quản lý nếu có

### Hardcoded fallback
```typescript
'Tam Hiệp' | 'Công Viên' → 'T3'
'Thủ Đức' | 'Ngã 4' → 'T2'  
'BV 7B' | 'Bệnh viện' → 'T4'
'Huỳnh Văn Lũy' | 'Metro' → 'T1'
```

## Performance

- Cache dữ liệu nhân viên 5 phút
- Chỉ fetch database một lần cho mỗi file Excel
- Fallback nhanh khi không tìm thấy

## Debug & Monitoring

Tất cả các bước lookup đều được log:
```typescript
console.log(`Looking up route for: Station="${stationName}", Name="${hoTen}", Manager="${quanLyNhanVien}"`);
console.log(`Found exact match: ${matchingEmployee.HoTen}, Route: ${matchingEmployee.MaTuyenXe}`);
console.log(`Using most common route for station "${stationName}": ${mostCommonRoute}`);
```

## Lưu ý

1. **Database dependency**: Cần có dữ liệu nhân viên trong database
2. **Performance**: Cache giúp tối ưu nhưng vẫn cần kết nối database
3. **Fallback**: Luôn có hardcoded mapping làm backup
4. **Logging**: Có thể tắt logging trong production nếu cần
