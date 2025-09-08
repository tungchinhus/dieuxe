// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
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
const analytics = getAnalytics(app);

export { app, analytics, firebaseConfig };
