import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AllocationResult } from './employee-allocation.service';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

@Injectable({
  providedIn: 'root'
})
export class PdfExportAllocationService {

  constructor() { }

  /**
   * Xuất PDF báo cáo phân bổ nhân viên
   */
  exportAllocationReport(allocationResult: AllocationResult): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header
    this.addHeader(doc, pageWidth);
    
    // Summary
    this.addSummary(doc, allocationResult, pageWidth);
    
    // Routes details
    this.addRoutesDetails(doc, allocationResult, pageWidth);
    
    // Footer
    this.addFooter(doc, pageWidth, pageHeight);
    
    // Save PDF
    const fileName = `BaoCaoPhanBoNhanVien_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  private addHeader(doc: jsPDF, pageWidth: number): void {
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('BÁO CÁO PHÂN BỔ NHÂN VIÊN', pageWidth / 2, 20, { align: 'center' });
    doc.text('THEO TUYẾN ĐƯỜNG VÀ TRẠM', pageWidth / 2, 30, { align: 'center' });
    
    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`, pageWidth - 20, 40, { align: 'right' });
    
    // Line
    doc.setLineWidth(0.5);
    doc.line(20, 45, pageWidth - 20, 45);
  }

  private addSummary(doc: jsPDF, allocationResult: AllocationResult, pageWidth: number): void {
    let yPosition = 55;
    
    // Summary title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TỔNG QUAN', 20, yPosition);
    yPosition += 10;
    
    // Summary data
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const summaryData = [
      ['Tổng số nhân viên:', allocationResult.tongSoNhanVien.toString()],
      ['Tổng số xe cần:', allocationResult.tongSoXe.toString()],
      ['Số tuyến đường:', Object.keys(this.groupByRoute(allocationResult.allocations)).length.toString()]
    ];
    
    doc.autoTable({
      startY: yPosition,
      head: [['Chỉ tiêu', 'Giá trị']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    });
  }

  private addRoutesDetails(doc: jsPDF, allocationResult: AllocationResult, pageWidth: number): void {
    const groupedByRoute = this.groupByRoute(allocationResult.allocations);
    let yPosition = (doc as any).lastAutoTable.finalY + 20;
    
    Object.keys(groupedByRoute).forEach((tuyenXe, index) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      const routeAllocations = groupedByRoute[tuyenXe];
      
      // Route title
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`TUYẾN ĐƯỜNG: ${tuyenXe}`, 20, yPosition);
      yPosition += 10;
      
      // Route summary
      const tongNhanVien = routeAllocations.reduce((sum, alloc) => sum + alloc.soLuong, 0);
      const tongXe = routeAllocations.reduce((sum, alloc) => sum + alloc.soXeCan, 0);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tổng nhân viên: ${tongNhanVien} | Tổng xe: ${tongXe}`, 20, yPosition);
      yPosition += 15;
      
      // Stations table
      const tableData = routeAllocations.map(alloc => [
        alloc.tramXe,
        alloc.soLuong.toString(),
        alloc.loaiXe,
        alloc.soXeCan.toString(),
        alloc.nhanVien.map((nv: any) => nv.HoTen || 'N/A').join(', ')
      ]);
      
      doc.autoTable({
        startY: yPosition,
        head: [['Trạm', 'Số NV', 'Loại xe', 'Số xe', 'Danh sách nhân viên']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [52, 152, 219] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 80 }
        },
        margin: { left: 20, right: 20 }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    });
  }

  private addFooter(doc: jsPDF, pageWidth: number, pageHeight: number): void {
    const footerY = pageHeight - 20;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Hệ thống Quản lý Đăng ký Xe - Thibidi', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Trang ${doc.getNumberOfPages()}`, pageWidth - 20, footerY, { align: 'right' });
  }

  private groupByRoute(allocations: any[]): { [key: string]: any[] } {
    const grouped: { [key: string]: any[] } = {};
    allocations.forEach(alloc => {
      if (!grouped[alloc.tuyenXe]) {
        grouped[alloc.tuyenXe] = [];
      }
      grouped[alloc.tuyenXe].push(alloc);
    });
    return grouped;
  }

  /**
   * Xuất PDF chi tiết cho một tuyến đường cụ thể
   */
  exportRouteDetail(allocationResult: AllocationResult, tuyenXe: string): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Filter allocations for specific route
    const routeAllocations = allocationResult.allocations.filter(alloc => alloc.tuyenXe === tuyenXe);
    
    if (routeAllocations.length === 0) {
      alert('Không tìm thấy dữ liệu cho tuyến đường này!');
      return;
    }
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`BÁO CÁO CHI TIẾT TUYẾN ĐƯỜNG: ${tuyenXe}`, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`, pageWidth - 20, 30, { align: 'right' });
    
    // Route summary
    const tongNhanVien = routeAllocations.reduce((sum, alloc) => sum + alloc.soLuong, 0);
    const tongXe = routeAllocations.reduce((sum, alloc) => sum + alloc.soXeCan, 0);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Tổng nhân viên: ${tongNhanVien} | Tổng xe: ${tongXe}`, 20, 45);
    
    // Detailed table
    const tableData = routeAllocations.map(alloc => [
      alloc.tramXe,
      alloc.soLuong.toString(),
      alloc.loaiXe,
      alloc.soXeCan.toString(),
      alloc.nhanVien.map((nv: any) => nv.HoTen || 'N/A').join(', ')
    ]);
    
    doc.autoTable({
      startY: 55,
      head: [['Trạm', 'Số NV', 'Loại xe', 'Số xe', 'Danh sách nhân viên']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219] },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 80 }
      },
      margin: { left: 20, right: 20 }
    });
    
    // Save PDF
    const fileName = `BaoCaoChiTiet_${tuyenXe}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }
}
