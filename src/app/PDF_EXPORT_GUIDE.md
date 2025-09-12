# Hướng dẫn sử dụng chức năng Xuất PDF Nhân viên theo Trạm Xe

## Tổng quan

Chức năng xuất PDF này cho phép gom nhóm nhân viên theo tuyến đường và trạm xe, sau đó xuất ra file PDF với định dạng chuyên nghiệp.

## Cách sử dụng

### 1. Từ trang Quản lý Nhân viên

1. Truy cập vào **Quản lý Nhân viên** từ sidebar
2. Nhấn nút **"Xuất PDF theo Trạm"** (màu xanh lá)
3. Hệ thống sẽ tự động tạo và tải xuống file PDF

### 2. Từ trang Demo Xuất PDF

1. Truy cập vào **Demo Xuất PDF** từ sidebar
2. Nhấn nút **"Xuất PDF"**
3. Hệ thống sẽ tạo và tải xuống file PDF

## Cấu trúc PDF được tạo

### Header
- Tiêu đề: "DANH SÁCH NHÂN VIÊN THEO TRẠM XE"
- Phụ đề: "Phân bổ nhân viên theo tuyến đường và điểm đón"
- Ngày xuất file

### Tổng quan
- Tổng số tuyến đường
- Tổng số trạm/điểm đón
- Tổng số nhân viên

### Chi tiết theo tuyến
Mỗi tuyến đường sẽ có:
- Tên tuyến đường
- Số trạm và tổng nhân viên trong tuyến
- Danh sách các trạm theo thứ tự

### Chi tiết theo trạm
Mỗi trạm sẽ có:
- Tên trạm và số lượng nhân viên
- Bảng danh sách nhân viên với các cột:
  - STT
  - Mã nhân viên
  - Họ tên
  - Số điện thoại

## Quy tắc gom nhóm

### 1. Gom theo tuyến đường (MaTuyenXe)
- Tất cả nhân viên có cùng `MaTuyenXe` sẽ được gom vào một nhóm
- Các tuyến được sắp xếp theo thứ tự alphabet

### 2. Gom theo trạm xe (TramXe)
- Trong mỗi tuyến, nhân viên được gom theo `TramXe`
- Các trạm được sắp xếp theo thứ tự trong tuyến đường (dựa trên `RouteDetail.thuTu`)

### 3. Sắp xếp nhân viên
- Trong mỗi trạm, nhân viên được sắp xếp theo tên (HoTen)

## Xử lý dữ liệu thiếu

- Nhân viên chưa có `MaTuyenXe` sẽ được gom vào nhóm "Chưa phân tuyến"
- Nhân viên chưa có `TramXe` sẽ được gom vào nhóm "Chưa phân trạm"
- Các trường thiếu sẽ hiển thị dấu "-" trong PDF

## Tên file PDF

File PDF được lưu với tên: `DanhSachNhanVienTheoTramXe_YYYY-MM-DD_HH-MM.pdf`

## Yêu cầu hệ thống

- Angular 20+
- jsPDF 3.0+
- jspdf-autotable 5.0+
- Firebase (để lấy dữ liệu)

## Lưu ý

- PDF được tạo với định dạng A4
- Mỗi tuyến đường có thể tạo nhiều trang nếu có nhiều trạm
- Hệ thống tự động thêm số trang và footer
- File PDF được tối ưu hóa cho việc in ấn

## Xử lý lỗi

- Nếu không có dữ liệu nhân viên, hệ thống sẽ hiển thị thông báo
- Nếu có lỗi trong quá trình tạo PDF, hệ thống sẽ hiển thị thông báo lỗi
- Tất cả lỗi đều được ghi log vào console để debug

## Cấu hình nâng cao

Để tùy chỉnh PDF, có thể chỉnh sửa các tham số trong `PdfExportEmployeeStationService`:

- Font size và style
- Màu sắc và layout
- Kích thước bảng và cột
- Header và footer
