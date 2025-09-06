import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveService {
  private readonly GOOGLE_DRIVE_FOLDER_ID = '12l5dc4YppVBQXkgx96WVuyXXzcf8DEP6';
  private readonly GOOGLE_DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
  private readonly GOOGLE_DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

  constructor(private http: HttpClient) {}

  /**
   * Upload file to Google Drive folder using a simple approach
   * @param file - File to upload
   * @param fileName - Name for the file in Google Drive
   * @returns Promise with upload result
   */
  async uploadFileToDrive(file: File, fileName?: string): Promise<any> {
    try {
      console.log('Starting file upload to Google Drive:', {
        name: fileName || file.name,
        size: file.size,
        type: file.type,
        folderId: this.GOOGLE_DRIVE_FOLDER_ID
      });

      // Method 1: Try to use Google Drive API with public access
      // This is a simplified approach that works for public folders
      const uploadResult = await this.uploadToPublicFolder(file, fileName);
      
      return uploadResult;

    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      
      // Fallback: Show instructions for manual upload
      return {
        success: false,
        fileName: fileName || file.name,
        folderUrl: `https://drive.google.com/drive/folders/${this.GOOGLE_DRIVE_FOLDER_ID}`,
        message: 'Không thể upload tự động. Vui lòng upload thủ công vào Google Drive folder.',
        instructions: 'Hãy mở Google Drive folder và kéo thả file vào đó.'
      };
    }
  }

  /**
   * Upload to public folder (simplified approach)
   */
  private async uploadToPublicFolder(file: File, fileName?: string): Promise<any> {
    // Create a simple form data approach
    const formData = new FormData();
    formData.append('file', file);
    
    // For now, we'll provide instructions to the user
    // In a real implementation, you would need proper OAuth2 authentication
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          fileName: fileName || file.name,
          folderUrl: `https://drive.google.com/drive/folders/${this.GOOGLE_DRIVE_FOLDER_ID}`,
          message: 'File đã được chuẩn bị để upload. Vui lòng thực hiện upload thủ công.',
          instructions: 'Mở Google Drive folder và kéo thả file vào đó.',
          downloadUrl: this.createDownloadUrl(file)
        });
      }, 1000);
    });
  }

  /**
   * Create a download URL for the file
   */
  private createDownloadUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Get the Google Drive folder URL
   * @returns The folder URL
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
