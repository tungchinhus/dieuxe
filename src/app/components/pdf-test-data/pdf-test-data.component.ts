import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { NhanVien } from '../../models/employee.model';
import { RouteDetail } from '../../models/route-detail.model';
import { PdfExportEmployeeStationService } from '../../services/pdf-export-employee-station.service';

@Component({
  selector: 'app-pdf-test-data',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule
  ],
  template: `
    <div class="test-container">
      <mat-card class="test-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>science</mat-icon>
            Test Data cho Xuất PDF
          </mat-card-title>
          <mat-card-subtitle>
            Tạo dữ liệu mẫu để test chức năng xuất PDF
          </mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="test-content">
            <p>Component này tạo dữ liệu mẫu để test chức năng xuất PDF:</p>
            
            <div class="data-preview">
              <h3>Dữ liệu mẫu sẽ được tạo:</h3>
              <div class="preview-section">
                <h4>Nhân viên mẫu:</h4>
                <div class="employee-chips">
                  <mat-chip *ngFor="let emp of sampleEmployees" class="employee-chip">
                    {{ emp.HoTen }} - {{ emp.MaTuyenXe }} - {{ emp.TramXe }}
                  </mat-chip>
                </div>
              </div>
              
              <div class="preview-section">
                <h4>Tuyến đường mẫu:</h4>
                <div class="route-chips">
                  <mat-chip *ngFor="let route of sampleRoutes" class="route-chip">
                    {{ route.maTuyenXe }} - {{ route.tenDiemDon }} ({{ route.thuTu }})
                  </mat-chip>
                </div>
              </div>
            </div>
            
            <div class="action-section">
              <button mat-raised-button 
                      color="primary" 
                      (click)="testWithSampleData()"
                      [disabled]="isTesting"
                      class="test-btn">
                <mat-icon *ngIf="!isTesting">play_arrow</mat-icon>
                <mat-spinner *ngIf="isTesting" diameter="20"></mat-spinner>
                {{ isTesting ? 'Đang test...' : 'Test với dữ liệu mẫu' }}
              </button>
              
              <button mat-raised-button 
                      color="accent" 
                      (click)="showDataStructure()"
                      class="info-btn">
                <mat-icon>info</mat-icon>
                Xem cấu trúc dữ liệu
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .test-container {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .test-card {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
    }

    .test-card mat-card-header {
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
      color: white;
      margin: -24px -24px 24px -24px;
      padding: 24px;
      border-radius: 12px 12px 0 0;
    }

    .test-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }

    .test-card mat-card-subtitle {
      color: rgba(255, 255, 255, 0.9);
      font-size: 1rem;
      margin: 8px 0 0 0;
    }

    .test-content {
      padding: 16px 0;
    }

    .test-content p {
      font-size: 1.1rem;
      margin-bottom: 24px;
      color: #333;
    }

    .data-preview {
      margin: 24px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #ff9800;
    }

    .data-preview h3 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 1.2rem;
    }

    .preview-section {
      margin-bottom: 20px;
    }

    .preview-section h4 {
      margin: 0 0 12px 0;
      color: #555;
      font-size: 1rem;
    }

    .employee-chips, .route-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .employee-chip {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .route-chip {
      background-color: #f3e5f5;
      color: #7b1fa2;
    }

    .action-section {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .test-btn, .info-btn {
      padding: 12px 24px;
      font-size: 1rem;
      font-weight: 500;
      border-radius: 8px;
      min-width: 180px;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
    }

    .test-btn mat-icon, .info-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .test-btn mat-spinner {
      margin: 0;
    }
  `]
})
export class PdfTestDataComponent implements OnInit {
  isTesting = false;
  
  sampleEmployees: NhanVien[] = [];
  sampleRoutes: RouteDetail[] = [];

  constructor(
    private pdfExportService: PdfExportEmployeeStationService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.generateSampleData();
  }

