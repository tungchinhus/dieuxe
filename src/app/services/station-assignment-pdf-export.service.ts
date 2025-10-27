import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { StationAssignment, PDFExportData, DriverInfo, VehicleInfo } from '../models/vehicle.model';
import { FirestoreService } from './firestore.service';
import { RouteDetailService } from './route-detail.service';
import { RouteDetail } from '../models/route-detail.model';

@Injectable({
  providedIn: 'root'
})
export class StationAssignmentPdfExportService {

  constructor(
    private firestoreService: FirestoreService,
    private routeDetailService: RouteDetailService
  ) {}

  /**
   * Export station assignments to PDF in overtime report format with driver/vehicle info
   */
  async exportStationAssignmentsToPDF(exportData: PDFExportData): Promise<void> {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Set document properties
      doc.setProperties({
        title: 'Phiếu báo làm thêm giờ - Phân công tài xế và xe',
        subject: 'Overtime Report with Driver and Vehicle Assignment',
        author: 'Thibidi System',
        creator: 'Thibidi System'
      });

      let currentY = 20;

      // Add header in overtime report style
      currentY = this.addOvertimeReportHeader(doc, pageWidth, currentY);

      // Add summary
      currentY = this.addOvertimeSummary(doc, exportData, pageWidth, currentY);

      // Sort station assignments by route order (thuTu) before exporting
      const sortedAssignments = await this.sortStationAssignmentsByRouteOrder(exportData.stationAssignments);

      // Add station assignments with driver and vehicle info
      for (let i = 0; i < sortedAssignments.length; i++) {
        const assignment = sortedAssignments[i];
        
        // Check if we need a new page
        if (currentY > pageHeight - 100) {
          doc.addPage();
          currentY = 20;
          currentY = this.addOvertimeReportHeader(doc, pageWidth, currentY);
        }

        currentY = this.addOvertimeStationAssignment(doc, assignment, pageWidth, currentY, i + 1);
        
        // Add spacing between assignments
        currentY += 15;
      }

      // Add footer
      this.addOvertimeFooter(doc, pageWidth, pageHeight);

      // Save PDF
      const fileName = `PHIEU_BAO_LAM_THEM_GIO_PHAN_CONG_${this.getCurrentDateString()}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error exporting station assignments PDF:', error);
      throw error;
    }
  }

  /**
   * Add overtime report style header
   */
  private addOvertimeReportHeader(doc: jsPDF, pageWidth: number, startY: number): number {
    // Company header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('CÔNG TY TNHH THIBIDI', pageWidth / 2, startY, { align: 'center' });
    
    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PHIẾU BÁO LÀM THÊM GIỜ', pageWidth / 2, startY + 8, { align: 'center' });
    doc.text('PHÂN CÔNG TÀI XẾ VÀ XE', pageWidth / 2, startY + 16, { align: 'center' });
    
    // Date line
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ngày: ${this.formatDate(new Date())}`, pageWidth - 20, startY + 25, { align: 'right' });
    
