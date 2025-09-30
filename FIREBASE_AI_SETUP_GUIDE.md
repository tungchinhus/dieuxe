# Hướng dẫn tích hợp Firebase AI Logic vào Dieuxe

## Tổng quan
Hướng dẫn này sẽ giúp bạn tích hợp Firebase AI Logic (Vertex AI) vào ứng dụng web Dieuxe để thêm các chức năng AI thông minh.

## Các bước đã thực hiện

### 1. ✅ Cài đặt Dependencies
```bash
npm install @google-cloud/aiplatform @google-cloud/vertexai
```

### 2. ✅ Cập nhật Firebase Configuration
- Thêm Firebase Functions vào `src/firebase.config.ts`
- Export functions instance để sử dụng trong AI service

### 3. ✅ Tạo AI Logic Service
- File: `src/app/services/ai-logic.service.ts`
- Cung cấp các method để gọi AI functions:
  - `analyzeVehicleData()` - Phân tích dữ liệu xe
  - `optimizeRoute()` - Tối ưu hóa tuyến đường
  - `predictDemand()` - Dự đoán nhu cầu
  - `analyzeEmployeePerformance()` - Phân tích hiệu suất nhân viên
  - `generateSmartReport()` - Tạo báo cáo thông minh
  - `getSystemImprovements()` - Đề xuất cải thiện hệ thống

### 4. ✅ Tạo AI Demo Component
- File: `src/app/components/ai-demo/ai-demo.component.ts`
- Giao diện demo để test các chức năng AI
- Hỗ trợ 6 loại chức năng AI khác nhau
- Có sẵn dữ liệu mẫu để test

### 5. ✅ Tạo Firebase Cloud Functions
- File: `functions/index.js`
- 6 Cloud Functions tương ứng với 6 chức năng AI
- Xử lý logic AI và trả về kết quả

### 6. ✅ Cập nhật Routes
- Thêm route `/ai-demo` vào `src/app/app.routes.ts`
- Bảo vệ bằng AuthGuard

### 7. ✅ Cập nhật Navigation
- Thêm link "AI Demo" vào user menu trong header

## Các bước triển khai tiếp theo

### Bước 1: Deploy Firebase Functions
```bash
# Cài đặt dependencies cho functions
cd functions
npm install

# Deploy functions lên Firebase
firebase deploy --only functions
```

### Bước 2: Cấu hình Firebase Console
1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Chọn project `skyjoyweb-da255`
3. Vào **Functions** và kiểm tra các functions đã deploy
4. Vào **Authentication** và cấu hình nếu cần

### Bước 3: Cấu hình Vertex AI (Tùy chọn)
Nếu muốn sử dụng Vertex AI thực tế:
1. Vào **Google Cloud Console**
2. Enable Vertex AI API
3. Cấu hình service account
4. Cập nhật Cloud Functions để sử dụng Vertex AI

### Bước 4: Test ứng dụng
1. Chạy ứng dụng: `npm start`
2. Đăng nhập vào hệ thống
3. Click vào user menu → "AI Demo"
4. Test các chức năng AI khác nhau

## Cách sử dụng AI Demo

### 1. Phân tích dữ liệu xe
- Chọn "Phân tích dữ liệu xe"
- Nhập dữ liệu JSON về xe (có sẵn mẫu)
- Click "Gọi AI" để xem kết quả phân tích

### 2. Tối ưu hóa tuyến đường
- Chọn "Tối ưu hóa tuyến đường"
- Nhập dữ liệu về routes và vehicles
- Xem đề xuất tối ưu hóa

### 3. Dự đoán nhu cầu
- Chọn "Dự đoán nhu cầu"
- Nhập dữ liệu lịch sử và yếu tố ảnh hưởng
- Xem dự đoán cho các tháng tới

### 4. Phân tích nhân viên
- Chọn "Phân tích nhân viên"
- Nhập dữ liệu hiệu suất nhân viên
- Xem đánh giá và đề xuất

### 5. Tạo báo cáo thông minh
- Chọn "Tạo báo cáo thông minh"
- Chọn loại báo cáo và tham số
- Xem báo cáo được tạo tự động

### 6. Đề xuất cải thiện hệ thống
- Chọn "Đề xuất cải thiện hệ thống"
- Nhập dữ liệu hệ thống hiện tại
- Xem các đề xuất cải thiện

## Cấu trúc dữ liệu mẫu

### Dữ liệu xe
```json
{
  "vehicleId": "X001",
  "type": "Xe đưa đón",
  "capacity": 30,
  "currentLocation": "Trung tâm thành phố",
  "maintenanceHistory": ["2024-01-15: Thay dầu", "2024-03-20: Kiểm tra phanh"],
  "fuelEfficiency": 8.5,
  "driverExperience": 5
}
```

### Dữ liệu tuyến đường
```json
{
  "routes": [
    { "id": "R001", "start": "Điểm A", "end": "Điểm B", "distance": 15, "traffic": "Cao" },
    { "id": "R002", "start": "Điểm B", "end": "Điểm C", "distance": 20, "traffic": "Thấp" }
  ],
  "vehicles": [
    { "id": "V001", "capacity": 30, "currentLocation": "Điểm A" },
    { "id": "V002", "capacity": 25, "currentLocation": "Điểm B" }
  ]
}
```

## Troubleshooting

### Lỗi "Function not found"
- Kiểm tra Firebase Functions đã deploy chưa
- Kiểm tra tên function trong code có đúng không

### Lỗi "Permission denied"
- Kiểm tra user đã đăng nhập chưa
- Kiểm tra quyền truy cập trong Firebase Rules

### Lỗi "Network error"
- Kiểm tra kết nối internet
- Kiểm tra Firebase project configuration

## Mở rộng trong tương lai

1. **Tích hợp Vertex AI thực tế** - Sử dụng các mô hình AI của Google
2. **Machine Learning models** - Train custom models cho dữ liệu cụ thể
3. **Real-time AI** - Xử lý dữ liệu real-time với AI
4. **Advanced Analytics** - Thêm các tính năng phân tích nâng cao
5. **AI Chatbot** - Tích hợp chatbot AI để hỗ trợ người dùng

## Liên hệ hỗ trợ

Nếu gặp vấn đề trong quá trình triển khai, vui lòng:
1. Kiểm tra logs trong Firebase Console
2. Kiểm tra browser console để xem lỗi
3. Tham khảo tài liệu Firebase AI Logic
4. Liên hệ team phát triển để được hỗ trợ
