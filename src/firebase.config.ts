// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { APP_CHECK_CONFIG } from "./app/config/app-check.config";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDLCHS4Oq_5deuoX4EjcKAcxWc7qkDgqt4",
  authDomain: "skyjoyweb-da255.firebaseapp.com",
  projectId: "skyjoyweb-da255",
  storageBucket: "skyjoyweb-da255.firebasestorage.app",
  messagingSenderId: "391487819375",
  appId: "1:391487819375:web:8f30a45e481a90f93d479a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize App Check with reCAPTCHA Enterprise
// Note: Cấu hình reCAPTCHA site key trong app-check.config.ts
// Temporarily disabled for debugging connectivity issues
let appCheck: any = null;
try {
  // Temporarily disable App Check to debug network issues
  console.log('App Check temporarily disabled for debugging');
  appCheck = null;
  
  // Uncomment below to re-enable App Check after fixing network issues
  // appCheck = initializeAppCheck(app, {
  //   provider: new ReCaptchaEnterpriseProvider(APP_CHECK_CONFIG.RECAPTCHA_SITE_KEY),
  //   isTokenAutoRefreshEnabled: APP_CHECK_CONFIG.IS_TOKEN_AUTO_REFRESH_ENABLED
  // });
} catch (error) {
  console.warn('App Check initialization failed, continuing without App Check:', error);
  appCheck = null;
}

const analytics = getAnalytics(app);
const auth = getAuth(app);
const functions = getFunctions(app);

export { app, analytics, auth, functions, appCheck, firebaseConfig };