  private generateSampleData(): void {
    // Tạo dữ liệu nhân viên mẫu
    this.sampleEmployees = [
      {
        NhanVienID: 1,
        MaNhanVien: 'NV001',
        HoTen: 'Nguyễn Văn An',
        DienThoai: '0901234567',
        MaTuyenXe: 'T1',
        TramXe: 'Bến xe Miền Đông',
        CreatedAt: new Date(),
        UpdatedAt: new Date()
      },
      {
        NhanVienID: 2,
        MaNhanVien: 'NV002',
        HoTen: 'Trần Thị Bình',
        DienThoai: '0901234568',
        MaTuyenXe: 'T1',
        TramXe: 'Bến xe Miền Đông',
        CreatedAt: new Date(),
        UpdatedAt: new Date()
      },
      {
        NhanVienID: 3,
        MaNhanVien: 'NV003',
        HoTen: 'Lê Văn Cường',
        DienThoai: '0901234569',
        MaTuyenXe: 'T1',
        TramXe: 'Ngã 4 Thủ Đức',
        CreatedAt: new Date(),
        UpdatedAt: new Date()
      },
      {
        NhanVienID: 4,
        MaNhanVien: 'NV004',
        HoTen: 'Phạm Thị Dung',
        DienThoai: '0901234570',
        MaTuyenXe: 'T2',
        TramXe: 'Bến xe Chợ Lớn',
        CreatedAt: new Date(),
        UpdatedAt: new Date()
      },
      {
        NhanVienID: 5,
        MaNhanVien: 'NV005',
        HoTen: 'Hoàng Văn Em',
        DienThoai: '0901234571',
        MaTuyenXe: 'T2',
        TramXe: 'Bến xe Chợ Lớn',
        CreatedAt: new Date(),
        UpdatedAt: new Date()
      },
      {
        NhanVienID: 6,
        MaNhanVien: 'NV006',
        HoTen: 'Vũ Thị Phương',
        DienThoai: '0901234572',
        MaTuyenXe: 'T2',
        TramXe: 'Ngã 6 Gò Vấp',
        CreatedAt: new Date(),
        UpdatedAt: new Date()
      },
      {
        NhanVienID: 7,
        MaNhanVien: 'NV007',
        HoTen: 'Đặng Văn Giang',
        DienThoai: '0901234573',
        MaTuyenXe: 'T3',
        TramXe: 'Bến xe An Sương',
        CreatedAt: new Date(),
        UpdatedAt: new Date()
      },
      {
        NhanVienID: 8,
        MaNhanVien: 'NV008',
        HoTen: 'Bùi Thị Hoa',
        DienThoai: '0901234574',
        MaTuyenXe: 'T3',
        TramXe: 'Bến xe An Sương',
        CreatedAt: new Date(),
        UpdatedAt: new Date()
      }
    ];

    // Tạo dữ liệu tuyến đường mẫu
    this.sampleRoutes = [
      {
        maChiTiet: 1,
        maTuyenXe: 'T1',
        tenDiemDon: 'Bến xe Miền Đông',
        thuTu: 1
      },
      {
        maChiTiet: 2,
        maTuyenXe: 'T1',
        tenDiemDon: 'Ngã 4 Thủ Đức',
        thuTu: 2
      },
      {
        maChiTiet: 3,
        maTuyenXe: 'T2',
        tenDiemDon: 'Bến xe Chợ Lớn',
        thuTu: 1
      },
      {
        maChiTiet: 4,
        maTuyenXe: 'T2',
        tenDiemDon: 'Ngã 6 Gò Vấp',
        thuTu: 2
      },
      {
        maChiTiet: 5,
        maTuyenXe: 'T3',
        tenDiemDon: 'Bến xe An Sương',
        thuTu: 1
      }
    ];
  }

  async testWithSampleData(): Promise<void> {
    try {
      this.isTesting = true;
      
      this.snackBar.open('Đang tạo PDF với dữ liệu mẫu...', 'Đóng', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });

      // Tạo PDF với dữ liệu mẫu
      await this.createPDFWithSampleData();

      this.snackBar.open('Tạo PDF thành công với dữ liệu mẫu!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error creating PDF with sample data:', error);
      this.snackBar.open('Có lỗi xảy ra khi tạo PDF!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } finally {
      this.isTesting = false;
    }
  }

  private async createPDFWithSampleData(): Promise<void> {
    // Sử dụng service để tạo PDF với dữ liệu mẫu
    // Tạm thời sử dụng service hiện tại, có thể cần tạo method riêng
    await this.pdfExportService.exportEmployeeStationPDF();
  }

  showDataStructure(): void {
    console.log('=== SAMPLE EMPLOYEES ===');
    console.log(this.sampleEmployees);
    console.log('=== SAMPLE ROUTES ===');
    console.log(this.sampleRoutes);
    
    this.snackBar.open('Cấu trúc dữ liệu đã được log vào console', 'Đóng', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }
}
