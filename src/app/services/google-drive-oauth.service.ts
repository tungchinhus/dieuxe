import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

declare var gapi: any;

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveOAuthService {
  private readonly GOOGLE_DRIVE_FOLDER_ID = '12l5dc4YppVBQXkgx96WVuyXXzcf8DEP6';
  private readonly CLIENT_ID = 'your-client-id.apps.googleusercontent.com'; // Cần thay thế bằng Client ID thực
  private readonly DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
  private readonly SCOPES = 'https://www.googleapis.com/auth/drive.file';

  private isInitialized = false;
  private isSignedIn = new BehaviorSubject<boolean>(false);

  constructor() {
    this.initializeGapi();
  }

  /**
   * Initialize Google API
   */
  private async initializeGapi(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadGapiScript();
      await this.initializeGapiClient();
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing Google API:', error);
    }
  }

  /**
   * Load Google API script
   */
  private loadGapiScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof gapi !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Google API client
   */
  private async initializeGapiClient(): Promise<void> {
    return new Promise((resolve, reject) => {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            discoveryDocs: [this.DISCOVERY_DOC],
            clientId: this.CLIENT_ID,
            scope: this.SCOPES
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Sign in to Google
   */
  async signIn(): Promise<boolean> {
    try {
      await this.initializeGapi();
      
      const authInstance = gapi.auth2.getAuthInstance();
      if (!authInstance) {
        await gapi.auth2.init({
          client_id: this.CLIENT_ID,
          scope: this.SCOPES
        });
      }

      const user = await gapi.auth2.getAuthInstance().signIn();
      this.isSignedIn.next(true);
      return true;
    } catch (error) {
      console.error('Error signing in:', error);
      this.isSignedIn.next(false);
      return false;
    }
  }

  /**
   * Sign out from Google
   */
  async signOut(): Promise<void> {
    try {
      const authInstance = gapi.auth2.getAuthInstance();
      if (authInstance) {
        await authInstance.signOut();
        this.isSignedIn.next(false);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  /**
   * Check if user is signed in
   */
  isUserSignedIn(): Observable<boolean> {
    return this.isSignedIn.asObservable();
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFileToDrive(file: File, fileName?: string): Promise<any> {
    try {
      await this.initializeGapi();
      
      // Check if user is signed in
      if (!this.isSignedIn.value) {
        const signedIn = await this.signIn();
        if (!signedIn) {
          throw new Error('User must be signed in to upload files');
        }
      }

      // Create file metadata
      const metadata = {
        name: fileName || file.name,
        parents: [this.GOOGLE_DRIVE_FOLDER_ID]
      };

      // Upload file
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}`
        },
        body: form
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        fileId: result.id,
        fileName: fileName || file.name,
        folderUrl: `https://drive.google.com/drive/folders/${this.GOOGLE_DRIVE_FOLDER_ID}`,
        fileUrl: `https://drive.google.com/file/d/${result.id}/view`,
        message: 'File uploaded successfully to Google Drive!'
      };

    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  /**
   * Get Google Drive folder URL
   */
  getFolderUrl(): string {
    return `https://drive.google.com/drive/folders/${this.GOOGLE_DRIVE_FOLDER_ID}`;
  }

  /**
   * Open Google Drive folder in new tab
   */
  openFolderInNewTab(): void {
    window.open(this.getFolderUrl(), '_blank');
  }
}
