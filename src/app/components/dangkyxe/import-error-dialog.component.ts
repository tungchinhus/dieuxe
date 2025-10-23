import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Registration } from '../../models/registration.model';

export interface ImportErrorData {
  totalProcessed: number;
  savedCount: number;
  failedData: Array<{
    registration: Registration;
    reason: string;
  }>;
}

@Component({
  selector: 'app-import-error-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatCardModule,
    MatToolbarModule
  ],
  template: `
    <div class="import-error-dialog">
      <mat-toolbar color="warn">
        <mat-icon>error</mat-icon>
        <span>Chi tiết Import Excel</span>
      </mat-toolbar>
      
      <div class="dialog-content">
        <mat-card class="summary-card">
          <mat-card-header>
            <mat-card-title>Kết quả Import</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="summary-stats">
              <div class="stat-item">
                <span class="stat-label">Tổng số dữ liệu:</span>
                <span class="stat-value">{{ data.totalProcessed }}</span>
              </div>
              <div class="stat-item success">
                <span class="stat-label">Import thành công:</span>
                <span class="stat-value">{{ data.savedCount }}</span>
              </div>
              <div class="stat-item error">
                <span class="stat-label">Không import được:</span>
                <span class="stat-value">{{ data.failedData.length }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <div *ngIf="data.failedData.length > 0" class="error-details">
          <h3>Chi tiết các dữ liệu không import được:</h3>
          
          <div class="table-container">
            <table mat-table [dataSource]="data.failedData" class="error-table">
              <!-- STT Column -->
              <ng-container matColumnDef="stt">
                <th mat-header-cell *matHeaderCellDef>STT</th>
                <td mat-cell *matCellDef="let element; let i = index">{{ i + 1 }}</td>
              </ng-container>

              <!-- Họ tên Column -->
              <ng-container matColumnDef="hoTen">
                <th mat-header-cell *matHeaderCellDef>Họ và tên</th>
                <td mat-cell *matCellDef="let element">{{ element.registration.hoTen }}</td>
              </ng-container>

              <!-- Trạm xe Column -->
              <ng-container matColumnDef="tramXe">
                <th mat-header-cell *matHeaderCellDef>Trạm xe</th>
                <td mat-cell *matCellDef="let element">{{ element.registration.tramXe }}</td>
              </ng-container>

              <!-- Điện thoại Column -->
              <ng-container matColumnDef="dienThoai">
                <th mat-header-cell *matHeaderCellDef>Điện thoại</th>
                <td mat-cell *matCellDef="let element">{{ element.registration.dienThoai }}</td>
              </ng-container>

              <!-- Thời gian Column -->
              <ng-container matColumnDef="thoiGian">
                <th mat-header-cell *matHeaderCellDef>Thời gian</th>
                <td mat-cell *matCellDef="let element">
                  {{ element.registration.thoiGianBatDau }} - {{ element.registration.thoiGianKetThuc }}
                </td>
              </ng-container>

              <!-- Lý do lỗi Column -->
              <ng-container matColumnDef="reason">
                <th mat-header-cell *matHeaderCellDef>Lý do lỗi</th>
                <td mat-cell *matCellDef="let element" class="error-reason">
                  <mat-icon class="error-icon">warning</mat-icon>
                  {{ element.reason }}
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="onClose()" color="primary">
          <mat-icon>close</mat-icon>
          Đóng
        </button>
      </div>
    </div>
  `,
  styles: [`
    .import-error-dialog {
      max-width: 1000px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
    }

    .dialog-content {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }

    .summary-card {
      margin-bottom: 20px;
    }

    .summary-stats {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px;
      border-radius: 8px;
      background-color: #f5f5f5;
      min-width: 120px;
    }

    .stat-item.success {
      background-color: #e8f5e8;
      border: 1px solid #4caf50;
    }

    .stat-item.error {
      background-color: #ffebee;
      border: 1px solid #f44336;
    }

    .stat-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }

    .stat-value {
      font-size: 18px;
      font-weight: bold;
    }

    .stat-item.success .stat-value {
      color: #4caf50;
    }

    .stat-item.error .stat-value {
      color: #f44336;
    }

    .error-details h3 {
      color: #f44336;
      margin-bottom: 15px;
    }

    .table-container {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .error-table {
      width: 100%;
    }

    .error-table th {
      background-color: #f5f5f5;
      font-weight: bold;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .error-reason {
      color: #f44336;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .error-icon {
      font-size: 16px;
      color: #f44336;
    }

    .dialog-actions {
      padding: 20px;
      border-top: 1px solid #ddd;
      display: flex;
      justify-content: flex-end;
    }

    .dialog-actions button {
      display: flex;
      align-items: center;
      gap: 5px;
    }
  `]
})
export class ImportErrorDialogComponent {
  displayedColumns: string[] = ['stt', 'hoTen', 'tramXe', 'dienThoai', 'thoiGian', 'reason'];

  constructor(
    public dialogRef: MatDialogRef<ImportErrorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ImportErrorData
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}
