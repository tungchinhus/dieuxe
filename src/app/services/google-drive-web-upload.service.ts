import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveWebUploadService {
  private readonly GOOGLE_DRIVE_FOLDER_ID = '12l5dc4YppVBQXkgx96WVuyXXzcf8DEP6';
  private readonly CLIENT_ID = '1012083510866-hbp4qb7pu973pa175tr0otignl3hud6c.apps.googleusercontent.com';
  private readonly API_KEY = 'AIzaSyDLCHS4Oq_5deuoX4EjcKAcxWc7qkDgqt4'; // Using Firebase API key
  private readonly DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
  private readonly SCOPES = 'https://www.googleapis.com/auth/drive.file';
  private gapi: any = null;
  private isGapiLoaded = false;

  constructor() {
    this.loadGapi();
  }

  /**
   * Load Google API
   */
  private async loadGapi(): Promise<void> {
    if (this.isGapiLoaded) return;

    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).gapi) {
        this.gapi = (window as any).gapi;
        this.initializeGapi().then(resolve).catch(reject);
        return;
      }

      // Check if script is already loaded
      const existingScript = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
      if (existingScript) {
        // Script already exists, wait for it to load
        existingScript.addEventListener('load', () => {
          this.gapi = (window as any).gapi;
          this.initializeGapi().then(resolve).catch(reject);
        });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        this.gapi = (window as any).gapi;
        this.initializeGapi().then(resolve).catch(reject);
      };
      
      script.onerror = (error) => {
        console.error('Failed to load Google API script:', error);
        reject(new Error('Failed to load Google API script. Please check your CSP settings.'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Google API
   */
  private async initializeGapi(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.gapi.load('client:auth2', () => {
        this.gapi.client.init({
          apiKey: this.API_KEY,
          clientId: this.CLIENT_ID,
          discoveryDocs: [this.DISCOVERY_DOC],
          scope: this.SCOPES
        }).then(() => {
          this.isGapiLoaded = true;
          resolve();
        }).catch(reject);
      });
    });
  }

  /**
   * Upload file directly to Google Drive
   * @param file - File to upload
   * @param fileName - Name for the file in Google Drive
   * @returns Promise with upload result
   */
  async uploadFileToDrive(file: File, fileName?: string): Promise<any> {
    try {
      console.log('Starting real upload to Google Drive:', {
        name: fileName || file.name,
        size: file.size,
        type: file.type,
        folderId: this.GOOGLE_DRIVE_FOLDER_ID
      });

      // Load GAPI if not loaded
      await this.loadGapi();

      // Check if user is authenticated
      const authInstance = this.gapi.auth2.getAuthInstance();
      const isSignedIn = authInstance.isSignedIn.get();

      if (!isSignedIn) {
        console.log('User not signed in, attempting to sign in...');
        await authInstance.signIn();
      }

      // Upload file to Google Drive
      const uploadResult = await this.uploadFile(file, fileName);
      
      return uploadResult;

    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  /**
   * Upload file to Google Drive using API
   */
  private async uploadFile(file: File, fileName?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileContent = e.target?.result as ArrayBuffer;
          const base64Content = this.arrayBufferToBase64(fileContent);

          const metadata = {
            name: fileName || file.name,
            parents: [this.GOOGLE_DRIVE_FOLDER_ID]
          };

          const boundary = '-------314159265358979323846';
          const delimiter = '\r\n--' + boundary + '\r\n';
          const close_delim = '\r\n--' + boundary + '--';

          const body = delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: ' + file.type + '\r\n' +
            'Content-Transfer-Encoding: base64\r\n\r\n' +
            base64Content +
            close_delim;

          const response = await this.gapi.client.request({
            path: 'https://www.googleapis.com/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart' },
            headers: {
              'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body: body
          });

          console.log('File uploaded successfully:', response.result);

          resolve({
            success: true,
            fileId: response.result.id,
            fileName: fileName || file.name,
            folderUrl: `https://drive.google.com/drive/folders/${this.GOOGLE_DRIVE_FOLDER_ID}`,
            message: 'File uploaded successfully to Google Drive!',
            method: 'real_upload'
          });

        } catch (error) {
          console.error('Error in uploadFile:', error);
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
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
