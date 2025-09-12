import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PdfExportEmployeeStationService } from '../../services/pdf-export-employee-station.service';

@Component({
  selector: 'app-pdf-export-demo',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="demo-container">
      <mat-card class="demo-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>picture_as_pdf</mat-icon>
            Demo Xuất PDF Nhân Viên Theo Trạm Xe
          </mat-card-title>
          <mat-card-subtitle>
            Chức năng gom nhóm nhân viên theo tuyến đường và trạm xe
          </mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="demo-content">
            <p>Chức năng này sẽ:</p>
            <ul>
              <li>Gom nhóm nhân viên theo tuyến xe (MaTuyenXe)</li>
              <li>Trong mỗi tuyến, gom nhóm theo trạm xe (TramXe)</li>
              <li>Sắp xếp trạm theo thứ tự trong tuyến đường</li>
              <li>Xuất PDF với bảng danh sách chi tiết</li>
            </ul>
            
            <div class="action-section">
              <button mat-raised-button 
                      color="primary" 
                      (click)="exportPDF()"
                      [disabled]="isExporting"
                      class="export-btn">
                <mat-icon *ngIf="!isExporting">picture_as_pdf</mat-icon>
                <mat-spinner *ngIf="isExporting" diameter="20"></mat-spinner>
                {{ isExporting ? 'Đang xuất PDF...' : 'Xuất PDF' }}
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .demo-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .demo-card {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
    }

    .demo-card mat-card-header {
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      margin: -24px -24px 24px -24px;
      padding: 24px;
      border-radius: 12px 12px 0 0;
    }

    .demo-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }

    .demo-card mat-card-subtitle {
      color: rgba(255, 255, 255, 0.9);
      font-size: 1rem;
      margin: 8px 0 0 0;
    }

    .demo-content {
      padding: 16px 0;
    }

    .demo-content p {
      font-size: 1.1rem;
      margin-bottom: 16px;
      color: #333;
    }

    .demo-content ul {
      margin: 16px 0;
      padding-left: 24px;
    }

    .demo-content li {
      margin-bottom: 8px;
      color: #555;
      line-height: 1.5;
    }

    .action-section {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
    }

    .export-btn {
      padding: 12px 24px;
      font-size: 1.1rem;
      font-weight: 500;
      border-radius: 8px;
      min-width: 160px;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
    }

    .export-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .export-btn mat-spinner {
      margin: 0;
    }
  `]
})
export class PdfExportDemoComponent implements OnInit {
  isExporting = false;

  constructor(
    private pdfExportService: PdfExportEmployeeStationService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    console.log('PDF Export Demo Component initialized');
  }

  async exportPDF(): Promise<void> {
    try {
      this.isExporting = true;
      
      this.snackBar.open('Đang tạo file PDF...', 'Đóng', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });

      await this.pdfExportService.exportEmployeeStationPDF();

      this.snackBar.open('Xuất PDF thành công!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      this.snackBar.open('Có lỗi xảy ra khi xuất PDF!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } finally {
      this.isExporting = false;
    }
  }
}
