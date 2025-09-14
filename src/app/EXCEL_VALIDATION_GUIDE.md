# Hướng dẫn Excel Validation

## Tổng quan

Chức năng Excel Validation được thiết kế để kiểm tra dữ liệu khi import file Excel theo 2 tiêu chí chính:

1. **Họ tên không có trong danh sách nhân viên** - Kiểm tra tên nhân viên có tồn tại trong database không
2. **Tên trạm xe không tồn tại trong quản lý tuyến đường** - Kiểm tra tên điểm dừng có tồn tại trong chi tiết tuyến đường không

## Cách hoạt động

### 1. Quy trình validation

```typescript
// Khi import file Excel
const { registrations, validationResult } = await this.excelService.readExcelFileWithValidation(file);

// Kiểm tra có lỗi validation không
if (validationResult.totalInvalid > 0) {
  // Hiển thị dialog thông báo lỗi
  const dialogRef = this.dialog.open(EmployeeValidationDialogComponent, {
    width: '800px',
    data: validationResult
  });
}
```

### 2. Cấu trúc dữ liệu validation

```typescript
interface EmployeeValidationResult {
  invalidEmployees: {
    name: string;
    issues: string[];
  }[];
  invalidStations: {
    name: string;
    station: string;
    issues: string[];
  }[];
  totalProcessed: number;
  totalValid: number;
  totalInvalid: number;
}
```

## Các tiêu chí kiểm tra

### 1. Kiểm tra họ tên nhân viên

- **Mục đích**: Đảm bảo tên nhân viên trong Excel có tồn tại trong database
- **Cách kiểm tra**: So sánh tên trong Excel với danh sách nhân viên trong bảng `nhanVien`
- **Kết quả**: Nếu không tìm thấy, thêm vào danh sách `invalidEmployees`

```typescript
// Logic kiểm tra
const dbEmployee = allEmployees.find(emp => 
  emp.HoTen?.toLowerCase().trim() === reg.hoTen?.toLowerCase().trim()
);

if (!dbEmployee) {
  invalidEmployees.push({
    name: reg.hoTen,
    issues: [`Họ tên "${reg.hoTen}" không có trong danh sách nhân viên`]
  });
}
```

### 2. Kiểm tra tên trạm xe

- **Mục đích**: Đảm bảo tên trạm xe trong Excel có tồn tại trong quản lý tuyến đường
- **Cách kiểm tra**: So sánh tên trạm xe với danh sách điểm dừng trong bảng `chiTietTuyenDuong`
- **Kết quả**: Nếu không tìm thấy, thêm vào danh sách `invalidStations`

```typescript
// Logic kiểm tra
const stationExists = allRouteDetails.some(route => 
  route.TenDiemDon?.toLowerCase().trim() === reg.tramXe?.toLowerCase().trim()
);

if (!stationExists) {
  invalidStations.push({
    name: reg.hoTen || 'Không xác định',
    station: reg.tramXe,
    issues: [`Tên trạm xe "${reg.tramXe}" không tồn tại trong quản lý tuyến đường`]
  });
}
```

## Dialog thông báo

### Giao diện dialog

Dialog hiển thị 2 phần chính:

1. **Nhân viên không có trong danh sách** - Hiển thị danh sách tên nhân viên không tồn tại
2. **Trạm xe không tồn tại** - Hiển thị danh sách tên trạm xe không có trong quản lý tuyến đường

### Các nút hành động

- **Đóng**: Hủy import và quay lại
- **Tiếp tục import**: Bỏ qua các lỗi và tiếp tục import dữ liệu hợp lệ

## Cách sử dụng

### 1. Import thông thường

```typescript
// Trong component
async onFileSelected(event: any): Promise<void> {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const { registrations, validationResult } = await this.excelService.readExcelFileWithValidation(file);
    
    if (validationResult.totalInvalid > 0) {
      // Hiển thị dialog validation
      const dialogRef = this.dialog.open(EmployeeValidationDialogComponent, {
        width: '800px',
        data: validationResult
      });

      const shouldContinue = await dialogRef.afterClosed().toPromise();
      if (!shouldContinue) return;
    }

    // Tiếp tục xử lý dữ liệu
    await this.processValidData(registrations);
    
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### 2. Test component

Sử dụng `ExcelValidationTestComponent` để test chức năng:

```typescript
// Trong app.routes.ts
{
  path: 'excel-validation-test',
  component: ExcelValidationTestComponent
}
```

## Cấu trúc file Excel

File Excel cần có cấu trúc như sau:

| Cột | Tên | Mô tả | Bắt buộc |
|-----|-----|-------|----------|
| A | STT | Số thứ tự | ✓ |
| B | Mã nhân viên | Mã nhân viên | ✓ |
| C | Họ và tên | Tên đầy đủ | ✓ |
| D | Trạm xe | Tên trạm xe | ✓ |
| E | Điện thoại | Số điện thoại | |
| F | Nội dung công việc | Mô tả công việc | |
| G | Ca | Loại ca | |
| H | Thời gian làm việc (Từ...) | Thời gian bắt đầu | |
| I | Thời gian làm việc (Đến...) | Thời gian kết thúc | |

## Xử lý trường hợp đặc biệt

### 1. Trường hợp "Tự túc"

Các dòng có trạm xe là "tự túc", "tu tu", hoặc "tutuc" sẽ được bỏ qua trong quá trình validation.

### 2. So sánh không phân biệt hoa thường

Tất cả các so sánh tên và trạm xe đều không phân biệt hoa thường để tăng độ chính xác.

### 3. Cache dữ liệu

Dữ liệu nhân viên được cache trong 5 phút để tối ưu hiệu suất.

## Troubleshooting

### 1. Lỗi "Property does not exist"

Đảm bảo sử dụng đúng tên thuộc tính:
- `TenDiemDon` (không phải `TenDiemDung`)
- `HoTen` (không phải `hoTen`)

### 2. Dialog không hiển thị

Kiểm tra:
- Import `EmployeeValidationDialogComponent` đúng cách
- Truyền `validationResult` vào `data` của dialog
- Đảm bảo `totalInvalid > 0`

### 3. Validation không chính xác

Kiểm tra:
- Dữ liệu trong database có đầy đủ không
- Tên trong Excel có khoảng trắng thừa không
- So sánh có đúng case-insensitive không

## Ví dụ

Xem file `src/app/examples/excel-validation-test.example.ts` để có ví dụ chi tiết về cách sử dụng.
