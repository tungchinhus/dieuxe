# Firebase App Check Setup Guide

## Tổng Quan
Firebase App Check giúp bảo vệ ứng dụng khỏi các cuộc tấn công từ bot và đảm bảo chỉ có ứng dụng hợp lệ mới có thể truy cập Firebase services.

## Các Bước Cài Đặt

### 1. Tạo reCAPTCHA Enterprise Key

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project `skyjoyweb-da255`
3. Đi đến **Security** > **reCAPTCHA Enterprise**
4. Tạo site key mới:
   - **Label**: `dieuxe-web-app`
   - **Platform**: Web
   - **Domains**: `dieuxe.web.app`, `localhost` (cho development)
5. Copy **Site Key** được tạo

### 2. Cấu Hình App Check trong Firebase Console

1. Truy cập [Firebase Console](https://console.firebase.google.com/project/skyjoyweb-da255)
2. Đi đến **App Check** trong menu bên trái
3. Thêm ứng dụng web:
   - **App ID**: `1:391487819375:web:8f30a45e481a90f93d479a`
   - **Provider**: reCAPTCHA Enterprise
   - **Site Key**: Nhập site key từ bước 1
4. Bật App Check cho các services:
   - ✅ Firestore
   - ✅ Functions
   - ✅ Storage

### 3. Cập Nhật Code

1. Mở file `src/app/config/app-check.config.ts`
2. Thay thế `YOUR_RECAPTCHA_SITE_KEY` bằng site key thực tế:

```typescript
export const APP_CHECK_CONFIG = {
  RECAPTCHA_SITE_KEY: '6Lc...', // Site key thực tế
  IS_TOKEN_AUTO_REFRESH_ENABLED: true,
  DEBUG_TOKEN: 'YOUR_DEBUG_TOKEN' // Chỉ cho development
};
```

### 4. Test App Check

Sử dụng service để test:

```typescript
// Trong component
constructor(private appCheckService: AppCheckService) {}

async testAppCheck() {
  await this.appCheckService.debugAppCheck();
}
```

### 5. Deploy và Monitor

1. Build và deploy ứng dụng:
```bash
npm run deploy
```

2. Monitor App Check metrics trong Firebase Console:
   - **App Check** > **Metrics**
   - Kiểm tra **Request Metrics**
   - Đảm bảo **Valid requests** > 90%

### 6. Chuyển Sang Enforce Mode

Sau khi đã test và đảm bảo App Check hoạt động tốt:

1. Trong Firebase Console > **App Check**
2. Chuyển từ **Test mode** sang **Enforce mode**
3. Monitor metrics để đảm bảo không có vấn đề

## Troubleshooting

### Lỗi Thường Gặp

1. **"App Check token is invalid"**
   - Kiểm tra site key có đúng không
   - Đảm bảo domain được thêm vào reCAPTCHA config

2. **"App Check is not initialized"**
   - Kiểm tra import App Check trong firebase.config.ts
   - Đảm bảo App Check được khởi tạo trước khi sử dụng Firestore

3. **Development Issues**
   - Sử dụng debug token cho development
   - Thêm localhost vào allowed domains

### Debug Commands

```bash
# Test App Check
npm run build:prod
firebase deploy --only hosting

# Check logs
firebase functions:log
```

## Security Notes

- Không commit site key vào git
- Sử dụng environment variables cho production
- Thường xuyên rotate keys
- Monitor App Check metrics

## Tài Liệu Tham Khảo

- [Firebase App Check Documentation](https://firebase.google.com/docs/app-check)
- [reCAPTCHA Enterprise Documentation](https://cloud.google.com/recaptcha-enterprise/docs)
- [App Check Web Setup](https://firebase.google.com/docs/app-check/web/get-started)
