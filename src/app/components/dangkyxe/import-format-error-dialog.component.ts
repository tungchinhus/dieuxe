import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ImportFormatErrorData {
  /** errors: file không đọc được, không nhập gì. warnings: các dòng bị bỏ qua / ô để trống, phần còn lại đã nhập. */
  files: Array<{ fileName: string; errors: string[]; warnings?: string[] }>;
}

@Component({
  selector: 'app-import-format-error-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="title" [class.warn]="!hasRejected">
      <mat-icon>{{ hasRejected ? 'block' : 'warning' }}</mat-icon>
      {{ hasRejected ? 'Có file Excel không đọc được' : 'Một số dòng trong file Excel bị bỏ qua' }}
    </h2>
    <mat-dialog-content>
      <p>Hệ thống nhận cột theo dòng tiêu đề (Họ và tên, Trạm xe, Số ĐT, Thời gian làm việc Từ/Đến, Mã nhân viên...).
        Dòng nào không đúng mẫu thì chỉ bỏ qua dòng đó, những người còn lại vẫn được nhập.
        File chỉ bị từ chối khi không có cột Họ và tên / Trạm xe hoặc không có người nào hợp lệ.</p>
      <div *ngFor="let file of data.files" class="file">
        <strong>{{ file.fileName }}</strong>
        <div *ngIf="file.errors.length" class="label error">Không nhập được file này:</div>
        <ul *ngIf="file.errors.length" class="error">
          <li *ngFor="let error of file.errors">{{ error }}</li>
        </ul>
        <div *ngIf="file.warnings?.length" class="label warn">Đã nhập các dòng khác; cần kiểm tra lại:</div>
        <ul *ngIf="file.warnings?.length" class="warn">
          <li *ngFor="let warning of file.warnings">{{ warning }}</li>
        </ul>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button color="primary" (click)="dialogRef.close()">Đóng</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .title { display: flex; align-items: center; gap: 8px; color: #c62828; }
    .title.warn { color: #e65100; }
    .file { margin-top: 12px; }
    .label { margin-top: 6px; font-weight: 500; }
    ul { margin: 6px 0 0; padding-left: 20px; }
    .error { color: #c62828; }
    .warn { color: #e65100; }
  `]
})
export class ImportFormatErrorDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ImportFormatErrorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ImportFormatErrorData
  ) {}

  get hasRejected(): boolean {
    return this.data.files.some(file => file.errors.length > 0);
  }
}
