# Hướng dẫn sử dụng Merge Cell trong PDF Export

## Tổng quan
Đã cập nhật chức năng xuất PDF để merge cell cho các nhân viên có cùng trạm xe, giúp bảng dữ liệu gọn gàng và dễ đọc hơn.

## Các thay đổi chính

### 1. PDF Export Service (`pdf-export.service.ts`)

#### Phương thức mới:
- `exportOvertimeReportPDF()`: Xuất phiếu báo làm thêm giờ với merge cell
- `groupRegistrationsByStation()`: Gom nhóm đăng ký theo trạm xe
- `generateOvertimeReportHTMLTemplate()`: Template HTML cho phiếu báo làm thêm giờ
- `generateOvertimeTableRowsWithMergedCells()`: Tạo hàng bảng với merge cell

#### Cải tiến:
- Merge cell cho cột "Trạm xe" khi nhân viên có cùng trạm
- Thời gian làm việc mặc định: 15h45 - 19h
- CSS styling cho merge cell với background màu xám nhạt
- Layout giống phiếu báo làm thêm giờ mẫu
- **Sắp xếp tuyến xe theo thứ tự ưu tiên**: HCM01, HCM02, HCM03, BH01, BH02, BH03, BH04
- **Loại bỏ nhân viên có trạm "tự túc"** khỏi PDF
- **Phân loại xe tự động** dựa trên số lượng nhân viên (chỉ tính toán nội bộ, không hiển thị)

### 2. Test Component (`pdf-export-test.component.ts`)

Component demo để test chức năng:
- Nút "Xuất PDF thường" - sử dụng phương thức cũ
- Nút "Xuất Phiếu Báo Làm Thêm Giờ (Merge Cell)" - sử dụng phương thức mới

## Cách sử dụng

### 1. Trong Component
```typescript
import { PdfExportService } from '../services/pdf-export.service';

constructor(private pdfExportService: PdfExportService) {}

// Xuất PDF thường
async exportRegularPDF() {
  await this.pdfExportService.exportToPDF();
}

// Xuất phiếu báo làm thêm giờ với merge cell
async exportOvertimeReportPDF() {
  await this.pdfExportService.exportOvertimeReportPDF();
}
```

### 2. Trong Template
```html
<button (click)="exportOvertimeReportPDF()">
  Xuất Phiếu Báo Làm Thêm Giờ
</button>
```

## Kết quả

### Trước khi merge cell:
```
| STT | Họ và tên | Trạm xe | Điện thoại | Từ... | Đến... | Ghi chú |
|-----|-----------|---------|------------|-------|--------|---------|
| 1   | Nguyễn A  | BV Hòa Hảo | 0901234567 | 15h45 | 19h    |         |
| 2   | Nguyễn B  | BV Hòa Hảo | 0901234568 | 15h45 | 19h    |         |
| 3   | Nguyễn C  | Ngã 4 Thủ Đức | 0901234569 | 15h45 | 19h    |         |
```

### Sau khi merge cell:
```
| STT | Họ và tên | Trạm xe | Điện thoại | Từ... | Đến... | Ghi chú |
|-----|-----------|---------|------------|-------|--------|---------|
| 1   | Nguyễn A  | BV Hòa Hảo | 0901234567 | 15h45 | 19h    |         |
| 2   | Nguyễn B  |         | 0901234568 | 15h45 | 19h    |         |
| 3   | Nguyễn C  | Ngã 4 Thủ Đức | 0901234569 | 15h45 | 19h    |         |
```

## Thứ tự sắp xếp tuyến xe

### Thứ tự ưu tiên:
1. **HCM01** - Tuyến Hồ Chí Minh 1
2. **HCM02** - Tuyến Hồ Chí Minh 2  
3. **HCM03** - Tuyến Hồ Chí Minh 3
4. **BH01** - Tuyến Biên Hòa 1
5. **BH02** - Tuyến Biên Hòa 2
6. **BH03** - Tuyến Biên Hòa 3
7. **BH04** - Tuyến Biên Hòa 4
8. **Các tuyến khác** - Sắp xếp theo thứ tự alphabet

### Chuẩn hóa tên tuyến:
- HCM1, HCM 1, TUYẾN HCM01 → HCM01
- BH1, BH 1, TUYẾN BH01 → BH01
- Tương tự cho các tuyến khác

## Phân loại xe tự động

### Quy tắc phân loại (tính toán nội bộ):
- **Dưới 7 người**: Sử dụng Taxi (1 taxi chở 4 người)
- **6-14 người**: Xe 16 chỗ
- **15-28 người**: Xe 29 chỗ  
- **29-44 người**: Xe 45 chỗ
- **Trên 44 người**: Nhiều xe 45 chỗ

**Lưu ý**: Thông tin phân loại xe chỉ được tính toán nội bộ để lọc dữ liệu, không hiển thị trong PDF để tránh làm rối layout.

### Loại bỏ trạm "tự túc":
- Tự động loại bỏ nhân viên có trạm chứa từ khóa: "tự túc", "tu tuc", "tự đi", "đi riêng"
- Không phân biệt hoa thường
- **Bỏ qua tuyến không có nhân viên**: Không tạo trang PDF cho tuyến không có nhân viên nào

## Xử lý trường hợp không có dữ liệu

### Khi không có nhân viên nào:
- **Hiển thị thông báo**: "Không có dữ liệu nhân viên để xuất PDF (tất cả nhân viên đều có trạm 'tự túc')"
- **Không tạo file PDF**: Hệ thống sẽ dừng lại và không tạo file trống

### Khi có tuyến không có nhân viên:
- **Bỏ qua tuyến trống**: Không tạo trang PDF cho tuyến không có nhân viên
- **Log thông tin**: Ghi log "Bỏ qua tuyến [TênTuyến] - không có nhân viên"
- **Chỉ tạo PDF cho tuyến có nhân viên**

## Lưu ý

1. **Merge cell chỉ áp dụng cho cột "Trạm xe"**
2. **Nhân viên được sắp xếp theo trạm xe trước khi merge**
3. **STT được đánh số liên tục**
4. **Thời gian làm việc mặc định là 15h45 - 19h nếu không có dữ liệu**
5. **Tuyến xe được sắp xếp theo thứ tự ưu tiên cố định**
6. **Không tạo trang trống cho tuyến không có nhân viên**

## File được tạo

- `PHIEU_BAO_LAM_THEM_GIO_YYYYMMDD.pdf` - Phiếu báo làm thêm giờ với merge cell
- `DANH_SACH_PHU_TROI_YYYYMMDD.pdf` - Danh sách phụ trội thường (không merge cell)

## Troubleshooting

### Lỗi thường gặp:
1. **Không có dữ liệu**: Kiểm tra Firebase connection và dữ liệu đăng ký
2. **PDF không hiển thị merge cell**: Kiểm tra browser support cho HTML2Canvas
3. **Layout bị lỗi**: Kiểm tra CSS styling trong template

### Debug:
```typescript
// Kiểm tra dữ liệu trước khi xuất PDF
console.log('Registrations:', todayRegistrations);
console.log('Grouped by station:', groupedByStation);
```
