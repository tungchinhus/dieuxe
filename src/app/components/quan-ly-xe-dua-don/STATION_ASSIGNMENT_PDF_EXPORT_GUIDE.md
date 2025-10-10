# Station Assignment PDF Export Feature

## Tổng quan
Tính năng xuất PDF với phân công tài xế và xe cho các trạm cụ thể đã được thêm vào hệ thống quản lý xe đưa đón.

## Tính năng mới

### 1. Dialog Phân công Trạm
- **Component**: `StationAssignmentDialogComponent`
- **Vị trí**: `src/app/components/quan-ly-xe-dua-don/station-assignment-dialog/`
- **Chức năng**: 
  - Hiển thị danh sách các trạm cần phân công
  - Cho phép chọn tài xế cho từng trạm
  - Cho phép chọn xe cho từng trạm
  - Hiển thị tổng quan về số lượng trạm và nhân viên
  - Validation để đảm bảo tất cả trạm đều được phân công

### 2. Service Xuất PDF
- **Service**: `StationAssignmentPdfExportService`
- **Vị trí**: `src/app/services/station-assignment-pdf-export.service.ts`
- **Chức năng**:
  - Tạo PDF với thông tin phân công chi tiết
  - Header với tiêu đề và thông tin công ty
  - Tổng quan về số lượng trạm, nhân viên, xe
  - Chi tiết phân công cho từng trạm
  - Footer với thông tin trang và ngày tạo

### 3. Models Dữ liệu
- **Vị trí**: `src/app/models/vehicle.model.ts`
- **Interfaces mới**:
  - `StationAssignment`: Thông tin phân công trạm
  - `DriverInfo`: Thông tin tài xế
  - `VehicleInfo`: Thông tin xe
  - `PDFExportData`: Dữ liệu xuất PDF

## Cách sử dụng

### 1. Truy cập tính năng
1. Vào trang "Quản lý Xe Đưa Đón"
2. Nhấn nút "Phân công & Xuất PDF" (màu cam)
3. Dialog phân công sẽ mở ra

### 2. Phân công tài xế và xe
1. Chọn tài xế cho từng trạm từ dropdown
2. Chọn xe cho từng trạm từ dropdown
3. Kiểm tra trạng thái phân công (màu xanh = hoàn thành, màu cam = chưa hoàn thành)
4. Đảm bảo tất cả trạm đều được phân công

### 3. Xuất PDF
1. Nhấn nút "Xuất PDF" (chỉ active khi tất cả trạm đã được phân công)
2. File PDF sẽ được tải xuống với tên: `PhanCongTaiXeVaXe_YYYYMMDD.pdf`

## Cấu trúc PDF

### Header
- Tiêu đề: "BÁO CÁO PHÂN CÔNG TÀI XẾ VÀ XE THEO TRẠM"
- Màu nền xanh dương

### Tổng quan
- Ngày xuất báo cáo
- Tổng số trạm
- Tổng số nhân viên
- Tổng số xe

### Chi tiết từng trạm
- Tên trạm và tuyến
- Số nhân viên
- Thông tin tài xế (tên, SĐT, bằng lái)
- Thông tin xe (biển số, loại xe, sức chứa)

### Footer
- Thông tin hệ thống
- Số trang

## Dữ liệu mẫu

### Tài xế mẫu
- Nguyễn Văn An (0901234567)
- Trần Thị Bình (0901234568)
- Lê Văn Cường (0901234569)
- Phạm Thị Dung (0901234570)
- Hoàng Văn Em (0901234571)

### Trạm mẫu
- BV Hòa Hảo (HCM01) - 25 nhân viên
- Ngã 4 Thủ Đức (HCM01) - 18 nhân viên
- Bà Chiểu (HCM02) - 12 nhân viên
- Chợ Gò Vấp (HCM02) - 8 nhân viên
- Trung tâm Quận 1 (HCM03) - 35 nhân viên

## Responsive Design
- Dialog responsive với chiều rộng tối đa 95vw
- Chiều cao tối đa 90vh
- Scrollable content khi cần thiết
- Mobile-friendly layout

## Validation
- Kiểm tra tất cả trạm phải có tài xế
- Kiểm tra tất cả trạm phải có xe
- Nút xuất PDF chỉ active khi validation pass
- Thông báo lỗi rõ ràng

## Tương lai
- Tích hợp với Firebase để lấy dữ liệu thực
- Thêm tính năng lưu phân công vào database
- Thêm tính năng chỉnh sửa phân công
- Thêm template PDF tùy chỉnh
- Thêm tính năng gửi email PDF
