# Hướng dẫn Kiểm tra Trùng lặp Dữ liệu Import

## Tổng quan

Hệ thống đã được cải thiện với tính năng kiểm tra trùng lặp dữ liệu khi import file Excel, dựa trên **tên nhân viên** và **trạm xe**. Tính năng này giúp đảm bảo tính toàn vẹn dữ liệu và tránh việc tạo ra các bản ghi trùng lặp.

## Cách hoạt động

### 1. Kiểm tra trùng lặp tự động

Khi import file Excel, hệ thống sẽ tự động kiểm tra:

- **Trùng lặp với dữ liệu hiện có**: So sánh với tất cả đăng ký đã có trong Firebase
- **Trùng lặp trong file import**: Kiểm tra các bản ghi trùng lặp trong cùng một file Excel

### 2. Tiêu chí kiểm tra trùng lặp

Dữ liệu được coi là trùng lặp khi có **cùng 3 thông tin**:
- **Họ và tên** (không phân biệt hoa thường)
- **Trạm xe** (không phân biệt hoa thường)  
- **Ngày đăng ký** (chỉ kiểm tra cho ngày hiện tại)

**Lưu ý quan trọng**: Hệ thống chỉ kiểm tra trùng lặp cho dữ liệu có ngày đăng ký là ngày hôm nay. Dữ liệu của các ngày khác sẽ được import bình thường mà không kiểm tra trùng lặp.

### 3. Xử lý dữ liệu trùng lặp

Khi phát hiện trùng lặp, hệ thống sẽ hiển thị dialog thông báo với:

#### Thông tin hiển thị
- **Tổng số bản ghi**: Số lượng dòng trong file Excel
- **Dữ liệu hợp lệ**: Số bản ghi không bị trùng lặp
- **Dữ liệu trùng lặp**: Số bản ghi bị trùng lặp
- **Danh sách chi tiết**: Hiển thị tên nhân viên và trạm xe của từng bản ghi trùng lặp

#### Hành động
- **Chỉ hiển thị thông báo**: Dialog chỉ để thông báo, không có các tùy chọn xử lý phức tạp
- **Tự động xử lý**: Hệ thống tự động bỏ qua dữ liệu trùng lặp và chỉ lưu dữ liệu hợp lệ
- **Thông báo kết quả**: Hiển thị thông báo về số lượng dữ liệu đã được lưu và bỏ qua

## Giao diện Dialog

### Thông tin tổng quan
- **Tổng số bản ghi**: Tổng số dòng trong file Excel
- **Dữ liệu hợp lệ**: Số bản ghi không bị trùng lặp
- **Dữ liệu trùng lặp**: Số bản ghi bị trùng lặp
- **Đã chọn**: Số bản ghi trùng lặp được chọn để ghi đè

### Bảng chi tiết trùng lặp
Hiển thị thông tin chi tiết của từng bản ghi trùng lặp:
- **Họ và tên** + Mã nhân viên
- **Trạm xe**
- **Ngày đăng ký**
- **Lý do trùng lặp**: Giải thích tại sao bị coi là trùng lặp

### Các nút hành động
- **Hủy import**: Dừng quá trình import
- **Tiếp tục (bỏ qua trùng lặp)**: Import chỉ dữ liệu hợp lệ
- **Import đã chọn**: Import dữ liệu hợp lệ + dữ liệu trùng lặp đã chọn (ghi đè)

## Các trường hợp sử dụng

### Trường hợp 1: Import dữ liệu mới hoàn toàn
- Không có trùng lặp
- Import bình thường, không cần xử lý đặc biệt

### Trường hợp 2: Import có một số trùng lặp
- Chọn "Tiếp tục (bỏ qua trùng lặp)" để import dữ liệu mới
- Dữ liệu cũ được giữ nguyên

### Trường hợp 3: Cập nhật dữ liệu hiện có
- Chọn các bản ghi cần cập nhật
- Chọn "Import đã chọn" để ghi đè dữ liệu cũ

### Trường hợp 4: Import hỗn hợp
- Một phần dữ liệu mới, một phần cần cập nhật
- Chọn linh hoạt từng bản ghi cần xử lý

## Lợi ích

### 1. Đảm bảo tính toàn vẹn dữ liệu
- Tránh tạo ra các bản ghi trùng lặp
- Duy trì tính nhất quán của dữ liệu

### 2. Linh hoạt trong xử lý
- Người dùng có quyền kiểm soát hoàn toàn
- Có thể chọn xử lý từng bản ghi cụ thể

### 3. Thông tin rõ ràng
- Hiển thị chi tiết lý do trùng lặp
- Thống kê tổng quan dễ hiểu

### 4. An toàn
- Không tự động ghi đè dữ liệu
- Yêu cầu xác nhận rõ ràng từ người dùng

## Lưu ý quan trọng

### 1. Kiểm tra kỹ trước khi ghi đè
- Xem xét kỹ dữ liệu cũ và mới
- Đảm bảo dữ liệu mới chính xác hơn

### 2. Backup dữ liệu
- Nên backup dữ liệu trước khi import số lượng lớn
- Có thể khôi phục nếu cần thiết

### 3. Kiểm tra sau import
- Xem lại kết quả import
- Đảm bảo dữ liệu được lưu đúng

## Xử lý lỗi

### Lỗi thường gặp
1. **File Excel không đúng định dạng**: Kiểm tra cấu trúc cột
2. **Dữ liệu thiếu thông tin bắt buộc**: Kiểm tra các trường bắt buộc
3. **Lỗi kết nối Firebase**: Kiểm tra kết nối mạng

### Khắc phục
- Kiểm tra file Excel trước khi import
- Đảm bảo kết nối mạng ổn định
- Liên hệ admin nếu cần hỗ trợ

## Kết luận

Tính năng kiểm tra trùng lặp giúp quản lý dữ liệu hiệu quả và an toàn. Người dùng nên nắm rõ các tùy chọn xử lý để sử dụng tối ưu tính năng này.
