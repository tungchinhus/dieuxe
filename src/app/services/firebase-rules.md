# Firebase Security Rules cho Vehicle Management System

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Rules cho collection xeDuaDon
    match /xeDuaDon/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Rules cho collection lichTrinhXe
    match /lichTrinhXe/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Rules cho collection chiTietTuyenDuong
    match /chiTietTuyenDuong/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Rules cho collection dangKyPhanXe
    match /dangKyPhanXe/{document} {
      allow read, write: if request.auth != null;
      
      // Cho phép nhân viên chỉ đọc và tạo đăng ký của chính mình
      allow read, create: if request.auth != null 
        && (resource == null || resource.data.MaNhanVien == request.auth.uid);
      
      // Cho phép cập nhật đăng ký của chính mình trong vòng 24h
      allow update: if request.auth != null 
        && resource.data.MaNhanVien == request.auth.uid
        && resource.data.createdAt > timestamp.date(2024, 1, 1);
    }
  }
}
```

## Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Rules cho upload file liên quan đến xe
    match /vehicles/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    
    // Rules cho upload file đăng ký
    match /registrations/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    
    // Rules cho upload file báo cáo
    match /reports/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Cách áp dụng rules:

1. Truy cập Firebase Console
2. Vào Firestore Database > Rules
3. Copy và paste rules cho Firestore
4. Vào Storage > Rules
5. Copy và paste rules cho Storage
6. Click "Publish"

## Lưu ý bảo mật:

- Tất cả operations đều yêu cầu authentication
- Nhân viên chỉ có thể xem và tạo đăng ký của chính mình
- Có thể thêm role-based access control nếu cần
- Nên thêm validation cho dữ liệu đầu vào
