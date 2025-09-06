import { Injectable } from '@angular/core';
import { app, analytics } from '../../firebase.config';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  public auth: Auth;
  public firestore: Firestore;
  public storage: FirebaseStorage;
  public analytics = analytics;

  constructor() {
    // Initialize Firebase services
    this.auth = getAuth(app);
    this.firestore = getFirestore(app);
    this.storage = getStorage(app);
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
}
