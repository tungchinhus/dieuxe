import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

export interface UploadInstructionsData {
  fileName: string;
  folderUrl: string;
  downloadUrl?: string;
}

@Component({
  selector: 'app-upload-instructions-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  template: `
    <div class="upload-instructions-dialog">
      <h2 mat-dialog-title>
        <mat-icon>cloud_upload</mat-icon>
        Hướng dẫn Upload File lên Google Drive
      </h2>
      
      <mat-dialog-content>
        <div class="instructions-content">
          <mat-card class="instruction-card">
            <mat-card-header>
              <mat-card-title>Bước 1: Tải file Excel về máy</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p>File <strong>{{ data.fileName }}</strong> đã được xử lý thành công.</p>
              <p>Bấm nút bên dưới để tải file về máy tính của bạn.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" (click)="downloadFile()">
                <mat-icon>download</mat-icon>
                Tải File Excel
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="instruction-card">
            <mat-card-header>
              <mat-card-title>Bước 2: Mở Google Drive folder</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p>Bấm nút "Mở Google Drive" để mở folder đích trong tab mới.</p>
              <p><strong>Folder đích:</strong> <a [href]="data.folderUrl" target="_blank">{{ data.folderUrl }}</a></p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="accent" (click)="openGoogleDrive()">
                <mat-icon>folder_open</mat-icon>
                Mở Google Drive
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="instruction-card">
            <mat-card-header>
              <mat-card-title>Bước 3: Upload file lên Google Drive</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p><strong>Cách 1:</strong> Kéo thả file Excel vừa tải vào Google Drive folder</p>
              <p><strong>Cách 2:</strong> Click "Tải lên" trong Google Drive và chọn file từ máy tính</p>
              <p><strong>Cách 3:</strong> Click chuột phải trong folder → "Tải lên tệp" → Chọn file</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="instruction-card">
            <mat-card-header>
              <mat-card-title>Bước 4: Xác nhận file đã upload</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p>Kiểm tra lại Google Drive folder để đảm bảo file <strong>{{ data.fileName }}</strong> đã xuất hiện.</p>
              <p>File sẽ có tên: <strong>{{ data.fileName }}</strong></p>
            </mat-card-content>
          </mat-card>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()">Đóng</button>
        <button mat-raised-button color="primary" (click)="downloadAndOpen()">
          <mat-icon>get_app</mat-icon>
          Tải File & Mở Google Drive
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .upload-instructions-dialog {
      max-width: 600px;
    }
    
    .instructions-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .instruction-card {
      margin-bottom: 16px;
    }
    
    .instruction-card mat-card-content {
      padding-top: 16px;
    }
    
    .instruction-card mat-card-actions {
      padding-top: 8px;
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
export class UploadInstructionsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<UploadInstructionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UploadInstructionsData
  ) {}

  downloadFile(): void {
    if (this.data.downloadUrl) {
      const link = document.createElement('a');
      link.href = this.data.downloadUrl;
      link.download = this.data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  openGoogleDrive(): void {
    window.open(this.data.folderUrl, '_blank');
  }

  downloadAndOpen(): void {
    this.downloadFile();
    this.openGoogleDrive();
  }

  close(): void {
    this.dialogRef.close();
  }
}
