import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';

export interface DirectUploadData {
  fileName: string;
  folderUrl: string;
  file: File;
}

@Component({
  selector: 'app-direct-upload-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule
  ],
  template: `
    <div class="direct-upload-dialog">
      <h2 mat-dialog-title>
        <mat-icon>cloud_upload</mat-icon>
        Upload File Excel lên Google Drive
      </h2>
      
      <mat-dialog-content>
        <div class="upload-content">
          <mat-card class="file-info-card">
            <mat-card-header>
              <mat-card-title>File Excel đã chọn</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p><strong>Tên file:</strong> {{ data.fileName }}</p>
              <p><strong>Kích thước:</strong> {{ getFileSize(data.file.size) }}</p>
              <p><strong>Loại file:</strong> {{ data.file.type }}</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="upload-options-card">
            <mat-card-header>
              <mat-card-title>Chọn cách upload</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="upload-options">
                <div class="upload-option">
                  <h4>Phương pháp 1: Upload trực tiếp</h4>
                  <p>Click nút bên dưới để mở Google Drive và upload file trực tiếp</p>
                  <button mat-raised-button color="primary" (click)="uploadDirectly()">
                    <mat-icon>cloud_upload</mat-icon>
                    Upload Trực Tiếp
                  </button>
                </div>

                <div class="upload-option">
                  <h4>Phương pháp 2: Tải file về máy</h4>
                  <p>Tải file về máy tính rồi upload thủ công lên Google Drive</p>
                  <button mat-raised-button color="accent" (click)="downloadAndUpload()">
                    <mat-icon>download</mat-icon>
                    Tải File & Mở Google Drive
                  </button>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="folder-info-card">
            <mat-card-header>
              <mat-card-title>Thông tin Google Drive</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p><strong>Folder đích:</strong> <a [href]="data.folderUrl" target="_blank">{{ data.folderUrl }}</a></p>
              <p>File sẽ được upload vào folder này sau khi hoàn thành.</p>
            </mat-card-content>
          </mat-card>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()">Hủy</button>
        <button mat-raised-button color="primary" (click)="uploadDirectly()">
          <mat-icon>cloud_upload</mat-icon>
          Upload Ngay
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .direct-upload-dialog {
      max-width: 600px;
    }
    
    .upload-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .file-info-card,
    .upload-options-card,
    .folder-info-card {
      margin-bottom: 16px;
    }
    
    .upload-options {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .upload-option {
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background-color: #fafafa;
    }
    
    .upload-option h4 {
      margin: 0 0 8px 0;
      color: #1976d2;
    }
    
    .upload-option p {
      margin: 0 0 12px 0;
      color: #666;
    }
    
    mat-dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    mat-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }
    
    a {
      color: #1976d2;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
  `]
})
export class DirectUploadDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DirectUploadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DirectUploadData
  ) {}

  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  uploadDirectly(): void {
    // Open Google Drive folder in new tab
    window.open(this.data.folderUrl, '_blank');
    
    // Close dialog
    this.dialogRef.close({ action: 'upload_direct' });
  }

  downloadAndUpload(): void {
    // Download file
    const url = URL.createObjectURL(this.data.file);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.data.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Open Google Drive folder
    window.open(this.data.folderUrl, '_blank');
    
    // Close dialog
    this.dialogRef.close({ action: 'download_and_upload' });
  }

  close(): void {
    this.dialogRef.close({ action: 'cancel' });
  }
}
