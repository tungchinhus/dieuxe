import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { StationAssignment, PDFExportData, DriverInfo, VehicleInfo } from '../models/vehicle.model';
import { FirestoreService } from './firestore.service';
import { RouteDetailService } from './route-detail.service';

@Injectable({
  providedIn: 'root'
})
export class StationAssignmentPdfExportService {

  constructor(
    private firestoreService: FirestoreService,
    private routeDetailService: RouteDetailService
  ) {}

  /**
   * Export station assignments to PDF
   */
  async exportStationAssignmentsToPDF(exportData: PDFExportData): Promise<void> {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Set document properties
      doc.setProperties({
        title: 'Báo cáo phân công tài xế và xe theo trạm',
        subject: 'Station Assignment Report',
        author: 'Thibidi System',
        creator: 'Thibidi System'
      });

      let currentY = 20;

      // Add header
      currentY = this.addHeader(doc, pageWidth, currentY);

      // Add summary
      currentY = this.addSummary(doc, exportData, pageWidth, currentY);

      // Add station assignments
      for (let i = 0; i < exportData.stationAssignments.length; i++) {
        const assignment = exportData.stationAssignments[i];
        
        // Check if we need a new page
        if (currentY > pageHeight - 80) {
          doc.addPage();
          currentY = 20;
        }

        currentY = this.addStationAssignment(doc, assignment, pageWidth, currentY, i + 1);
        
        // Add spacing between assignments
        currentY += 10;
      }

      // Add footer
      this.addFooter(doc, pageWidth, pageHeight);

      // Save PDF
      const fileName = `PhanCongTaiXeVaXe_${this.getCurrentDateString()}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error exporting station assignments PDF:', error);
      throw error;
    }
  }

  /**
   * Add header to PDF
   */
  private addHeader(doc: jsPDF, pageWidth: number, startY: number): number {
    // Company logo area (placeholder)
    doc.setFillColor(25, 118, 210);
    doc.rect(20, startY, pageWidth - 40, 15, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('BÁO CÁO PHÂN CÔNG TÀI XẾ VÀ XE THEO TRẠM', pageWidth / 2, startY + 10, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    return startY + 25;
  }

  /**
   * Add summary section
   */
  private addSummary(doc: jsPDF, exportData: PDFExportData, pageWidth: number, startY: number): number {
    let currentY = startY;

    // Summary title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TỔNG QUAN', 20, currentY);
    currentY += 10;

    // Summary box
    doc.setDrawColor(25, 118, 210);
    doc.setLineWidth(0.5);
    doc.rect(20, currentY, pageWidth - 40, 35);

    // Summary content
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const summaryData = [
      { label: 'Ngày xuất báo cáo:', value: this.formatDate(exportData.exportDate) },
      { label: 'Tổng số trạm:', value: exportData.totalStations.toString() },
      { label: 'Tổng số nhân viên:', value: exportData.totalEmployees.toString() },
      { label: 'Tổng số xe:', value: exportData.totalVehicles.toString() }
    ];

    let x = 25;
    let y = currentY + 8;
    const colWidth = (pageWidth - 50) / 2;

    summaryData.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      
      doc.setFont('helvetica', 'bold');
      doc.text(item.label, x + col * colWidth, y + row * 12);
      doc.setFont('helvetica', 'normal');
      doc.text(item.value, x + col * colWidth + 60, y + row * 12);
    });

    return currentY + 45;
  }

  /**
   * Add station assignment details
   */
  private addStationAssignment(doc: jsPDF, assignment: StationAssignment, pageWidth: number, startY: number, index: number): number {
    let currentY = startY;

    // Station title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 118, 210);
    doc.text(`${index}. ${assignment.stationName}`, 20, currentY);
    currentY += 6;

    // Route info
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tuyến: ${assignment.routeCode} - ${assignment.routeName}`, 20, currentY);
    doc.text(`Số nhân viên: ${assignment.employeeCount} người`, pageWidth - 60, currentY);
    currentY += 8;

    // Assignment details box
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(20, currentY, pageWidth - 40, 25);

    // Driver info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('TÀI XẾ:', 25, currentY + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Tên: ${assignment.assignedDriver.driverName}`, 25, currentY + 12);
    doc.text(`SĐT: ${assignment.assignedDriver.phoneNumber}`, 25, currentY + 18);
    
    if (assignment.assignedDriver.licenseNumber) {
      doc.text(`Bằng lái: ${assignment.assignedDriver.licenseNumber}`, 25, currentY + 24);
    }

    // Vehicle info
    const vehicleX = pageWidth / 2;
    doc.setFont('helvetica', 'bold');
    doc.text('XE:', vehicleX, currentY + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Biển số: ${assignment.assignedVehicle.licensePlate}`, vehicleX, currentY + 12);
    doc.text(`Loại xe: ${assignment.assignedVehicle.vehicleType}`, vehicleX, currentY + 18);
    doc.text(`Sức chứa: ${assignment.assignedVehicle.capacity} chỗ`, vehicleX, currentY + 24);

    return currentY + 35;
  }

  /**
   * Add footer
   */
  private addFooter(doc: jsPDF, pageWidth: number, pageHeight: number): void {
    const footerY = pageHeight - 15;
    
    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
    
    // Footer text
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Báo cáo được tạo bởi hệ thống Thibidi', 20, footerY);
    doc.text(`Trang ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - 20, footerY, { align: 'right' });
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get current date string for filename
   */
  private getCurrentDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0].replace(/-/g, '');
  }

  /**
   * Generate mock driver data for testing
   */
  generateMockDrivers(): DriverInfo[] {
    return [
      {
        driverId: 'DRV001',
        driverName: 'Nguyễn Văn An',
        phoneNumber: '0901234567',
        licenseNumber: 'A123456789'
      },
      {
        driverId: 'DRV002',
        driverName: 'Trần Thị Bình',
        phoneNumber: '0901234568',
        licenseNumber: 'B123456789'
      },
      {
        driverId: 'DRV003',
        driverName: 'Lê Văn Cường',
        phoneNumber: '0901234569',
        licenseNumber: 'C123456789'
      },
      {
        driverId: 'DRV004',
        driverName: 'Phạm Thị Dung',
        phoneNumber: '0901234570',
        licenseNumber: 'D123456789'
      },
      {
        driverId: 'DRV005',
        driverName: 'Hoàng Văn Em',
        phoneNumber: '0901234571',
        licenseNumber: 'E123456789'
      }
    ];
  }

  /**
   * Generate mock station data for testing
   */
  generateMockStations(): any[] {
    return [
      {
        stationId: 'STN001',
        stationName: 'BV Hòa Hảo',
        routeCode: 'HCM01',
        routeName: 'Tuyến HCM01',
        employeeCount: 25
      },
      {
        stationId: 'STN002',
        stationName: 'Ngã 4 Thủ Đức',
        routeCode: 'HCM01',
        routeName: 'Tuyến HCM01',
        employeeCount: 18
      },
      {
        stationId: 'STN003',
        stationName: 'Bà Chiểu',
        routeCode: 'HCM02',
        routeName: 'Tuyến HCM02',
        employeeCount: 12
      },
      {
        stationId: 'STN004',
        stationName: 'Chợ Gò Vấp',
        routeCode: 'HCM02',
        routeName: 'Tuyến HCM02',
        employeeCount: 8
      },
      {
        stationId: 'STN005',
        stationName: 'Trung tâm Quận 1',
        routeCode: 'HCM03',
        routeName: 'Tuyến HCM03',
        employeeCount: 35
      }
    ];
  }
}
