import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { NhanVien } from '../models/employee.model';
import { RouteDetail } from '../models/route-detail.model';
import { FirestoreService } from './firestore.service';
import { RouteDetailService } from './route-detail.service';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface EmployeeStationGroup {
  tuyenXe: string;
  tramXe: string;
  nhanVien: NhanVien[];
  soLuong: number;
  routeDetails?: RouteDetail[];
}

export interface StationGroup {
  tuyenXe: string;
  stations: EmployeeStationGroup[];
  tongNhanVien: number;
  routeDetails?: RouteDetail[];
}

@Injectable({
  providedIn: 'root'
})
export class PdfExportEmployeeStationService {

  constructor(
    private firestoreService: FirestoreService,
    private routeDetailService: RouteDetailService
  ) { }

  /**
   * Xuất PDF danh sách nhân viên theo trạm xe và tuyến xe
   */
  async exportEmployeeStationPDF(): Promise<void> {
    try {
      // Lấy dữ liệu nhân viên và tuyến đường
      const employees = await this.firestoreService.getAllNhanVien();
      const routeDetails = await this.routeDetailService.getRouteDetails().toPromise() || [];

      if (employees.length === 0) {
        alert('Không có dữ liệu nhân viên để xuất PDF');
        return;
      }

      // Gom nhóm theo tuyến xe và trạm xe
      const groupedData = this.groupEmployeesByRouteAndStation(employees, routeDetails);

      // Tạo PDF
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header
      this.addHeader(doc, pageWidth);

      // Tổng quan
      this.addSummary(doc, groupedData, pageWidth);

      // Chi tiết theo tuyến và trạm
      this.addDetailedContent(doc, groupedData, pageWidth, pageHeight);

      // Footer
      this.addFooter(doc, pageWidth, pageHeight);

      // Lưu file
      const fileName = `DanhSachNhanVienTheoTramXe_${this.getCurrentDateString()}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Lỗi khi xuất PDF:', error);
      alert('Có lỗi xảy ra khi xuất PDF. Vui lòng thử lại.');
    }
  }

  /**
   * Gom nhóm nhân viên theo tuyến xe và trạm xe
   */
  private groupEmployeesByRouteAndStation(employees: NhanVien[], routeDetails: RouteDetail[]): StationGroup[] {
    // Tạo map tuyến đường
    const routeMap = new Map<string, RouteDetail[]>();
    routeDetails.forEach(route => {
      if (!routeMap.has(route.maTuyenXe)) {
        routeMap.set(route.maTuyenXe, []);
      }
      routeMap.get(route.maTuyenXe)!.push(route);
    });

    // Sắp xếp route details theo thứ tự
    routeMap.forEach((routes, key) => {
      routes.sort((a, b) => a.thuTu - b.thuTu);
    });

    // Gom nhóm nhân viên
    const groupedByRoute = new Map<string, Map<string, { employees: NhanVien[], originalStationName: string }>>();

    employees.forEach(employee => {
      const originalTuyenXe = employee.MaTuyenXe || 'Chưa phân tuyến';
      const tramXe = employee.TramXe || 'Chưa phân trạm';
      
      // Áp dụng logic ưu tiên gom HCM routes vào HCM01
      const tuyenXe = this.applyHCMGroupingPriority(originalTuyenXe, tramXe);

      if (!groupedByRoute.has(tuyenXe)) {
        groupedByRoute.set(tuyenXe, new Map());
      }

      // Normalize tên trạm để không phân biệt chữ hoa thường khi so sánh
      const normalizedTramXe = this.normalizeStationName(tramXe);

      if (!groupedByRoute.get(tuyenXe)!.has(normalizedTramXe)) {
        groupedByRoute.get(tuyenXe)!.set(normalizedTramXe, { 
          employees: [], 
          originalStationName: tramXe 
        });
      } else {
        // Nếu đã có nhóm với tên normalize tương tự, giữ tên gốc đầu tiên
        const existingGroup = groupedByRoute.get(tuyenXe)!.get(normalizedTramXe)!;
        // Không thay đổi originalStationName, giữ nguyên tên đầu tiên
      }

      groupedByRoute.get(tuyenXe)!.get(normalizedTramXe)!.employees.push(employee);
    });

    // Chuyển đổi thành array và sắp xếp
    const result: StationGroup[] = [];

    groupedByRoute.forEach((stations, tuyenXe) => {
      const stationGroups: EmployeeStationGroup[] = [];

      // Kiểm tra xem có nhân viên đặc biệt trong nhóm này không
      let specialEmployeeName = '';
      stations.forEach((stationData) => {
        if (stationData.employees.some(nv => nv.HoTen && nv.HoTen.includes('Lê Ngọc Tạo'))) {
          specialEmployeeName = 'Lê Ngọc Tạo';
        } else if (stationData.employees.some(nv => nv.HoTen && nv.HoTen.includes('Lê Thành Châu'))) {
          specialEmployeeName = 'Lê Thành Châu';
        }
      });

      stations.forEach((stationData, normalizedTramXe) => {
        stationGroups.push({
          tuyenXe: this.getRouteNameFromCode(tuyenXe, specialEmployeeName || undefined), // Sử dụng tên tuyến thay vì mã tuyến
          tramXe: stationData.originalStationName, // Sử dụng tên trạm gốc
          nhanVien: stationData.employees.sort((a, b) => (a.HoTen || '').localeCompare(b.HoTen || '')),
          soLuong: stationData.employees.length,
          routeDetails: routeMap.get(tuyenXe)
        });
      });

      // Sắp xếp trạm theo thứ tự trong tuyến đường
      stationGroups.sort((a, b) => {
        const aOrder = this.getStationOrder(a.tramXe, routeMap.get(tuyenXe) || []);
        const bOrder = this.getStationOrder(b.tramXe, routeMap.get(tuyenXe) || []);
        return aOrder - bOrder;
      });
      
      result.push({
        tuyenXe: this.getRouteNameFromCode(tuyenXe, specialEmployeeName || undefined), // Sử dụng tên tuyến thay vì mã tuyến
        stations: stationGroups,
        tongNhanVien: stationGroups.reduce((sum, station) => sum + station.soLuong, 0),
        routeDetails: routeMap.get(tuyenXe)
      });
    });

    // Sắp xếp tuyến đường theo tên
    result.sort((a, b) => a.tuyenXe.localeCompare(b.tuyenXe));

    return result;
  }

  /**
   * Lấy thứ tự của trạm trong tuyến đường
   */
  private getStationOrder(tramXe: string, routeDetails: RouteDetail[]): number {
    const route = routeDetails.find(r => (r.tenDiemDon || '').toLowerCase().trim() === (tramXe || '').toLowerCase().trim());
    return route ? route.thuTu : 999;
  }

  /**
   * Chuyển đổi mã tuyến xe thành tên tuyến xe
   */
  private getRouteNameFromCode(maTuyenXe: string, hoTen?: string): string {
    if (!maTuyenXe || maTuyenXe === 'Chưa phân tuyến') {
      return 'Chưa phân tuyến';
    }

    // Xử lý đặc biệt cho Lê Ngọc Tạo - luôn gán vào HCM02
    if (hoTen && hoTen.includes('Lê Ngọc Tạo')) {
      return 'HCM02 - Tuyến Hồ Chí Minh 2';
    }

    // Xử lý đặc biệt cho Lê Thành Châu - luôn gán vào HCM01
    if (hoTen && hoTen.includes('Lê Thành Châu')) {
      return 'HCM01 - Tuyến Hồ Chí Minh 1';
    }

    // Mapping từ mã tuyến xe sang tên tuyến xe
    const routeMapping: { [key: string]: string } = {
      'HCM01': 'HCM01 - Tuyến Hồ Chí Minh 1',
      'HCM02': 'HCM02 - Tuyến Hồ Chí Minh 2', 
      'HCM03': 'HCM03 - Tuyến Hồ Chí Minh 3',
      'HCM04': 'HCM04 - Tuyến Hồ Chí Minh 4',
      'HCM1': 'HCM01 - Tuyến Hồ Chí Minh 1',
      'HCM2': 'HCM02 - Tuyến Hồ Chí Minh 2',
      'HCM3': 'HCM03 - Tuyến Hồ Chí Minh 3',
      'HCM4': 'HCM04 - Tuyến Hồ Chí Minh 4',
      'T1': 'Tuyến 1 - KCN Biên Hòa 2',
      'T2': 'Tuyến 2 - Ngã 3 Vũng Tàu',
      'T3': 'Tuyến 3 - Vòng xoay Tam Hiệp',
      'T4': 'Tuyến 4 - KCN Long Bình'
    };

    return routeMapping[maTuyenXe] || maTuyenXe;
  }

  /**
   * Thêm header cho PDF
   */
  private addHeader(doc: jsPDF, pageWidth: number): void {
    // Logo/Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DANH SÁCH NHÂN VIÊN THEO TRẠM XE', pageWidth / 2, 20, { align: 'center' });

    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Phân bổ nhân viên theo tuyến đường và điểm đón', pageWidth / 2, 30, { align: 'center' });

    // Date
    doc.setFontSize(10);
    doc.text(`Ngày xuất: ${this.getCurrentDateString()}`, pageWidth - 20, 20, { align: 'right' });

    // Line separator
    doc.setLineWidth(0.5);
    doc.line(20, 35, pageWidth - 20, 35);
  }

  /**
   * Thêm tổng quan
   */
  private addSummary(doc: jsPDF, data: StationGroup[], pageWidth: number): void {
    let yPosition = 45;

    // Summary title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TỔNG QUAN', 20, yPosition);
    yPosition += 10;

    // Summary data
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const tongTuyen = data.length;
    const tongTram = data.reduce((sum, route) => sum + route.stations.length, 0);
    const tongNhanVien = data.reduce((sum, route) => sum + route.tongNhanVien, 0);

    doc.text(`• Tổng số tuyến đường: ${tongTuyen}`, 25, yPosition);
    yPosition += 6;
    doc.text(`• Tổng số trạm/điểm đón: ${tongTram}`, 25, yPosition);
    yPosition += 6;
    doc.text(`• Tổng số nhân viên: ${tongNhanVien}`, 25, yPosition);
    yPosition += 15;

    // Line separator
    doc.setLineWidth(0.3);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;
  }

  /**
   * Thêm nội dung chi tiết
   */
  private addDetailedContent(doc: jsPDF, data: StationGroup[], pageWidth: number, pageHeight: number): void {
    let yPosition = 90;

    data.forEach((routeGroup, routeIndex) => {
      // Kiểm tra nếu cần trang mới
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = 20;
      }

      // Tên tuyến đường
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`TUYẾN ĐƯỜNG: ${routeGroup.tuyenXe}`, 20, yPosition);
      yPosition += 8;

      // Thông tin tuyến đường
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Số trạm: ${routeGroup.stations.length} | Tổng nhân viên: ${routeGroup.tongNhanVien}`, 25, yPosition);
      yPosition += 6;

      // Chi tiết các trạm
      routeGroup.stations.forEach((station, stationIndex) => {
        // Kiểm tra nếu cần trang mới
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        // Tên trạm
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`  Trạm: ${station.tramXe} (${station.soLuong} nhân viên)`, 30, yPosition);
        yPosition += 6;

        // Bảng nhân viên
        if (station.nhanVien.length > 0) {
          const tableData = station.nhanVien.map((nv, index) => [
            index + 1,
            nv.MaNhanVien || '-',
            nv.HoTen || '-',
            nv.DienThoai || '-'
          ]);

          doc.autoTable({
            startY: yPosition,
            head: [['STT', 'Mã NV', 'Họ Tên', 'Số ĐT']],
            body: tableData,
            theme: 'grid',
            headStyles: { 
              fillColor: [66, 139, 202],
              textColor: 255,
              fontSize: 8
            },
            bodyStyles: { fontSize: 7 },
            columnStyles: {
              0: { cellWidth: 15 },
              1: { cellWidth: 25 },
              2: { cellWidth: 60 },
              3: { cellWidth: 35 }
            },
            margin: { left: 35, right: 20 }
          });

          yPosition = (doc as any).lastAutoTable.finalY + 5;
        }

        yPosition += 5;
      });

