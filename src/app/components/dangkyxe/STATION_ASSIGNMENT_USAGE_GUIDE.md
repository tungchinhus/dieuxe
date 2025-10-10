# Hướng dẫn sử dụng tính năng Phân công Tài xế và Xe

## Tổng quan
Tính năng **Phân công Tài xế và Xe** đã được tích hợp vào màn hình **Đăng ký Xe** để cho phép người dùng phân công tài xế và xe cho các trạm cụ thể, sau đó xuất báo cáo PDF chuyên nghiệp.

## Vị trí tính năng
- **Trang**: Quản lý Đăng ký Xe (`/dangkyxe`)
- **Nút**: Xuất PDF → Phân công tài xế và xe
- **Menu**: Dropdown menu bên cạnh nút "Xuất PDF"

## Cách sử dụng

### Bước 1: Truy cập tính năng
1. Vào trang **"Quản lý Đăng ký Xe"**
2. Nhấn nút **"Xuất PDF"** (màu accent)
3. Chọn **"Phân công tài xế và xe"** từ menu dropdown

### Bước 2: Phân công tài xế và xe
1. **Dialog phân công** sẽ mở ra với danh sách các trạm
2. **Tổng quan** hiển thị:
   - Tổng số trạm
   - Tổng số nhân viên
   - Số trạm đã phân công
3. **Cho mỗi trạm**:
   - Chọn **tài xế** từ dropdown
   - Chọn **xe** từ dropdown
   - Kiểm tra trạng thái (màu xanh = hoàn thành, màu cam = chưa hoàn thành)

### Bước 3: Xuất PDF
1. Đảm bảo **tất cả trạm đều được phân công**
2. Nút **"Xuất PDF"** sẽ active khi validation pass
3. Nhấn **"Xuất PDF"** để tạo file báo cáo
4. File PDF sẽ được tải xuống với tên: `PhanCongTaiXeVaXe_YYYYMMDD.pdf`

## Cấu trúc PDF báo cáo

### Header
- **Tiêu đề**: "BÁO CÁO PHÂN CÔNG TÀI XẾ VÀ XE THEO TRẠM"
- **Màu nền**: Xanh dương công ty

### Tổng quan
- **Ngày xuất báo cáo**: Thời gian tạo file
- **Tổng số trạm**: Số lượng trạm được phân công
- **Tổng số nhân viên**: Tổng số nhân viên của tất cả trạm
- **Tổng số xe**: Số lượng xe được phân công

### Chi tiết từng trạm
Mỗi trạm bao gồm:
- **Tên trạm và tuyến**: Ví dụ "BV Hòa Hảo - HCM01"
- **Số nhân viên**: Số lượng nhân viên tại trạm
- **Thông tin tài xế**:
  - Tên tài xế
  - Số điện thoại
  - Số bằng lái (nếu có)
- **Thông tin xe**:
  - Biển số xe
  - Loại xe (16 chỗ, 29 chỗ, 45 chỗ, taxi 7 chỗ)
  - Sức chứa

### Footer
- **Thông tin hệ thống**: "Báo cáo được tạo bởi hệ thống Thibidi"
- **Số trang**: Hiển thị trang hiện tại

## Dữ liệu mẫu

### Tài xế mẫu
- **Nguyễn Văn An** (0901234567) - Bằng lái: A123456789
- **Trần Thị Bình** (0901234568) - Bằng lái: B123456789
- **Lê Văn Cường** (0901234569) - Bằng lái: C123456789
- **Phạm Thị Dung** (0901234570) - Bằng lái: D123456789
- **Hoàng Văn Em** (0901234571) - Bằng lái: E123456789

### Trạm mẫu
- **BV Hòa Hảo** (HCM01) - 25 nhân viên
- **Ngã 4 Thủ Đức** (HCM01) - 18 nhân viên
- **Bà Chiểu** (HCM02) - 12 nhân viên
- **Chợ Gò Vấp** (HCM02) - 8 nhân viên
- **Trung tâm Quận 1** (HCM03) - 35 nhân viên

### Xe mẫu
- **51A-12345** - Xe 16 chỗ - Tài xế: Nguyễn Văn A
- **51B-67890** - Xe 29 chỗ - Tài xế: Trần Thị B
- **51C-11111** - Xe 45 chỗ - Tài xế: Lê Văn C
- **51D-22222** - Xe taxi 7 chỗ - Tài xế: Phạm Thị D
- **51E-33333** - Xe 16 chỗ - Tài xế: Hoàng Văn E

## Tính năng đặc biệt

### Validation thông minh
- **Kiểm tra đầy đủ**: Tất cả trạm phải có tài xế và xe
- **Nút xuất PDF**: Chỉ active khi validation pass
- **Thông báo lỗi**: Rõ ràng và hữu ích

### Giao diện thân thiện
- **Responsive design**: Hoạt động tốt trên mọi thiết bị
- **Trạng thái trực quan**: Màu sắc cho biết trạng thái phân công
- **Progress tracking**: Hiển thị tiến độ phân công

### PDF chuyên nghiệp
- **Format chuẩn**: A4, font chữ rõ ràng
- **Layout đẹp**: Header, content, footer cân đối
- **Thông tin đầy đủ**: Tất cả thông tin cần thiết

## Lưu ý quan trọng

### Quyền truy cập
- Tính năng này có sẵn cho tất cả người dùng
- Không yêu cầu quyền admin đặc biệt

### Dữ liệu
- **Hiện tại**: Sử dụng dữ liệu mẫu (mock data)
- **Tương lai**: Sẽ tích hợp với Firebase để lấy dữ liệu thực

### Hiệu suất
- **Dialog responsive**: Tối đa 95vw x 90vh
- **Scrollable**: Nội dung có thể cuộn khi cần
- **Loading states**: Hiển thị trạng thái loading khi xuất PDF

## Troubleshooting

### Lỗi thường gặp
1. **"Không có dữ liệu xe để phân công"**
   - Nguyên nhân: Không có xe nào trong hệ thống
   - Giải pháp: Thêm xe vào hệ thống trước

2. **"Vui lòng hoàn thành việc phân công cho tất cả các trạm"**
   - Nguyên nhân: Còn trạm chưa được phân công
   - Giải pháp: Kiểm tra và phân công đầy đủ

3. **"Có lỗi xảy ra khi tạo file PDF"**
   - Nguyên nhân: Lỗi hệ thống hoặc trình duyệt
   - Giải pháp: Thử lại hoặc kiểm tra trình duyệt

### Hỗ trợ
Nếu gặp vấn đề, vui lòng:
1. Kiểm tra console browser (F12)
2. Thử refresh trang
3. Liên hệ admin hệ thống
