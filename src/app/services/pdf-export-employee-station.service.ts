import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { NhanVien } from '../models/employee.model';
import { RouteDetail } from '../models/route-detail.model';
import { FirestoreService } from './firestore.service';
import { RouteDetailService } from './route-detail.service';
import { StationRouteMappingService } from './station-route-mapping.service';

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
    private routeDetailService: RouteDetailService,
    private stationRouteMappingService: StationRouteMappingService
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
      const groupedData = await this.groupEmployeesByRouteAndStation(employees, routeDetails);

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
   * Gom nhóm nhân viên theo tuyến xe và trạm xe với logic overflow HCM
   */
  private async groupEmployeesByRouteAndStation(employees: NhanVien[], routeDetails: RouteDetail[]): Promise<StationGroup[]> {
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

    // Áp dụng logic overflow HCM trước khi gom nhóm
    const processedEmployees = await this.applyHCMOverflowLogic(employees, routeDetails);

    // Gom nhóm nhân viên
    const groupedByRoute = new Map<string, Map<string, { employees: NhanVien[], originalStationName: string }>>();

    for (const employee of processedEmployees) {
      const originalTuyenXe = employee.MaTuyenXe || 'Chưa phân tuyến';
      const tramXe = employee.TramXe || 'Chưa phân trạm';
      
      // Áp dụng logic ưu tiên gom HCM routes
      const tuyenXe = await this.applyHCMGroupingPriority(originalTuyenXe, tramXe);

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
    }

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
    let order = route ? route.thuTu : 999;
    
    // Special handling for HCM02: ensure Bà Chiểu comes after Ngã 4 Thủ Đức and RMK
    if (routeDetails.length > 0 && routeDetails[0].maTuyenXe === 'HCM02') {
      if (this.isBaChieuStation(tramXe)) {
        // Bà Chiểu should come after Ngã 4 Thủ Đức and RMK
        // Find the highest order among stations that should come before Bà Chiểu
        const nga4ThuDucDetail = routeDetails.find(r => 
          (r.tenDiemDon || '').toLowerCase().trim().includes('ngã 4 thủ đức') ||
          (r.tenDiemDon || '').toLowerCase().trim().includes('nga 4 thu duc')
        );
        const rmkDetail = routeDetails.find(r => 
          (r.tenDiemDon || '').toLowerCase().trim().includes('rmk')
        );
        
        const nga4ThuDucOrder = nga4ThuDucDetail ? nga4ThuDucDetail.thuTu : 3;
        const rmkOrder = rmkDetail ? rmkDetail.thuTu : 4;
        const maxOrderBeforeBaChieu = Math.max(nga4ThuDucOrder, rmkOrder);
        
        order = maxOrderBeforeBaChieu + 1; // Set to be after both stations
      }
    }
    
    return order;
  }

  /**
   * Kiểm tra xem trạm có phải là Bà Chiểu không
   */
  private isBaChieuStation(station: string): boolean {
    if (!station) return false;
    
    const stationLower = station.toLowerCase();
    
    const baChieuVariations = [
      'bà chiểu',
      'ba chieu',
      'bà chiểu',
      'ba chieu'
    ];
    
    return baChieuVariations.some(variation => 
      stationLower.includes(variation) || variation.includes(stationLower)
    );
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
      'HCM04': 'HCM04 - Tuyến Hồ Chí Minh 4',
      'HCM1': 'HCM01 - Tuyến Hồ Chí Minh 1',
      'HCM2': 'HCM02 - Tuyến Hồ Chí Minh 2',
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
   * - < 30 nhân viên HCM: chia đều cho HCM01, HCM02
   * - >= 30 nhân viên HCM: ưu tiên nhân viên không trùng trạm BH
   * - Đảm bảo đủ 2 xe 16 chỗ (15 nhân viên) cho HCM01, HCM02
   * - Phần dư còn lại sắp qua tuyến Biên Hòa
   */
  private async applyHCMGroupingPriority(routeName: string, tramXe: string): Promise<string> {
    // Kiểm tra nếu là trường hợp "tự túc"
    if (this.isSelfTransportStation(tramXe)) {
      return 'TỰ TÚC';
    }
    
    // Đặc biệt: "Ngã 3 Hãng dầu" luôn thuộc BH04, không phân biệt tuyến gốc
    if (this.isNga3HangDauStation(tramXe)) {
      return 'BH04';
    }
    
    // CHỈ DỰA VÀO FIREBASE DATA - KHÔNG HARDCODE
    // Load Firebase mapping data first
    await this.stationRouteMappingService.loadStationRouteMapping();
    
    // Lấy danh sách trạm chính thức từ Firebase
    const officialHCM01Stations = this.stationRouteMappingService.getOfficialStationsForRoute('HCM01');
    const officialHCM02Stations = this.stationRouteMappingService.getOfficialStationsForRoute('HCM02');
    
    // Kiểm tra Firebase mapping
    const actualRoute = this.stationRouteMappingService.getRouteForStation(tramXe);
    
    if (actualRoute === 'HCM01' && officialHCM01Stations.includes(tramXe)) {
      return 'HCM01';
    } else if (actualRoute === 'HCM02' && officialHCM02Stations.includes(tramXe)) {
      return 'HCM02';
    }
    
    // Kiểm tra nếu là tuyến HCM
    if (routeName === 'HCM01' || routeName === 'HCM02') {
      // Giữ nguyên tuyến gốc để áp dụng logic overflow sau
      return routeName;
    }
    
    // Kiểm tra nếu là tuyến BH
    if (routeName === 'BH01' || routeName === 'BH02' || routeName === 'BH03' || routeName === 'BH04') {
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
    // Loại bỏ các trạm không nên gom vào BH01 như Ngã 4 Thủ Đức, Bà Chiểu, Chợ Gò Vấp
    const stationsBeforeHangXanh = [
      'kcn long đức',
      'ngã 3 bến gỗ', 
      'ngã 3 long bình tân',
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
   * Áp dụng logic overflow cho HCM dựa trên số lượng nhân viên:
   * - Số lượng < 30: Chia đều cho HCM01 và HCM02
   * - Số lượng ≥ 30: Lấy ra nhân viên có trạm ghép vào các trạm Biên Hòa từ DB
   * - Nguyên tắc: Dựa vào trạm nhân viên đăng ký → tìm tuyến xe có trạm giống
   */
  private async applyHCMOverflowLogic(employees: NhanVien[], routeDetails: RouteDetail[]): Promise<NhanVien[]> {
    // Lọc nhân viên HCM
    const hcmEmployees = employees.filter(emp => 
      emp.MaTuyenXe === 'HCM01' || emp.MaTuyenXe === 'HCM02'
    );
    
    const totalHCMEmployees = hcmEmployees.length;
    console.log('Total HCM employees:', totalHCMEmployees);
    
    // Load Firebase mapping data first
    await this.stationRouteMappingService.loadStationRouteMapping();
    
    // Nếu số lượng < 30: Chia đều cho HCM01 và HCM02
    if (totalHCMEmployees < 30) {
      console.log('HCM employees < 30, distributing evenly between HCM01 and HCM02');
      return await this.distributeHCMEvenly(employees, hcmEmployees);
    }
    
    // Nếu số lượng ≥ 30: Ghép trạm HCM vào trạm Biên Hòa từ DB
    console.log('HCM employees >= 30, applying station matching logic with BH routes from DB...');
    return await this.applyHCMStationMatchingLogic(employees, hcmEmployees, routeDetails);
  }

  /**
   * Áp dụng logic ghép trạm HCM vào trạm Biên Hòa từ DB
   */
  private async applyHCMStationMatchingLogic(
    allEmployees: NhanVien[], 
    hcmEmployees: NhanVien[], 
    routeDetails: RouteDetail[]
  ): Promise<NhanVien[]> {
    console.log('Applying HCM station matching logic with BH routes from DB...');
    
    // Lấy danh sách trạm BH từ DB
    const bhStations = this.getBHStationNames(routeDetails);
    console.log('BH stations from DB:', bhStations);
    
    // Phân loại nhân viên HCM: có trạm trùng với BH vs không trùng
    const employeesMatchingBH: NhanVien[] = [];
    const employeesNotMatchingBH: NhanVien[] = [];
    
    hcmEmployees.forEach(employee => {
      const stationName = this.normalizeStationName(employee.TramXe || '');
      
      // Kiểm tra xem trạm có khớp với trạm BH không
      const matchingBHStation = bhStations.find(bhStation => 
        this.normalizeStationName(bhStation) === stationName ||
        stationName.includes(this.normalizeStationName(bhStation)) ||
        this.normalizeStationName(bhStation).includes(stationName)
      );
      
      if (matchingBHStation) {
        console.log(`Employee ${employee.HoTen} at station ${employee.TramXe} matches BH station ${matchingBHStation}`);
        employeesMatchingBH.push(employee);
      } else {
        employeesNotMatchingBH.push(employee);
      }
    });
    
    console.log(`Employees matching BH: ${employeesMatchingBH.length}, Not matching BH: ${employeesNotMatchingBH.length}`);
    
    // Phân chia nhân viên cho HCM01 và HCM02 trước (ưu tiên HCM)
    const targetEmployeesPerHCMRoute = 15;
    const totalHCMNeeded = targetEmployeesPerHCMRoute * 2; // Cần 30 nhân viên cho HCM01 + HCM02
    
    // Lấy đủ nhân viên cho HCM01 và HCM02 từ tất cả nhân viên HCM
    const allHCMEmployees = [...employeesNotMatchingBH, ...employeesMatchingBH];
    
    // Sử dụng logic phân chia đều mới: gom tất cả nhân viên và gán tuần tự
    const hcm01Employees: NhanVien[] = [];
    const hcm02Employees: NhanVien[] = [];
    
    const maxEmployeesPerRoute = 15;
    let currentRoute = 'HCM01'; // Bắt đầu với HCM01
    
    // Vòng lặp tuần tự gán nhân viên
    for (let i = 0; i < allHCMEmployees.length; i++) {
      const employee = allHCMEmployees[i];
      
      if (currentRoute === 'HCM01') {
        if (hcm01Employees.length < maxEmployeesPerRoute) {
          hcm01Employees.push(employee);
          console.log(`Station Matching - Assigned ${employee.HoTen} to HCM01 (${hcm01Employees.length}/${maxEmployeesPerRoute})`);
        } else {
          // HCM01 đã đủ, chuyển sang HCM02
          currentRoute = 'HCM02';
          hcm02Employees.push(employee);
          console.log(`Station Matching - HCM01 full, assigned ${employee.HoTen} to HCM02 (${hcm02Employees.length}/${maxEmployeesPerRoute})`);
        }
      } else if (currentRoute === 'HCM02') {
        if (hcm02Employees.length < maxEmployeesPerRoute) {
          hcm02Employees.push(employee);
          console.log(`Station Matching - Assigned ${employee.HoTen} to HCM02 (${hcm02Employees.length}/${maxEmployeesPerRoute})`);
        } else {
          // Cả hai tuyến đều đủ, nhân viên còn lại sẽ được xử lý bởi overflow logic
          console.log(`Station Matching - Both HCM routes full, employee ${employee.HoTen} will be handled by overflow logic`);
          break;
        }
      }
    }
    
    // Nhân viên HCM còn dư sau khi sắp cho HCM01 và HCM02
    const hcmOverflowEmployees = allHCMEmployees.slice(hcm01Employees.length + hcm02Employees.length);
    
    // Chuyển nhân viên dư thừa sang tuyến Biên Hòa dựa trên tên trạm từ DB
    hcmOverflowEmployees.forEach(employee => {
      const bhRoute = this.findBHRouteForStation(employee.TramXe || '', routeDetails);
      if (bhRoute) {
        employee.MaTuyenXe = bhRoute;
        console.log(`Moving overflow employee ${employee.HoTen} from station ${employee.TramXe} to ${bhRoute}`);
      }
    });
    
    console.log(`Final HCM distribution: HCM01=${hcm01Employees.length}, HCM02=${hcm02Employees.length}`);
    console.log(`Overflow to BH: ${hcmOverflowEmployees.length} employees`);
    
    // Cập nhật MaTuyenXe cho các nhân viên
    hcm01Employees.forEach(emp => emp.MaTuyenXe = 'HCM01');
    hcm02Employees.forEach(emp => emp.MaTuyenXe = 'HCM02');
    
    // Kết hợp với nhân viên không phải HCM và nhân viên đã chuyển sang BH
    const nonHCMEmployees = allEmployees.filter(emp =>
      emp.MaTuyenXe !== 'HCM01' && emp.MaTuyenXe !== 'HCM02'
    );
    
    return [...nonHCMEmployees, ...hcm01Employees, ...hcm02Employees, ...employeesMatchingBH, ...hcmOverflowEmployees];
  }

  /**
   * Tìm tuyến BH phù hợp cho trạm từ DB
   */
  private findBHRouteForStation(stationName: string, routeDetails: RouteDetail[]): string | null {
    const normalizedStation = this.normalizeStationName(stationName);
    
    // Tìm trạm BH phù hợp nhất từ DB
    for (const detail of routeDetails) {
      if (detail.maTuyenXe.startsWith('BH')) {
        const normalizedBHStation = this.normalizeStationName(detail.tenDiemDon);
        
        // Kiểm tra khớp chính xác hoặc chứa nhau
        if (normalizedStation === normalizedBHStation ||
            normalizedStation.includes(normalizedBHStation) ||
            normalizedBHStation.includes(normalizedStation)) {
          
          console.log(`Found matching BH route "${detail.maTuyenXe}" for station "${stationName}" based on DB station "${detail.tenDiemDon}"`);
          return detail.maTuyenXe;
        }
      }
    }
    
    // Nếu không tìm thấy trạm phù hợp, mặc định chuyển sang BH01
    console.log(`No matching BH station found for "${stationName}" in DB, defaulting to BH01`);
    return 'BH01';
  }

  /**
   * Kiểm tra xem trạm có phải là trạm ưu tiên cho HCM02 không
   */
  private isHCM02PriorityStation(station: string): boolean {
    if (!station) return false;
    
    const stationLower = station.toLowerCase();
    
    const hcm02PriorityStations = [
      'ngã 3 long bình tân', 'nga 3 long binh tan',
      'bà chiểu', 'ba chieu',
      'chợ gò vấp', 'cho go vap',
      'hóc môn', 'hoc mon',
      'chùa hoằng pháp', 'chua hoang phap'
    ];
    
    return hcm02PriorityStations.some(priorityStation =>
      stationLower.includes(priorityStation) || priorityStation.includes(stationLower)
    );
  }

  /**
   * Áp dụng logic overflow cụ thể cho HCM02 khi vượt quá 15 nhân viên
   */
  private async applyHCM02SpecificOverflowLogic(allEmployees: NhanVien[], hcmEmployees: NhanVien[], routeDetails: RouteDetail[]): Promise<NhanVien[]> {
    console.log('Applying HCM02 specific overflow logic...');
    
    console.log(`Total HCM employees: ${hcmEmployees.length}`);
    
    // Phân loại nhân viên theo trạm ưu tiên HCM02
    const hcm02PriorityEmployees: NhanVien[] = [];
    const otherHCMEmployees: NhanVien[] = [];
    
    // CHỈ DỰA VÀO FIREBASE DATA - KHÔNG HARDCODE
    // Load Firebase mapping data first
    await this.stationRouteMappingService.loadStationRouteMapping();
    
    // Lấy danh sách trạm chính thức từ Firebase
    const officialHCM01Stations = this.stationRouteMappingService.getOfficialStationsForRoute('HCM01');
    const officialHCM02Stations = this.stationRouteMappingService.getOfficialStationsForRoute('HCM02');
    
    hcmEmployees.forEach(employee => {
      const actualRoute = this.stationRouteMappingService.getRouteForStation(employee.TramXe || '');
      
      if (actualRoute === 'HCM01' && officialHCM01Stations.includes(employee.TramXe || '')) {
        hcm02PriorityEmployees.push(employee); // Sẽ được phân bổ vào HCM01
      } else if (actualRoute === 'HCM02' && officialHCM02Stations.includes(employee.TramXe || '')) {
        hcm02PriorityEmployees.push(employee); // Sẽ được phân bổ vào HCM02
      } else {
        otherHCMEmployees.push(employee);
      }
    });
    
    console.log(`HCM02 priority employees: ${hcm02PriorityEmployees.length}`);
    console.log(`Other HCM employees: ${otherHCMEmployees.length}`);
    
    // Phân bổ cho HCM02 (tối đa 15 nhân viên)
    const targetEmployeesPerHCMRoute = 15;
    let hcm02FinalEmployees = hcm02PriorityEmployees.slice(0, targetEmployeesPerHCMRoute);
    
    // Nếu HCM02 chưa đủ, lấy thêm từ nhân viên khác
    const remainingHCM02Slots = targetEmployeesPerHCMRoute - hcm02FinalEmployees.length;
    if (remainingHCM02Slots > 0) {
      const additionalForHCM02 = otherHCMEmployees.slice(0, remainingHCM02Slots);
      hcm02FinalEmployees.push(...additionalForHCM02);
    }
    
    // Phân bổ cho HCM01 (tối đa 15 nhân viên)
    const remainingForHCM01 = otherHCMEmployees.slice(remainingHCM02Slots);
    let hcm01Employees = remainingForHCM01.slice(0, targetEmployeesPerHCMRoute);
    
    // Nếu HCM01 chưa đủ, lấy thêm từ nhân viên HCM02 dư thừa
    const remainingHCM01Slots = targetEmployeesPerHCMRoute - hcm01Employees.length;
    if (remainingHCM01Slots > 0) {
      const hcm02Overflow = hcm02PriorityEmployees.slice(targetEmployeesPerHCMRoute);
      const additionalForHCM01 = hcm02Overflow.slice(0, remainingHCM01Slots);
      hcm01Employees.push(...additionalForHCM01);
    }
    
    // Nhân viên HCM02 dư thừa còn lại chuyển sang BH
    const hcm02RemainingOverflow = hcm02PriorityEmployees.slice(targetEmployeesPerHCMRoute + remainingHCM01Slots);
    
    // Đặc biệt: Ưu tiên chuyển Ngã 3 Bến Gỗ và Ngã 3 Long Bình Tân sang BH03/BH04
    const stationsToMoveToBH = ['ngã 3 bến gỗ', 'nga 3 ben go', 'ngã 3 long bình tân', 'nga 3 long binh tan'];
    const employeesToMoveToBH: NhanVien[] = [];
    
    hcm02RemainingOverflow.forEach(employee => {
      const stationLower = (employee.TramXe || '').toLowerCase();
      const shouldMoveToBH = stationsToMoveToBH.some(station =>
        stationLower.includes(station) || station.includes(stationLower)
      );
      
      if (shouldMoveToBH) {
        console.log(`Moving employee ${employee.HoTen} from station ${employee.TramXe} to BH route due to HCM02 overflow`);
        employeesToMoveToBH.push(employee);
      }
    });
    
    // Thêm các nhân viên khác không phải từ trạm đặc biệt
    const otherOverflowEmployees = hcm02RemainingOverflow.filter(employee => {
      const stationLower = (employee.TramXe || '').toLowerCase();
      return !stationsToMoveToBH.some(station =>
        stationLower.includes(station) || station.includes(stationLower)
      );
    });
    employeesToMoveToBH.push(...otherOverflowEmployees);
    
    // Đảm bảo không vượt quá 15 nhân viên mỗi tuyến
    if (hcm01Employees.length > targetEmployeesPerHCMRoute) {
      const hcm01Overflow = hcm01Employees.slice(targetEmployeesPerHCMRoute);
      hcm01Employees = hcm01Employees.slice(0, targetEmployeesPerHCMRoute);
      employeesToMoveToBH.push(...hcm01Overflow);
    }
    
    if (hcm02FinalEmployees.length > targetEmployeesPerHCMRoute) {
      const hcm02Overflow = hcm02FinalEmployees.slice(targetEmployeesPerHCMRoute);
      hcm02FinalEmployees = hcm02FinalEmployees.slice(0, targetEmployeesPerHCMRoute);
      employeesToMoveToBH.push(...hcm02Overflow);
    }
    
    console.log(`Final HCM distribution: HCM01=${hcm01Employees.length}, HCM02=${hcm02FinalEmployees.length}`);
    console.log(`Total employees moved to BH: ${employeesToMoveToBH.length}`);
    
    // Cập nhật MaTuyenXe cho các nhân viên
    hcm01Employees.forEach(emp => emp.MaTuyenXe = 'HCM01');
    hcm02FinalEmployees.forEach(emp => emp.MaTuyenXe = 'HCM02');
    
    // Chuyển nhân viên dư thừa vào BH routes
    employeesToMoveToBH.forEach(employee => {
      const targetBHRoute = this.findBestBHRouteForEmployee(employee, routeDetails);
      if (targetBHRoute) {
        employee.MaTuyenXe = targetBHRoute;
      }
    });
    
    // Kết hợp lại với nhân viên không phải HCM
    const nonHCMEmployees = allEmployees.filter(emp => 
      emp.MaTuyenXe !== 'HCM01' && emp.MaTuyenXe !== 'HCM02'
    );
    
    const result = [
      ...nonHCMEmployees,
      ...hcm01Employees,
      ...hcm02FinalEmployees,
      ...employeesToMoveToBH
    ];
    
    console.log('Final HCM distribution:');
    console.log(`HCM01: ${hcm01Employees.length} employees`);
    console.log(`HCM02: ${hcm02FinalEmployees.length} employees`);
    console.log(`BH routes: ${employeesToMoveToBH.length} employees`);
    
    return result;
  }

  /**
   * Chia đều nhân viên HCM cho HCM01 và HCM02 khi tổng < 30
   * Sử dụng logic phân chia đều mới: gom tất cả nhân viên và gán tuần tự
   */
  private async distributeHCMEvenly(allEmployees: NhanVien[], hcmEmployees: NhanVien[]): Promise<NhanVien[]> {
    console.log('Employee Station PDF Export - Applying new even distribution logic for HCM routes...');
    
    // Gom tất cả nhân viên HCM01 và HCM02 thành một danh sách chung
    const allHCMEmployees = [...hcmEmployees];
    
    console.log(`Employee Station PDF Export - Total HCM employees to distribute: ${allHCMEmployees.length}`);
    
    // Khởi tạo danh sách nhân viên cho từng tuyến
    const hcm01Employees: NhanVien[] = [];
    const hcm02Employees: NhanVien[] = [];
    
    const maxEmployeesPerRoute = 15;
    let currentRoute = 'HCM01'; // Bắt đầu với HCM01
    
    // Vòng lặp tuần tự gán nhân viên
    for (let i = 0; i < allHCMEmployees.length; i++) {
      const employee = allHCMEmployees[i];
      
      if (currentRoute === 'HCM01') {
        if (hcm01Employees.length < maxEmployeesPerRoute) {
          hcm01Employees.push(employee);
          console.log(`Employee Station PDF Export - Assigned ${employee.HoTen} to HCM01 (${hcm01Employees.length}/${maxEmployeesPerRoute})`);
        } else {
          // HCM01 đã đủ, chuyển sang HCM02
          currentRoute = 'HCM02';
          hcm02Employees.push(employee);
          console.log(`Employee Station PDF Export - HCM01 full, assigned ${employee.HoTen} to HCM02 (${hcm02Employees.length}/${maxEmployeesPerRoute})`);
        }
      } else if (currentRoute === 'HCM02') {
        if (hcm02Employees.length < maxEmployeesPerRoute) {
          hcm02Employees.push(employee);
          console.log(`Employee Station PDF Export - Assigned ${employee.HoTen} to HCM02 (${hcm02Employees.length}/${maxEmployeesPerRoute})`);
        } else {
          // Cả hai tuyến đều đủ, nhân viên còn lại sẽ được xử lý bởi overflow logic
          console.log(`Employee Station PDF Export - Both HCM routes full, employee ${employee.HoTen} will be handled by overflow logic`);
          break;
        }
      }
    }
    
    console.log(`Employee Station PDF Export - Even distribution result: HCM01=${hcm01Employees.length}, HCM02=${hcm02Employees.length}`);
    
    // Cập nhật MaTuyenXe cho nhân viên
    hcm01Employees.forEach(emp => emp.MaTuyenXe = 'HCM01');
    hcm02Employees.forEach(emp => emp.MaTuyenXe = 'HCM02');
    
    // Kết hợp với nhân viên không phải HCM
    const nonHCMEmployees = allEmployees.filter(emp => 
      emp.MaTuyenXe !== 'HCM01' && emp.MaTuyenXe !== 'HCM02'
    );
    
    const result = [
      ...nonHCMEmployees,
      ...hcm01Employees,
      ...hcm02Employees
    ];
    
    return result;
  }

  /**
   * Lấy danh sách tên trạm của các tuyến BH
   */
  private getBHStationNames(routeDetails: RouteDetail[]): string[] {
    return routeDetails
      ?.filter(detail => detail.maTuyenXe.startsWith('BH'))
      ?.map(detail => detail.tenDiemDon) || [];
  }

  /**
   * Tìm tuyến BH phù hợp nhất cho nhân viên
   * Ưu tiên BH03/BH04 cho Ngã 3 Bến Gỗ và Ngã 3 Long Bình Tân
   */
  private findBestBHRouteForEmployee(employee: NhanVien, routeDetails: RouteDetail[]): string | null {
    const stationName = this.normalizeStationName(employee.TramXe || '');
    const stationLower = (employee.TramXe || '').toLowerCase();
    
    // Ưu tiên BH03/BH04 cho các trạm cụ thể từ HCM02 overflow
    const stationsForBH03BH04 = ['ngã 3 bến gỗ', 'nga 3 ben go', 'ngã 3 long bình tân', 'nga 3 long binh tan'];
    const shouldUseBH03BH04 = stationsForBH03BH04.some(station => 
      stationLower.includes(station) || station.includes(stationLower)
    );
    
    if (shouldUseBH03BH04) {
      // Phân biệt cụ thể: Ngã 3 Bến Gỗ → BH03, Ngã 3 Long Bình Tân → BH04
      if (stationLower.includes('ngã 3 bến gỗ') || stationLower.includes('nga 3 ben go')) {
        const routeExists = routeDetails.some(detail => detail.maTuyenXe === 'BH03');
        if (routeExists) {
          console.log(`Assigning employee ${employee.HoTen} from station ${employee.TramXe} to BH03`);
          return 'BH03';
        }
      }
      
      if (stationLower.includes('ngã 3 long bình tân') || stationLower.includes('nga 3 long binh tan')) {
        const routeExists = routeDetails.some(detail => detail.maTuyenXe === 'BH04');
        if (routeExists) {
          console.log(`Assigning employee ${employee.HoTen} from station ${employee.TramXe} to BH04`);
          return 'BH04';
        }
      }
      
      // Fallback: Ưu tiên BH03 trước, sau đó BH04
      const preferredBHRoutes = ['BH03', 'BH04'];
      for (const bhRoute of preferredBHRoutes) {
        const routeExists = routeDetails.some(detail => detail.maTuyenXe === bhRoute);
        if (routeExists) {
          console.log(`Assigning employee ${employee.HoTen} from station ${employee.TramXe} to ${bhRoute} (fallback)`);
          return bhRoute;
        }
      }
    }
    
    // Ưu tiên BH01, BH02, BH03, BH04 theo thứ tự cho các trạm khác
    const bhRoutes = ['BH01', 'BH02', 'BH03', 'BH04'];
    
    for (const bhRoute of bhRoutes) {
      const routeExists = routeDetails.some(detail => detail.maTuyenXe === bhRoute);
      if (routeExists) {
        return bhRoute;
      }
    }
    
    return 'BH01'; // Fallback
  }
  private isNga3HangDauStation(station: string): boolean {
    if (!station) return false;
    
    const stationLower = station.toLowerCase();
    
    const nga3HangDauVariations = [
      'ngã 3 hãng dầu',
      'nga 3 hang dau',
      'ngã 3 hàng dầu',
      'nga 3 hang dau',
      'hãng dầu',
      'hang dau',
      'hàng dầu',
      'hang dau'
    ];
    
    return nga3HangDauVariations.some(variation => 
      stationLower.includes(variation) || variation.includes(stationLower)
    );
  }

  /**
   * Kiểm tra xem trạm có phải là trạm "tự túc" không
   */
  private isSelfTransportStation(station: string): boolean {
    if (!station) return false;
    
    const stationLower = station.toLowerCase();
    
    const selfTransportStations = [
      'tự túc',
      'tu tuc',
      'tự đi',
      'tu di',
      'đi xe máy',
      'di xe may',
      'xe máy',
      'xe may'
    ];
    
    return selfTransportStations.some(selfTransportStation => 
      stationLower.includes(selfTransportStation)
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