      // Khoảng cách giữa các tuyến
      yPosition += 10;
    });
  }

  /**
   * Thêm footer
   */
  private addFooter(doc: jsPDF, pageWidth: number, pageHeight: number): void {
    const pageCount = doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setLineWidth(0.3);
      doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
      
      // Page number
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Trang ${i}/${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      // Generated info
      doc.text(`Tạo bởi: Thibidi System`, 20, pageHeight - 10);
    }
  }

  /**
   * Lấy chuỗi ngày hiện tại
   */
  private getCurrentDateString(): string {
    const now = new Date();
    return now.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Áp dụng logic ưu tiên gom HCM và BH routes
   * Tất cả nhân viên HCM01, HCM02, HCM03 đều được gom vào HCM01 trước
   * Tất cả nhân viên BH01, BH02, BH03 đều được gom vào BH01 trước
   * Các trạm sau "Hàng xanh" sẽ được gom theo cách hiện tại
   */
  private applyHCMGroupingPriority(routeName: string, tramXe: string): string {
    // Kiểm tra nếu là tuyến HCM
    if (routeName === 'HCM01' || routeName === 'HCM02' || routeName === 'HCM03') {
      // Kiểm tra nếu trạm xe chứa "Hàng xanh" hoặc các trạm trước "Hàng xanh"
      if (this.isStationBeforeOrAtHangXanh(tramXe)) {
        // Gom tất cả vào HCM01
        return 'HCM01';
      } else {
        // Các trạm sau "Hàng xanh" giữ nguyên tuyến gốc
        return routeName;
      }
    }
    
    // Kiểm tra nếu là tuyến BH
    if (routeName === 'BH01' || routeName === 'BH02' || routeName === 'BH03') {
      // Kiểm tra nếu trạm xe chứa "Hàng xanh" hoặc các trạm trước "Hàng xanh"
      if (this.isStationBeforeOrAtHangXanh(tramXe)) {
        // Gom tất cả vào BH01
        return 'BH01';
      } else {
        // Các trạm sau "Hàng xanh" giữ nguyên tuyến gốc
        return routeName;
      }
    }
    
    // Các tuyến khác không thay đổi
    return routeName;
  }

  /**
   * Kiểm tra xem trạm xe có phải là trạm trước hoặc tại "Hàng xanh" không
   */
  private isStationBeforeOrAtHangXanh(tramXe: string): boolean {
    if (!tramXe) return false;
    
    const station = tramXe.toLowerCase();
    
    // Danh sách các trạm từ KCN Long Đức đến Hàng xanh (theo thứ tự)
    const stationsBeforeHangXanh = [
      'kcn long đức',
      'ngã 3 bến gỗ', 
      'ngã 3 long bình tân',
      'ngã 4 thủ đức',
      'rmk',
      'ngã 3 cát lái',
      'hàng xanh'
    ];
    
    // Kiểm tra xem trạm có trong danh sách các trạm trước hoặc tại "Hàng xanh" không
    return stationsBeforeHangXanh.some(stationName => 
      station.includes(stationName) || stationName.includes(station)
    );
  }

  /**
   * Normalize tên trạm để không phân biệt chữ hoa thường
   * @param stationName - Tên trạm gốc
   * @returns Tên trạm đã được normalize
   */
  private normalizeStationName(stationName: string): string {
    if (!stationName) return stationName;
    
    // Chuyển về chữ thường và loại bỏ khoảng trắng thừa
    return stationName.toLowerCase().trim();
  }
}
