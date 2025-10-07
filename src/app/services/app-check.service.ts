import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { getToken, AppCheckTokenResult } from 'firebase/app-check';

@Injectable({
  providedIn: 'root'
})
export class AppCheckService {
  
  constructor(private firebaseService: FirebaseService) {}

  /**
   * Lấy App Check token
   * @returns Promise<AppCheckTokenResult | null>
   */
  async getAppCheckToken(): Promise<AppCheckTokenResult | null> {
    try {
      const appCheck = this.firebaseService.getAppCheck();
      const token = await getToken(appCheck);
      console.log('App Check token retrieved:', token);
      return token;
    } catch (error) {
      console.error('Error getting App Check token:', error);
      return null;
    }
  }

  /**
   * Kiểm tra xem App Check có hoạt động không
   * @returns Promise<boolean>
   */
  async isAppCheckWorking(): Promise<boolean> {
    try {
      const token = await this.getAppCheckToken();
      return token !== null && token.token !== '';
    } catch (error) {
      console.error('App Check is not working:', error);
      return false;
    }
  }

  /**
   * Debug method để test App Check
   */
  async debugAppCheck(): Promise<void> {
    console.log('=== APP CHECK DEBUG ===');
    
    try {
      const appCheck = this.firebaseService.getAppCheck();
      console.log('App Check instance:', appCheck);
      
      const token = await this.getAppCheckToken();
      console.log('Token:', token);
      
      if (token) {
        console.log('✅ App Check is working correctly');
        console.log('Token:', token.token.substring(0, 20) + '...');
      } else {
        console.log('❌ App Check token is null');
      }
    } catch (error) {
      console.error('❌ App Check error:', error);
    }
    
    console.log('=== END APP CHECK DEBUG ===');
  }
}
