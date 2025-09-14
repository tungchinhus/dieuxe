import { Component } from '@angular/core';
import { PdfExportService } from '../../services/pdf-export.service';

@Component({
  selector: 'app-pdf-export-test',
  template: `
    <div class="pdf-export-test">
      <h2>Test PDF Export với Merge Cell</h2>
      
      <div class="button-group">
        <button (click)="exportRegularPDF()" class="btn btn-primary">
          Xuất PDF thường
        </button>
        
        <button (click)="exportOvertimeReportPDF()" class="btn btn-success">
          Xuất Phiếu Báo Làm Thêm Giờ (Merge Cell)
        </button>
      </div>
      
      <div class="info-section">
        <h3>Chức năng mới:</h3>
        <ul>
          <li>✅ Merge cell cho nhân viên cùng trạm xe</li>
          <li>✅ Gom nhóm nhân viên theo trạm xe</li>
          <li>✅ Hiển thị thời gian làm việc mặc định (15h45 - 19h)</li>
          <li>✅ Layout giống phiếu báo làm thêm giờ mẫu</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .pdf-export-test {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .button-group {
      margin: 20px 0;
      display: flex;
      gap: 15px;
    }
    
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-primary:hover {
      background-color: #0056b3;
    }
    
    .btn-success {
      background-color: #28a745;
      color: white;
    }
    
    .btn-success:hover {
      background-color: #1e7e34;
    }
    
    .info-section {
      margin-top: 30px;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }
    
    .info-section h3 {
      color: #495057;
      margin-bottom: 15px;
    }
    
    .info-section ul {
      margin: 0;
      padding-left: 20px;
    }
    
    .info-section li {
      margin-bottom: 8px;
      color: #6c757d;
    }
  `]
})
export class PdfExportTestComponent {
  
  constructor(private pdfExportService: PdfExportService) {}

  /**
   * Xuất PDF thường (không merge cell)
   */
  async exportRegularPDF(): Promise<void> {
    try {
      await this.pdfExportService.exportToPDF();
    } catch (error) {
      console.error('Lỗi khi xuất PDF thường:', error);
      alert('Có lỗi xảy ra khi xuất PDF thường');
    }
  }

  /**
   * Xuất phiếu báo làm thêm giờ với merge cell
   */
  async exportOvertimeReportPDF(): Promise<void> {
    try {
      await this.pdfExportService.exportOvertimeReportPDF();
    } catch (error) {
      console.error('Lỗi khi xuất phiếu báo làm thêm giờ:', error);
      alert('Có lỗi xảy ra khi xuất phiếu báo làm thêm giờ');
    }
  }
}
