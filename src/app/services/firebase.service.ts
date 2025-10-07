import { Injectable } from '@angular/core';
import { app, analytics, appCheck } from '../../firebase.config';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { AppCheck } from 'firebase/app-check';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  public auth: Auth;
  public firestore: Firestore;
  public storage: FirebaseStorage;
  public analytics = analytics;
  public appCheck: AppCheck;

  constructor() {
    try {
      // Initialize Firebase services
      this.auth = getAuth(app);
      this.firestore = getFirestore(app);
      this.storage = getStorage(app);
      this.appCheck = appCheck;
      
      console.log('Firebase services initialized successfully');
      console.log('Auth instance:', this.auth);
      console.log('Firestore instance:', this.firestore);
      console.log('App Check instance:', this.appCheck);
    } catch (error) {
      console.error('Error initializing Firebase services:', error);
      throw error;
    }
  }

  // Get Firebase app instance
  getApp() {
    return app;
  }

  // Get Analytics instance
  getAnalytics() {
    return this.analytics;
  }

  // Get Auth instance
  getAuth() {
    return this.auth;
  }

  // Get Firestore instance
  getFirestore() {
    return this.firestore;
  }

  // Get Storage instance
  getStorage() {
    return this.storage;
  }

  // Get App Check instance
  getAppCheck() {
    return this.appCheck;
  }
}
