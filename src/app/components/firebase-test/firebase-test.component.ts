import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../../services/firebase.service';
import { FirebaseUserManagementService } from '../../services/firebase-user-management.service';
import { collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';

@Component({
  selector: 'app-firebase-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="firebase-test-container">
      <h2>Firebase Connectivity Test</h2>
      
      <div class="test-section">
        <h3>Firebase Services Status</h3>
        <p><strong>Auth:</strong> {{ authStatus }}</p>
        <p><strong>Firestore:</strong> {{ firestoreStatus }}</p>
        <p><strong>App Check:</strong> {{ appCheckStatus }}</p>
      </div>
      
      <div class="test-section">
        <h3>Firestore Test</h3>
        <button (click)="testFirestoreConnection()" [disabled]="isTesting">
          {{ isTesting ? 'Testing...' : 'Test Firestore Connection' }}
        </button>
        <p *ngIf="testResult">{{ testResult }}</p>
      </div>
      
      <div class="test-section">
        <h3>Firebase Auth Test</h3>
        <button (click)="testFirebaseAuth()" [disabled]="isTestingAuth">
          {{ isTestingAuth ? 'Testing...' : 'Test Firebase Auth' }}
        </button>
        <p *ngIf="authTestResult">{{ authTestResult }}</p>
      </div>
      
      <div class="test-section">
        <h3>User Management Test</h3>
        <button (click)="testUserManagement()" [disabled]="isTestingUsers">
          {{ isTestingUsers ? 'Testing...' : 'Test User Management' }}
        </button>
        <p *ngIf="userTestResult">{{ userTestResult }}</p>
        <p><strong>Users Count:</strong> {{ usersCount }}</p>
      </div>
      
      <div class="test-section">
        <h3>Network Status</h3>
        <p><strong>Online:</strong> {{ isOnline ? 'Yes' : 'No' }}</p>
        <p><strong>Last Error:</strong> {{ lastError || 'None' }}</p>
      </div>
    </div>
  `,
  styles: [`
    .firebase-test-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .test-section {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    
    button {
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }
    
    button:hover:not(:disabled) {
      background-color: #0056b3;
    }
  `]
})
export class FirebaseTestComponent implements OnInit {
  authStatus = 'Unknown';
  firestoreStatus = 'Unknown';
  appCheckStatus = 'Unknown';
  testResult = '';
  authTestResult = '';
  userTestResult = '';
  usersCount = 0;
  isTesting = false;
  isTestingAuth = false;
  isTestingUsers = false;
  isOnline = navigator.onLine;
  lastError = '';

  constructor(
    private firebaseService: FirebaseService,
    private userManagementService: FirebaseUserManagementService
  ) {}

  ngOnInit(): void {
    this.checkFirebaseServices();
    this.testUserManagement();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.testFirestoreConnection();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  checkFirebaseServices(): void {
    try {
      const auth = this.firebaseService.getAuth();
      this.authStatus = auth ? 'Connected' : 'Not Connected';
      
      const firestore = this.firebaseService.getFirestore();
      this.firestoreStatus = firestore ? 'Connected' : 'Not Connected';
      
      const appCheck = this.firebaseService.getAppCheck();
      this.appCheckStatus = appCheck ? 'Enabled' : 'Disabled';
    } catch (error) {
      console.error('Error checking Firebase services:', error);
      this.lastError = (error as any).message;
    }
  }

  async testFirestoreConnection(): Promise<void> {
    this.isTesting = true;
    this.testResult = '';
    
    try {
      const firestore = this.firebaseService.getFirestore();
      const testCollection = collection(firestore, 'test');
      
      // Try to read from test collection
      const querySnapshot = await getDocs(testCollection);
      this.testResult = `✅ Firestore connection successful! Found ${querySnapshot.docs.length} documents in test collection.`;
      
      // Clean up test document if it exists
      if (querySnapshot.docs.length > 0) {
        for (const doc of querySnapshot.docs) {
          await deleteDoc(doc.ref);
        }
      }
      
    } catch (error) {
      console.error('Firestore test error:', error);
      this.testResult = `❌ Firestore connection failed: ${(error as any).message}`;
      this.lastError = (error as any).message;
    } finally {
      this.isTesting = false;
    }
  }

  async testFirebaseAuth(): Promise<void> {
    this.isTestingAuth = true;
    this.authTestResult = '';
    
    try {
      const auth = this.firebaseService.getAuth();
      if (!auth) {
        throw new Error('Firebase Auth not initialized');
      }
      
      // Test auth instance
      this.authTestResult = '✅ Firebase Auth instance available';
      
      // Test with a dummy login attempt to see the exact error
      try {
        await signInWithEmailAndPassword(auth, 'test@example.com', 'wrongpassword');
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
          this.authTestResult += ' - Auth service is working (expected error for test credentials)';
        } else if (authError.code === 'auth/network-request-failed') {
          this.authTestResult += ' - ❌ Network request failed - check Firebase configuration';
          this.lastError = 'Network request failed - possible Firebase config issue';
        } else {
          this.authTestResult += ` - Auth service working (error: ${authError.code})`;
        }
      }
      
    } catch (error) {
      console.error('Firebase Auth test error:', error);
      this.authTestResult = `❌ Firebase Auth test failed: ${(error as any).message}`;
      this.lastError = (error as any).message;
    } finally {
      this.isTestingAuth = false;
    }
  }

  async testUserManagement(): Promise<void> {
    this.isTestingUsers = true;
    this.userTestResult = '';
    
    try {
      const users = await this.userManagementService.getUsers().pipe().toPromise();
      this.usersCount = users?.length || 0;
      this.userTestResult = `✅ User management test successful! Found ${this.usersCount} users.`;
    } catch (error) {
      console.error('User management test error:', error);
      this.userTestResult = `❌ User management test failed: ${(error as any).message}`;
      this.lastError = (error as any).message;
    } finally {
      this.isTestingUsers = false;
    }
  }
}