    return startY + 35;
  }

  /**
   * Add overtime summary section
   */
  private addOvertimeSummary(doc: jsPDF, exportData: PDFExportData, pageWidth: number, startY: number): number {
    let currentY = startY;

    // Summary title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('THÔNG TIN TỔNG QUAN', 20, currentY);
    currentY += 8;

    // Summary table
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(20, currentY, pageWidth - 40, 50);

    // Table headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Tổng số trạm:', 25, currentY + 8);
    doc.text('Tổng số xe được phân công:', 25, currentY + 16);
    doc.text('Tổng số nhân viên:', 25, currentY + 24);
    doc.text('Phân bổ xe đồng đều:', 25, currentY + 32);
    doc.text('Ngày xuất báo cáo:', 25, currentY + 40);

    // Table values
    doc.setFont('helvetica', 'normal');
    doc.text(exportData.totalStations.toString(), 80, currentY + 8);
    doc.text(exportData.stationAssignments.filter(a => a.assignedVehicle.vehicleId).length.toString(), 80, currentY + 16);
    doc.text(exportData.totalEmployees.toString(), 80, currentY + 24);
    
    // Kiểm tra phân bổ đồng đều
    const vehicleDistribution = this.calculateVehicleDistribution(exportData.stationAssignments);
    const isEvenDistribution = this.isEvenDistribution(vehicleDistribution);
    doc.text(isEvenDistribution ? 'Có' : 'Không', 80, currentY + 32);
    
    doc.text(this.formatDate(new Date()), 80, currentY + 40);

    return currentY + 60;
  }

  /**
   * Tính toán phân bổ xe cho các trạm
   */
  private calculateVehicleDistribution(assignments: StationAssignment[]): { [stationId: string]: number } {
    const distribution: { [stationId: string]: number } = {};
    assignments.forEach(assignment => {
      distribution[assignment.stationId] = assignment.assignedVehicle.vehicleId ? 1 : 0;
    });
    return distribution;
  }

  /**
   * Kiểm tra xem phân bổ có đồng đều không
   */
  private isEvenDistribution(distribution: { [stationId: string]: number }): boolean {
    const values = Object.values(distribution);
    if (values.length === 0) return false;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Phân bổ được coi là đồng đều nếu chênh lệch không quá 1
    return (max - min) <= 1;
  }

  /**
   * Add overtime station assignment details
   */
  private addOvertimeStationAssignment(doc: jsPDF, assignment: StationAssignment, pageWidth: number, startY: number, index: number): number {
    let currentY = startY;

    // Station title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`${index}. TRẠM: ${assignment.stationName.toUpperCase()}`, 20, currentY);
    currentY += 8;

    // Route info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tuyến: ${assignment.routeCode}`, 20, currentY);
    currentY += 10;

    // Assignment details table
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(20, currentY, pageWidth - 40, 30);

    // Table header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('THÔNG TIN XE ĐƯỢC PHÂN CÔNG', 25, currentY + 8);

    // Vehicle details
    doc.setFont('helvetica', 'normal');
    doc.text(`Biển số: ${assignment.assignedVehicle.licensePlate}`, 25, currentY + 16);
    doc.text(`Loại xe: ${assignment.assignedVehicle.vehicleType}`, 25, currentY + 24);
    doc.text(`Sức chứa: ${assignment.assignedVehicle.capacity} chỗ`, 25, currentY + 32);

    return currentY + 40;
  }

  /**
   * Add overtime footer
   */
  private addOvertimeFooter(doc: jsPDF, pageWidth: number, pageHeight: number): void {
    const footerY = pageHeight - 20;
    
    // Signature lines
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Người lập phiếu', 50, footerY - 20);
    doc.text('Người duyệt', pageWidth - 50, footerY - 20, { align: 'right' });
    
    // Signature lines
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(50, footerY - 15, 100, footerY - 15);
    doc.line(pageWidth - 100, footerY - 15, pageWidth - 50, footerY - 15);
    
    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
    
    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Phiếu được tạo bởi hệ thống Thibidi', 20, footerY);
    doc.text(`Trang ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - 20, footerY, { align: 'right' });
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
    doc.text(`Tuyến: ${assignment.routeCode}`, 20, currentY);
    currentY += 8;

    // Assignment details box
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(20, currentY, pageWidth - 40, 25);

    // Vehicle info only
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('XE:', 25, currentY + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Biển số: ${assignment.assignedVehicle.licensePlate}`, 25, currentY + 12);
    doc.text(`Loại xe: ${assignment.assignedVehicle.vehicleType}`, 25, currentY + 18);
    doc.text(`Sức chứa: ${assignment.assignedVehicle.capacity} chỗ`, 25, currentY + 24);

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
   * Normalize station name for better matching
   */
  private normalizeStationName(stationName: string): string {
    if (!stationName) return '';
    
    return stationName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[()]/g, '') // Remove parentheses
      .replace(/[.,]/g, '') // Remove dots and commas
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd');
  }

  /**
   * Sort station assignments by route order (thuTu) from route details
   */
  private async sortStationAssignmentsByRouteOrder(assignments: StationAssignment[]): Promise<StationAssignment[]> {
    try {
      // First check if assignments already have thuTu field
      const hasThuTuField = assignments.some(a => a.thuTu !== undefined);
      
      if (hasThuTuField) {
        // Sort directly by thuTu field if available
        const sortedAssignments = [...assignments].sort((a, b) => {
          // First sort by route code
          if (a.routeCode !== b.routeCode) {
            return a.routeCode.localeCompare(b.routeCode);
          }

          // Then sort by thuTu within the same route
          const orderA = a.thuTu || 999;
          const orderB = b.thuTu || 999;
          return orderA - orderB;
        });

        console.log('Sorted station assignments by thuTu field:', sortedAssignments.map(a => ({
          routeCode: a.routeCode,
          stationName: a.stationName,
          thuTu: a.thuTu
        })));

        return sortedAssignments;
      }

      // Fallback: Get route details from service if thuTu field is not available
      const routeDetails = await this.routeDetailService.getRouteDetails().toPromise();
      
      if (!routeDetails || routeDetails.length === 0) {
        console.warn('No route details found, returning assignments without sorting');
        return assignments;
      }

      // Create a map of station names to their order for each route
      const stationOrderMap = new Map<string, Map<string, number>>();
      
      routeDetails.forEach(detail => {
        if (!stationOrderMap.has(detail.maTuyenXe)) {
          stationOrderMap.set(detail.maTuyenXe, new Map());
        }
        // Store both exact match and normalized match for better matching
        stationOrderMap.get(detail.maTuyenXe)!.set(detail.tenDiemDon, detail.thuTu);
        stationOrderMap.get(detail.maTuyenXe)!.set(this.normalizeStationName(detail.tenDiemDon), detail.thuTu);
      });

      // Sort assignments by route order
      const sortedAssignments = [...assignments].sort((a, b) => {
        // First sort by route code
        if (a.routeCode !== b.routeCode) {
          return a.routeCode.localeCompare(b.routeCode);
        }

        // Then sort by station order within the same route
        const routeOrderMap = stationOrderMap.get(a.routeCode);
        if (routeOrderMap) {
          // Try exact match first
          let orderA = routeOrderMap.get(a.stationName);
          let orderB = routeOrderMap.get(b.stationName);
          
          // If no exact match, try normalized match
          if (orderA === undefined) {
            orderA = routeOrderMap.get(this.normalizeStationName(a.stationName));
          }
          if (orderB === undefined) {
            orderB = routeOrderMap.get(this.normalizeStationName(b.stationName));
          }
          
          // Use found order or default to 999
          orderA = orderA || 999;
          orderB = orderB || 999;
          
          return orderA - orderB;
        }

        // Fallback to alphabetical order if no route details found
        return a.stationName.localeCompare(b.stationName);
      });

      console.log('Sorted station assignments by route details:', sortedAssignments.map(a => ({
        routeCode: a.routeCode,
        stationName: a.stationName,
        order: stationOrderMap.get(a.routeCode)?.get(a.stationName) || 'unknown'
      })));

      return sortedAssignments;

    } catch (error) {
      console.error('Error sorting station assignments by route order:', error);
      // Return original assignments if sorting fails
      return assignments;
    }
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
        licenseNumber: 'A123456789',
        vehicleId: '60B12345',
        licensePlate: '60B12345',
        vehicleType: 'Xe taxi 7 chỗ'
      },
      {
        driverId: 'DRV002',
        driverName: 'Trần Thị Bình',
        phoneNumber: '0901234568',
        licenseNumber: 'B123456789',
        vehicleId: '16C60F018',
        licensePlate: '16C60F018',
        vehicleType: 'Xe 29 chỗ'
      },
      {
        driverId: 'DRV003',
        driverName: 'Lê Văn Cường',
        phoneNumber: '0901234569',
        licenseNumber: 'C123456789',
        vehicleId: '60B04889',
        licensePlate: '60B04889',
        vehicleType: 'Xe 16 chỗ'
      },
      {
        driverId: 'DRV004',
        driverName: 'Phạm Thị Dung',
        phoneNumber: '0901234570',
        licenseNumber: 'D123456789',
        vehicleId: '16C60F019',
        licensePlate: '16C60F019',
        vehicleType: 'Xe 29 chỗ'
      },
      {
        driverId: 'DRV005',
        driverName: 'Hoàng Văn Em',
        phoneNumber: '0901234571',
        licenseNumber: 'E123456789',
        vehicleId: '60B04890',
        licensePlate: '60B04890',
        vehicleType: 'Xe 16 chỗ'
      }
    ];
  }

  /**
   * Generate mock station data for testing with proper ordering
   */
  generateMockStations(): any[] {
    return [
      // HCM01 - Tuyến Hồ Chí Minh 1
      {
        stationId: 'HCM01_001',
        stationName: 'Ngã 3 Bến Gỗ',
        routeCode: 'HCM01',
        routeName: 'Tuyến HCM01',
        employeeCount: 5,
        thuTu: 1
      },
      {
        stationId: 'HCM01_002',
        stationName: 'Ngã 3 Long Bình Tân',
        routeCode: 'HCM01',
        routeName: 'Tuyến HCM01',
        employeeCount: 8,
        thuTu: 2
      },
      {
        stationId: 'HCM01_003',
        stationName: 'Ngã 4 Thủ Đức',
        routeCode: 'HCM01',
        routeName: 'Tuyến HCM01',
        employeeCount: 12,
        thuTu: 3
      },
      {
        stationId: 'HCM01_004',
        stationName: 'RMK',
        routeCode: 'HCM01',
        routeName: 'Tuyến HCM01',
        employeeCount: 3,
        thuTu: 4
      },
      {
        stationId: 'HCM01_005',
        stationName: 'Ngã 3 Cát Lái',
        routeCode: 'HCM01',
        routeName: 'Tuyến HCM01',
        employeeCount: 6,
        thuTu: 5
      },
      {
        stationId: 'HCM01_006',
        stationName: 'Hàng Xanh (Gần Văn Thánh)',
        routeCode: 'HCM01',
        routeName: 'Tuyến HCM01',
        employeeCount: 4,
        thuTu: 6
      },
      {
        stationId: 'HCM01_007',
        stationName: 'ĐTH - ĐBP',
        routeCode: 'HCM01',
        routeName: 'Tuyến HCM01',
        employeeCount: 7,
        thuTu: 7
      },
      {
        stationId: 'HCM01_008',
        stationName: 'Hai Bà Trưng - ĐBP',
        routeCode: 'HCM01',
        routeName: 'Tuyến HCM01',
        employeeCount: 9,
        thuTu: 8
      },
      {
        stationId: 'HCM01_009',
        stationName: 'BV Hòa Hảo',
        routeCode: 'HCM01',
        routeName: 'Tuyến HCM01',
        employeeCount: 11,
        thuTu: 9
      },

      // HCM02 - Tuyến Hồ Chí Minh 2
      {
        stationId: 'HCM02_001',
        stationName: 'KCN Biên Hòa 2',
        routeCode: 'HCM02',
        routeName: 'Tuyến HCM02',
        employeeCount: 15,
        thuTu: 1
      },
      {
        stationId: 'HCM02_002',
        stationName: 'Ngã 3 Vũng Tàu',
        routeCode: 'HCM02',
        routeName: 'Tuyến HCM02',
        employeeCount: 10,
        thuTu: 2
      },
      {
        stationId: 'HCM02_003',
        stationName: 'Cầu Rạch Miễu',
        routeCode: 'HCM02',
        routeName: 'Tuyến HCM02',
        employeeCount: 8,
        thuTu: 3
      },
      {
        stationId: 'HCM02_004',
        stationName: 'Bến Tre',
        routeCode: 'HCM02',
        routeName: 'Tuyến HCM02',
        employeeCount: 6,
        thuTu: 4
      },

      // HCM03 - Tuyến Hồ Chí Minh 3
      {
        stationId: 'HCM03_001',
        stationName: 'Vòng xoay Tam Hiệp',
        routeCode: 'HCM03',
        routeName: 'Tuyến HCM03',
        employeeCount: 12,
        thuTu: 1
      },
      {
        stationId: 'HCM03_002',
        stationName: 'Công viên Văn Lang',
        routeCode: 'HCM03',
        routeName: 'Tuyến HCM03',
        employeeCount: 9,
        thuTu: 2
      },
      {
        stationId: 'HCM03_003',
        stationName: 'KCN Long Bình',
        routeCode: 'HCM03',
        routeName: 'Tuyến HCM03',
        employeeCount: 14,
        thuTu: 3
      },
      {
        stationId: 'HCM03_004',
        stationName: 'BV 7B',
        routeCode: 'HCM03',
        routeName: 'Tuyến HCM03',
        employeeCount: 7,
        thuTu: 4
      },

      // HCM04 - Tuyến Hồ Chí Minh 4
      {
        stationId: 'HCM04_001',
        stationName: 'Huỳnh Văn Lũy',
        routeCode: 'HCM04',
        routeName: 'Tuyến HCM04',
        employeeCount: 11,
        thuTu: 1
      },
      {
        stationId: 'HCM04_002',
        stationName: 'Metro An Phú',
        routeCode: 'HCM04',
        routeName: 'Tuyến HCM04',
        employeeCount: 13,
        thuTu: 2
      },
      {
        stationId: 'HCM04_003',
        stationName: 'KCN Hiệp Phước',
        routeCode: 'HCM04',
        routeName: 'Tuyến HCM04',
        employeeCount: 16,
        thuTu: 3
      },

      // T1 - Tuyến 1
      {
        stationId: 'T1_001',
        stationName: 'KCN Biên Hòa 2',
        routeCode: 'T1',
        routeName: 'Tuyến 1',
        employeeCount: 18,
        thuTu: 1
      },
      {
        stationId: 'T1_002',
        stationName: 'Ngã 3 Vũng Tàu',
        routeCode: 'T1',
        routeName: 'Tuyến 1',
        employeeCount: 12,
        thuTu: 2
      },
      {
        stationId: 'T1_003',
        stationName: 'Cầu Rạch Miễu',
        routeCode: 'T1',
        routeName: 'Tuyến 1',
        employeeCount: 10,
        thuTu: 3
      },

      // T2 - Tuyến 2
      {
        stationId: 'T2_001',
        stationName: 'Ngã 3 Vũng Tàu',
        routeCode: 'T2',
        routeName: 'Tuyến 2',
        employeeCount: 14,
        thuTu: 1
      },
      {
        stationId: 'T2_002',
        stationName: 'Ngã 4 Thủ Đức',
        routeCode: 'T2',
        routeName: 'Tuyến 2',
        employeeCount: 16,
        thuTu: 2
      },
      {
        stationId: 'T2_003',
        stationName: 'KCN Long Bình',
        routeCode: 'T2',
        routeName: 'Tuyến 2',
        employeeCount: 13,
        thuTu: 3
      },

      // T3 - Tuyến 3
      {
        stationId: 'T3_001',
        stationName: 'Tam Hiệp',
        routeCode: 'T3',
        routeName: 'Tuyến 3',
        employeeCount: 11,
        thuTu: 1
      },
      {
        stationId: 'T3_002',
        stationName: 'Công viên Văn Lang',
        routeCode: 'T3',
        routeName: 'Tuyến 3',
        employeeCount: 9,
        thuTu: 2
      },
      {
        stationId: 'T3_003',
        stationName: 'KCN Biên Hòa',
        routeCode: 'T3',
        routeName: 'Tuyến 3',
        employeeCount: 15,
        thuTu: 3
      },

      // T4 - Tuyến 4
      {
        stationId: 'T4_001',
        stationName: 'BV 7B',
        routeCode: 'T4',
        routeName: 'Tuyến 4',
        employeeCount: 8,
        thuTu: 1
      },
      {
        stationId: 'T4_002',
        stationName: 'KCN Long Bình',
        routeCode: 'T4',
        routeName: 'Tuyến 4',
        employeeCount: 12,
        thuTu: 2
      },
      {
        stationId: 'T4_003',
        stationName: 'Bệnh viện Chợ Rẫy',
        routeCode: 'T4',
        routeName: 'Tuyến 4',
        employeeCount: 6,
        thuTu: 3
      },

      // BH01 - Tuyến Biên Hòa 1
      {
        stationId: 'BH01_001',
        stationName: 'KCN Biên Hòa 1',
        routeCode: 'BH01',
        routeName: 'Tuyến BH01',
        employeeCount: 20,
        thuTu: 1
      },
      {
        stationId: 'BH01_002',
        stationName: 'Ngã 3 Vũng Tàu',
        routeCode: 'BH01',
        routeName: 'Tuyến BH01',
        employeeCount: 15,
        thuTu: 2
      },
      {
        stationId: 'BH01_003',
        stationName: 'Cầu Rạch Miễu',
        routeCode: 'BH01',
        routeName: 'Tuyến BH01',
        employeeCount: 12,
        thuTu: 3
      },

      // BH02 - Tuyến Biên Hòa 2
      {
        stationId: 'BH02_001',
        stationName: 'KCN Biên Hòa 2',
        routeCode: 'BH02',
        routeName: 'Tuyến BH02',
        employeeCount: 18,
        thuTu: 1
      },
      {
        stationId: 'BH02_002',
        stationName: 'Ngã 3 Vũng Tàu',
        routeCode: 'BH02',
        routeName: 'Tuyến BH02',
        employeeCount: 14,
        thuTu: 2
      },
      {
        stationId: 'BH02_003',
        stationName: 'Cầu Rạch Miễu',
        routeCode: 'BH02',
        routeName: 'Tuyến BH02',
        employeeCount: 11,
        thuTu: 3
      },

      // BH03 - Tuyến Biên Hòa 3
      {
        stationId: 'BH03_001',
        stationName: 'KCN Long Bình',
        routeCode: 'BH03',
        routeName: 'Tuyến BH03',
        employeeCount: 16,
        thuTu: 1
      },
      {
        stationId: 'BH03_002',
        stationName: 'Ngã 4 Thủ Đức',
        routeCode: 'BH03',
        routeName: 'Tuyến BH03',
        employeeCount: 13,
        thuTu: 2
      },
      {
        stationId: 'BH03_003',
        stationName: 'Tam Hiệp',
        routeCode: 'BH03',
        routeName: 'Tuyến BH03',
        employeeCount: 10,
        thuTu: 3
      }
    ];
  }
}
