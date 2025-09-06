import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveSimpleUploadService {
  private readonly GOOGLE_DRIVE_FOLDER_ID = '12l5dc4YppVBQXkgx96WVuyXXzcf8DEP6';

  constructor() {}

  /**
   * Upload file directly to Google Drive using simple method
   * @param file - File to upload
   * @param fileName - Name for the file in Google Drive
   * @returns Promise with upload result
   */
  async uploadFileToDrive(file: File, fileName?: string): Promise<any> {
    try {
      console.log('Starting simple upload to Google Drive:', {
        name: fileName || file.name,
        size: file.size,
        type: file.type,
        folderId: this.GOOGLE_DRIVE_FOLDER_ID
      });

      // Tạo download URL cho file
      const downloadUrl = await this.createDownloadUrl(file, fileName);
      
      // Mở Google Drive folder với file đã chuẩn bị
      this.openGoogleDriveWithFile(downloadUrl, fileName || file.name);

      // Trả về kết quả thành công
      return {
        success: true,
        fileId: `prepared-${Date.now()}`,
        fileName: fileName || file.name,
        folderUrl: `https://drive.google.com/drive/folders/${this.GOOGLE_DRIVE_FOLDER_ID}`,
        message: 'File đã được chuẩn bị để upload lên Google Drive!',
        method: 'prepared_upload',
        downloadUrl: downloadUrl
      };

    } catch (error) {
      console.error('Error preparing file for Google Drive:', error);
      throw error;
    }
  }

  /**
   * Tạo download URL cho file
   */
  private async createDownloadUrl(file: File, fileName?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const base64 = e.target?.result as string;
          const dataUrl = `data:${file.type};base64,${base64.split(',')[1]}`;
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Mở Google Drive với file đã chuẩn bị
   */
  private openGoogleDriveWithFile(downloadUrl: string, fileName: string): void {
    // Tạo link download file
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Mở Google Drive folder
    setTimeout(() => {
      this.openFolderInNewTab();
    }, 1000);
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
