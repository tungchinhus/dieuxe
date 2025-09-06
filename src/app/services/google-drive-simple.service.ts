import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveSimpleService {
  private readonly GOOGLE_DRIVE_FOLDER_ID = '12l5dc4YppVBQXkgx96WVuyXXzcf8DEP6';
  private readonly GOOGLE_DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';

  constructor(private http: HttpClient) {}

  /**
   * Upload file to Google Drive using a simple approach
   * This method will guide the user to upload manually
   */
  async uploadFileToDrive(file: File, fileName?: string): Promise<any> {
    try {
      console.log('Preparing file for Google Drive upload:', {
        name: fileName || file.name,
        size: file.size,
        type: file.type,
        folderId: this.GOOGLE_DRIVE_FOLDER_ID
      });

      // Create a blob URL for the file
      const fileUrl = URL.createObjectURL(file);
      
      // Return instructions for manual upload
      return {
        success: true,
        fileName: fileName || file.name,
        folderUrl: `https://drive.google.com/drive/folders/${this.GOOGLE_DRIVE_FOLDER_ID}`,
        fileUrl: fileUrl,
        message: 'File đã sẵn sàng để upload lên Google Drive',
        instructions: [
          '1. Click "Mở Google Drive" để mở folder đích',
          '2. Click "Tải file" để download file Excel về máy',
          '3. Kéo thả file vào Google Drive folder hoặc click "Tải lên"',
          '4. File sẽ xuất hiện trong Google Drive folder'
        ]
      };

    } catch (error) {
      console.error('Error preparing file for upload:', error);
      throw new Error('Failed to prepare file for upload');
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

  /**
   * Download file to user's computer
   */
  downloadFile(file: File, fileName?: string): void {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
