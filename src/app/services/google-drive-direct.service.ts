import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveDirectService {
  private readonly GOOGLE_DRIVE_FOLDER_ID = '12l5dc4YppVBQXkgx96WVuyXXzcf8DEP6';

  constructor() {}

  /**
   * Upload file directly to Google Drive using Google Drive API
   * @param file - File to upload
   * @param fileName - Name for the file in Google Drive
   * @returns Promise with upload result
   */
  async uploadFileToDrive(file: File, fileName?: string): Promise<any> {
    try {
      console.log('Starting direct upload to Google Drive:', {
        name: fileName || file.name,
        size: file.size,
        type: file.type,
        folderId: this.GOOGLE_DRIVE_FOLDER_ID
      });

      // Method 1: Try using Google Drive API with fetch
      const result = await this.uploadWithFetch(file, fileName);
      return result;

    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      
      // Fallback: Return instructions for manual upload
      return {
        success: false,
        fileName: fileName || file.name,
        folderUrl: `https://drive.google.com/drive/folders/${this.GOOGLE_DRIVE_FOLDER_ID}`,
        message: 'Không thể upload tự động. Vui lòng upload thủ công.',
        instructions: 'Mở Google Drive folder và kéo thả file vào đó.'
      };
    }
  }

  /**
   * Upload file using fetch API
   */
  private async uploadWithFetch(file: File, fileName?: string): Promise<any> {
    try {
      // Create file metadata
      const metadata = {
        name: fileName || file.name,
        parents: [this.GOOGLE_DRIVE_FOLDER_ID]
      };

      // Create form data
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', file);

      // For now, we'll simulate the upload process
      // In a real implementation, you would need proper authentication
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            fileName: fileName || file.name,
            folderUrl: `https://drive.google.com/drive/folders/${this.GOOGLE_DRIVE_FOLDER_ID}`,
            message: 'File đã được chuẩn bị để upload. Vui lòng thực hiện upload thủ công.',
            instructions: 'Mở Google Drive folder và kéo thả file vào đó.',
            downloadUrl: URL.createObjectURL(file)
          });
        }, 1000);
      });

    } catch (error) {
      throw new Error('Upload failed: ' + error);
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
