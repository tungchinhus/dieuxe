/**
 * App Check Configuration
 * 
 * Để sử dụng Firebase App Check với reCAPTCHA Enterprise:
 * 1. Tạo reCAPTCHA Enterprise key tại: https://console.cloud.google.com/security/recaptcha
 * 2. Thay thế 'YOUR_RECAPTCHA_SITE_KEY' bằng key thực tế
 * 3. Cấu hình App Check trong Firebase Console
 */

export const APP_CHECK_CONFIG = {
  // Thay thế bằng reCAPTCHA Enterprise site key thực tế
  RECAPTCHA_SITE_KEY: '6Lfp-twrAAAAACN2-unYk22OADwcUbV9PTqDLjdQ',
  
  // Có thể thêm các cấu hình khác
  IS_TOKEN_AUTO_REFRESH_ENABLED: true,
  
  // Debug mode cho development (chỉ sử dụng trong development)
  DEBUG_TOKEN: 'YOUR_DEBUG_TOKEN' // Chỉ sử dụng trong development
};
