// Content Security Policy configuration for development
// This file helps configure CSP for Google Drive integration during development

const cspConfig = {
  // Development CSP - more permissive for debugging
  development: `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' 
      https://apis.google.com 
      https://www.gstatic.com 
      https://accounts.google.com 
      https://www.googleapis.com 
      https://www.googletagmanager.com
      https://*.googleapis.com
      blob: data:;
    script-src-elem 'self' 'unsafe-inline' 
      https://apis.google.com 
      https://www.gstatic.com 
      https://accounts.google.com 
      https://www.googleapis.com 
      https://www.googletagmanager.com
      https://*.googleapis.com;
    style-src 'self' 'unsafe-inline' 
      https://fonts.googleapis.com 
      https://www.gstatic.com;
    font-src 'self' 
      https://fonts.gstatic.com 
      https://www.gstatic.com;
    img-src 'self' data: blob: 
      https://www.gstatic.com 
      https://lh3.googleusercontent.com
      https://*.googleusercontent.com;
    connect-src 'self' 
      https://www.googleapis.com 
      https://accounts.google.com 
      https://www.gstatic.com 
      https://firebaseapp.com 
      https://*.googleapis.com
      https://*.google.com
      https://www.googletagmanager.com
      https://www.google-analytics.com
      https://accounts.google.com/gsi
      ws://localhost:* 
      http://localhost:*;
    frame-src 'self' 
      https://accounts.google.com 
      https://www.gstatic.com
      https://content.googleapis.com
      https://accounts.google.com/gsi;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
  `,
  
  // Production CSP - more restrictive
  production: `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' 
      https://apis.google.com 
      https://www.gstatic.com 
      https://accounts.google.com 
      https://www.googleapis.com 
      https://www.googletagmanager.com
      https://*.googleapis.com
      blob: data:;
    script-src-elem 'self' 'unsafe-inline' 
      https://apis.google.com 
      https://www.gstatic.com 
      https://accounts.google.com 
      https://www.googleapis.com 
      https://www.googletagmanager.com
      https://*.googleapis.com;
    style-src 'self' 'unsafe-inline' 
      https://fonts.googleapis.com 
      https://www.gstatic.com;
    font-src 'self' 
      https://fonts.gstatic.com 
      https://www.gstatic.com;
    img-src 'self' data: blob: 
      https://www.gstatic.com 
      https://lh3.googleusercontent.com
      https://*.googleusercontent.com;
    connect-src 'self' 
      https://www.googleapis.com 
      https://accounts.google.com 
      https://www.gstatic.com 
      https://firebaseapp.com 
      https://*.googleapis.com
      https://*.google.com
      https://www.googletagmanager.com
      https://www.google-analytics.com
      https://accounts.google.com/gsi;
    frame-src 'self' 
      https://accounts.google.com 
      https://www.gstatic.com
      https://content.googleapis.com
      https://accounts.google.com/gsi;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
  `
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cspConfig;
} else if (typeof window !== 'undefined') {
  window.cspConfig = cspConfig;
}
