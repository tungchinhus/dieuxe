import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

export interface RealUploadData {
  fileName: string;
  folderUrl: string;
  file: File;
}

@Component({
  selector: 'app-real-upload-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  template: `
    <div class="real-upload-dialog">
      <h2 mat-dialog-title>
        <mat-icon>cloud_upload</mat-icon>
        Upload File Excel lên Google Drive
      </h2>
      
      <mat-dialog-content>
        <div class="upload-steps">
          <!-- Step 1: File Info -->
          <mat-card class="step-card">
            <mat-card-header>
              <mat-card-title>Bước 1: Thông tin file</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p><strong>Tên file:</strong> {{ data.fileName }}</p>
              <p><strong>Kích thước:</strong> {{ getFileSize(data.file.size) }}</p>
              <p><strong>Loại file:</strong> {{ data.file.type }}</p>
            </mat-card-content>
          </mat-card>

          <!-- Step 2: Download File -->
          <mat-card class="step-card">
            <mat-card-header>
              <mat-card-title>Bước 2: Tải file về máy</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p>Bấm nút bên dưới để tải file Excel về máy tính của bạn.</p>
              <button mat-raised-button color="accent" (click)="downloadFile()">
                <mat-icon>download</mat-icon>
                Tải File Excel
              </button>
            </mat-card-content>
          </mat-card>

          <!-- Step 3: Open Google Drive -->
          <mat-card class="step-card">
            <mat-card-header>
              <mat-card-title>Bước 3: Mở Google Drive</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p>Bấm nút bên dưới để mở Google Drive folder đích.</p>
              <p><strong>Folder đích:</strong> <a [href]="data.folderUrl" target="_blank">{{ data.folderUrl }}</a></p>
              <button mat-raised-button color="accent" (click)="openGoogleDrive()">
                <mat-icon>folder_open</mat-icon>
                Mở Google Drive
              </button>
            </mat-card-content>
          </mat-card>

          <!-- Step 4: Upload Instructions -->
          <mat-card class="step-card">
            <mat-card-header>
              <mat-card-title>Bước 4: Upload file lên Google Drive</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <h4>Cách upload file:</h4>
              <ol>
                <li><strong>Kéo thả:</strong> Kéo file Excel từ máy tính vào Google Drive folder</li>
                <li><strong>Hoặc click "Tải lên":</strong> Click nút "Tải lên" trong Google Drive và chọn file</li>
                <li><strong>Hoặc click chuột phải:</strong> Click chuột phải trong folder → "Tải lên tệp" → Chọn file</li>
              </ol>
            </mat-card-content>
          </mat-card>

          <!-- Step 5: Confirmation -->
          <mat-card class="step-card">
            <mat-card-header>
              <mat-card-title>Bước 5: Xác nhận</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <h4>Kiểm tra kết quả:</h4>
              <p>Kiểm tra lại Google Drive folder để đảm bảo file <strong>{{ data.fileName }}</strong> đã xuất hiện.</p>
              <button mat-raised-button color="accent" (click)="openGoogleDrive()">
                <mat-icon>folder_open</mat-icon>
                Kiểm tra Google Drive
              </button>
            </mat-card-content>
          </mat-card>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()">Hủy</button>
        <button mat-raised-button color="primary" (click)="downloadAndOpen()">
          <mat-icon>get_app</mat-icon>
          Tải File & Mở Google Drive
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .real-upload-dialog {
      max-width: 700px;
    }
    
    .upload-steps {
      margin: 20px 0;
    }
    
    .step-card {
      margin: 16px 0;
    }
    
    .upload-actions {
      margin: 20px 0;
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
    
    ol {
      padding-left: 20px;
    }
    
    ol li {
      margin: 8px 0;
    }
  `]
})
export class RealUploadDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<RealUploadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RealUploadData
  ) {}

  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  downloadFile(): void {
    const url = URL.createObjectURL(this.data.file);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.data.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  openGoogleDrive(): void {
    window.open(this.data.folderUrl, '_blank');
  }

  downloadAndOpen(): void {
    this.downloadFile();
    this.openGoogleDrive();
  }

  complete(): void {
    this.dialogRef.close({ action: 'completed' });
  }

  close(): void {
    this.dialogRef.close({ action: 'cancelled' });
  }
}
