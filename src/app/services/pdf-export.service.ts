// pdf-export.service.ts
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Registration } from '../models/registration.model';
import { FirestoreService } from './firestore.service';
// (Import dưới dùng cho map field; có thể giữ hoặc bỏ nếu không cần)
import { DangKyPhanXe } from '../models/vehicle.model';

export interface RouteInfo {
  routeName: string;
  vehicleType: '16chỗ' | '29chỗ' | '45chỗ' | 'Taxi' | 'Taxi 7 chỗ';
  registrations?: Registration[];
  driverInfo?: {
    name: string;
    phone: string;
    vehicleNumber: string;
  };
  totalEmployees?: number;
  vehicleAllocation?: {
    vehicleType: '16chỗ' | '29chỗ' | '45chỗ' | 'Taxi' | 'Taxi 7 chỗ';
    vehicleCount: number;
    reason: string;
  };
}

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  constructor(private firestoreService: FirestoreService) {}

  /**
   * Export today's registrations to PDF with route grouping using HTML template
   */
  async exportToPDF(): Promise<void> {
    try {
      // 1) Lấy dữ liệu hôm nay từ Firebase
      const todayRegistrations = await this.getTodayRegistrations();
      if (todayRegistrations.length === 0) {
        alert('Không có dữ liệu đăng ký cho ngày hôm nay');
        return;
      }

      // 2) Gom theo tuyến
      const routeGroups = await this.groupRegistrationsByRoute(todayRegistrations);

      // Kiểm tra có tuyến nào có nhân viên không
      if (routeGroups.length === 0) {
        alert('Không có dữ liệu nhân viên để xuất PDF (tất cả nhân viên đều có trạm "tự túc")');
        return;
      }

      // 3) Tạo PDF từ HTML (mỗi tuyến một trang)
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setProperties({
        title: 'Phiếu báo làm thêm giờ',
        subject: 'Báo cáo đăng ký xe',
        author: 'Thibidi System',
        creator: 'Thibidi System'
      });

      for (let i = 0; i < routeGroups.length; i++) {
        const route = routeGroups[i];
        
        // Bỏ qua tuyến không có nhân viên
        if (!route.registrations || route.registrations.length === 0) {
          console.log(`Bỏ qua tuyến ${route.routeName} - không có nhân viên`);
          continue;
        }
        
        if (i > 0) pdf.addPage();

        const htmlContent = this.generateHTMLTemplate(route);
        await this.convertHTMLToPDF(pdf, htmlContent);
      }

      // 4) Lưu file
      const fileName = `DANH_SACH_PHU_TROI_${this.getCurrentDateString()}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      throw error;
    }
  }

  /**
   * Export overtime report PDF with merged cells for employees at same station
   */
  async exportOvertimeReportPDF(): Promise<void> {
    try {
      // 1) Lấy dữ liệu hôm nay từ Firebase
      const todayRegistrations = await this.getTodayRegistrations();
      if (todayRegistrations.length === 0) {
        alert('Không có dữ liệu đăng ký cho ngày hôm nay');
        return;
      }

      // 2) Gom theo tuyến
      const routeGroups = await this.groupRegistrationsByRoute(todayRegistrations);

      // Kiểm tra có tuyến nào có nhân viên không
      if (routeGroups.length === 0) {
        alert('Không có dữ liệu nhân viên để xuất PDF (tất cả nhân viên đều có trạm "tự túc")');
        return;
      }

      // 3) Tạo PDF từ HTML với merge cell (mỗi tuyến một trang)
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setProperties({
        title: 'Phiếu báo làm thêm giờ',
        subject: 'Báo cáo làm thêm giờ',
        author: 'Thibidi System',
        creator: 'Thibidi System'
      });

      for (let i = 0; i < routeGroups.length; i++) {
        const route = routeGroups[i];
        
        // Bỏ qua tuyến không có nhân viên
        if (!route.registrations || route.registrations.length === 0) {
          console.log(`Bỏ qua tuyến ${route.routeName} - không có nhân viên`);
          continue;
        }
        
        if (i > 0) pdf.addPage();

        const htmlContent = this.generateOvertimeReportHTMLTemplate(route);
        await this.convertHTMLToPDF(pdf, htmlContent);
      }

      // 4) Lưu file
      const fileName = `PHIEU_BAO_LAM_THEM_GIO_${this.getCurrentDateString()}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error exporting overtime report PDF:', error);
      throw error;
    }
  }

  /**
   * Lấy đăng ký hôm nay từ Firestore
   */
  private async getTodayRegistrations(): Promise<Registration[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const registrations = await this.firestoreService.getDangKyPhanXeByDateRange(startOfDay, endOfDay);

    // Map DangKyPhanXe -> Registration
    return registrations.map(reg => ({
      id: reg.ID || '0',
      maNhanVien: reg.MaNhanVien,
      hoTen: reg.HoTen,
      dienThoai: reg.DienThoai,
      phongBan: reg.PhongBan,
      ngayDangKy: reg.NgayDangKy.toISOString().split('T')[0],
      loaiCa: reg.LoaiCa,
      thoiGianBatDau: reg.ThoiGianBatDau,
      thoiGianKetThuc: reg.ThoiGianKetThuc,
      maTuyenXe: reg.MaTuyenXe,
      tramXe: reg.TramXe,
      noiDungCongViec: reg.NoiDungCongViec,
      dangKyCom: reg.DangKyCom
    }));
  }

  /**
   * Gom nhóm theo tuyến dựa trên mã tuyến xe
   */
  private async groupRegistrationsByRoute(registrations: Registration[]): Promise<RouteInfo[]> {
    const routeMap = new Map<string, RouteInfo>();

    for (const reg of registrations) {
      const routeInfo = await this.determineRouteFromCode(reg.maTuyenXe, reg.hoTen);

      // Áp dụng logic ưu tiên gom HCM routes vào HCM01
      const finalRouteName = this.applyHCMGroupingPriority(routeInfo.routeName, reg.tramXe);

      if (!routeMap.has(finalRouteName)) {
        routeMap.set(finalRouteName, {
          routeName: finalRouteName,
          vehicleType: routeInfo.vehicleType,
          registrations: [],
          driverInfo: routeInfo.driverInfo
        });
      }

      const existing = routeMap.get(finalRouteName);
      if (existing) {
        existing.registrations = existing.registrations || [];
        existing.registrations.push(reg);
      }
    }

    // Sắp xếp theo thứ tự cụ thể và tính toán phân loại xe
    const routeArray = Array.from(routeMap.values());
    const sortedRoutes = this.sortRoutesByPriority(routeArray);
    
    // Tính toán phân loại xe cho từng tuyến
    return this.calculateVehicleAllocation(sortedRoutes);
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
   * Sắp xếp các tuyến xe theo thứ tự ưu tiên:
   * HCM01, HCM02, HCM03
   * BH01, BH02, BH03, BH04
   * Các tuyến khác theo thứ tự alphabet
   */
  private sortRoutesByPriority(routes: RouteInfo[]): RouteInfo[] {
    // Định nghĩa thứ tự ưu tiên
    const priorityOrder = [
      'HCM01', 'HCM02', 'HCM03',
      'BH01', 'BH02', 'BH03', 'BH04'
    ];

    return routes.sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.routeName);
      const bIndex = priorityOrder.indexOf(b.routeName);

      // Nếu cả hai đều có trong danh sách ưu tiên
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      // Nếu chỉ a có trong danh sách ưu tiên
      if (aIndex !== -1) {
        return -1;
      }

      // Nếu chỉ b có trong danh sách ưu tiên
      if (bIndex !== -1) {
        return 1;
      }

      // Nếu cả hai đều không có trong danh sách ưu tiên, sắp xếp theo alphabet
      return a.routeName.localeCompare(b.routeName);
    });
  }

  /**
   * Suy ra thông tin tuyến từ mã tuyến xe - lấy từ database
   */
  private async determineRouteFromCode(maTuyenXe: string, hoTen?: string): Promise<RouteInfo> {
    if (!maTuyenXe) {
      return {
        routeName: 'Chưa phân tuyến',
        vehicleType: '16chỗ',
        driverInfo: { name: 'TX Chung', phone: '0900000000', vehicleNumber: '16C 60F01899' }
      };
    }

    try {
      // Lấy thông tin tuyến xe từ database
      const routeInfo = await this.firestoreService.getLichTrinhXeByMaTuyen(maTuyenXe);
      
      if (routeInfo && routeInfo.length > 0) {
        const route = routeInfo[0];
        const normalizedRouteName = this.normalizeRouteName(route.TenTuyenXe || maTuyenXe);
        return {
          routeName: normalizedRouteName,
          vehicleType: this.determineVehicleType(route.SoGheToiDa),
          driverInfo: {
            name: 'TX ' + (route.MaXe || 'Chung'),
            phone: '0900000000',
            vehicleNumber: route.MaXe || '16C 60F01899'
          }
        };
      }
    } catch (error) {
      console.error('Error getting route info from database:', error);
    }

    // Fallback: sử dụng mã tuyến xe làm tên tuyến và chuẩn hóa
    const normalizedRouteName = this.normalizeRouteName(maTuyenXe);
    return {
      routeName: normalizedRouteName,
      vehicleType: '16chỗ',
      driverInfo: { name: 'TX Chung', phone: '0900000000', vehicleNumber: '16C 60F01899' }
    };
  }

  /**
   * Chuẩn hóa tên tuyến để có thể sắp xếp đúng thứ tự
   */
  private normalizeRouteName(routeName: string): string {
    if (!routeName) return 'Chưa phân tuyến';
    
    // Loại bỏ các ký tự đặc biệt và khoảng trắng thừa
    const cleaned = routeName.trim().toUpperCase();
    
    // Mapping các tên tuyến phổ biến
    const routeMapping: { [key: string]: string } = {
      'HCM1': 'HCM01',
      'HCM2': 'HCM02', 
      'HCM3': 'HCM03',
      'HCM4': 'HCM04',
      'HCM 1': 'HCM01',
      'HCM 2': 'HCM02',
      'HCM 3': 'HCM03',
      'HCM 4': 'HCM04',
      'TUYẾN HCM01': 'HCM01',
      'TUYẾN HCM02': 'HCM02',
      'TUYẾN HCM03': 'HCM03',
      'TUYẾN HCM04': 'HCM04',
      'HCM01 - TUYẾN HỒ CHÍ MINH 1': 'HCM01',
      'HCM02 - TUYẾN HỒ CHÍ MINH 2': 'HCM02',
      'HCM03 - TUYẾN HỒ CHÍ MINH 3': 'HCM03',
      'HCM04 - TUYẾN HỒ CHÍ MINH 4': 'HCM04',
      'BH1': 'BH01',
      'BH2': 'BH02',
      'BH3': 'BH03',
      'BH4': 'BH04',
      'BH 1': 'BH01',
      'BH 2': 'BH02',
      'BH 3': 'BH03',
      'BH 4': 'BH04',
      'TUYẾN BH01': 'BH01',
      'TUYẾN BH02': 'BH02',
      'TUYẾN BH03': 'BH03',
      'TUYẾN BH04': 'BH04'
    };
    
    return routeMapping[cleaned] || cleaned;
  }

  /**
   * Xác định loại xe dựa trên số ghế tối đa
   */
  private determineVehicleType(soGheToiDa: number): '16chỗ' | '29chỗ' | '45chỗ' {
    if (soGheToiDa <= 16) return '16chỗ';
    if (soGheToiDa <= 29) return '29chỗ';
    return '45chỗ';
  }

  /**
   * Tính toán phân loại xe cho từng tuyến dựa trên số lượng nhân viên
   */
  private calculateVehicleAllocation(routes: RouteInfo[]): RouteInfo[] {
    return routes.map(route => {
      // Loại bỏ nhân viên có trạm "tự túc"
      const filteredRegistrations = (route.registrations || []).filter(reg => 
        !this.isSelfTransportStation(reg.tramXe || '')
      );
      
      const totalEmployees = filteredRegistrations.length;
      const vehicleAllocation = this.calculateVehicleTypeByEmployeeCount(totalEmployees);
      
      return {
        ...route,
        registrations: filteredRegistrations,
        totalEmployees,
        vehicleType: vehicleAllocation.vehicleType,
        vehicleAllocation
      };
    }).filter(route => route.registrations && route.registrations.length > 0); // Chỉ giữ lại tuyến có nhân viên
  }

  /**
   * Tính toán loại xe dựa trên số lượng nhân viên
   */
  private calculateVehicleTypeByEmployeeCount(employeeCount: number): {
    vehicleType: '16chỗ' | '29chỗ' | '45chỗ' | 'Taxi' | 'Taxi 7 chỗ';
    vehicleCount: number;
    reason: string;
  } {
    if (employeeCount === 0) {
      return {
        vehicleType: 'Taxi',
        vehicleCount: 0,
        reason: 'Không có nhân viên'
      };
    }
    
    if (employeeCount < 7) {
      return {
        vehicleType: 'Taxi 7 chỗ',
        vehicleCount: Math.ceil(employeeCount / 7), // 1 xe taxi 7 chỗ chở tối đa 7 người
        reason: `Dưới 7 người (${employeeCount} người) - sử dụng xe taxi 7 chỗ`
      };
    }
    
    if (employeeCount >= 6 && employeeCount <= 14) {
      return {
        vehicleType: '16chỗ',
        vehicleCount: Math.ceil(employeeCount / 16),
        reason: `Từ 6-14 người (${employeeCount} người) - xe 16 chỗ`
      };
    }
    
    if (employeeCount >= 15 && employeeCount <= 28) {
      return {
        vehicleType: '29chỗ',
        vehicleCount: Math.ceil(employeeCount / 29),
        reason: `Từ 15-28 người (${employeeCount} người) - xe 29 chỗ`
      };
    }
    
    if (employeeCount >= 29 && employeeCount <= 44) {
      return {
        vehicleType: '45chỗ',
        vehicleCount: Math.ceil(employeeCount / 45),
        reason: `Từ 29-44 người (${employeeCount} người) - xe 45 chỗ`
      };
    }
    
    // Trường hợp trên 45 người - sử dụng nhiều xe 45 chỗ
    return {
      vehicleType: '45chỗ',
      vehicleCount: Math.ceil(employeeCount / 45),
      reason: `Trên 44 người (${employeeCount} người) - nhiều xe 45 chỗ`
    };
  }

  /**
   * Template HTML cho 1 tuyến – đúng layout PDF mẫu:
   * - Ngày ngay dưới tiêu đề (canh giữa)
   * - Không hiển thị khung TUYẾN bên phải
   * - Header bảng dùng rowspan/colspan
   * - Merge cell cho nhân viên cùng trạm xe
   */
  private generateHTMLTemplate(route: RouteInfo): string {
    const today = new Date();
    const dateStr =
      `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1)
        .toString().padStart(2, '0')} năm ${today.getFullYear()}`;

    // Gom nhóm nhân viên theo trạm xe để merge cell
    const groupedByStation = this.groupRegistrationsByStation(route.registrations || []);
    
    // Tạo hàng dữ liệu với merge cell
    const tableRows = this.generateTableRowsWithMergedCells(groupedByStation);

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Times New Roman", Times, serif;
      margin: 0;
      padding: 0;
      font-size: 12px;
      color: #000;
    }
    .wrap { padding: 8mm 8mm 10mm; }

    /* Layout container for horizontal alignment */
    .header-container {
      display: flex;
      align-items: center;
      margin-bottom: 4mm;
    }

    /* Khối info trái (giờ đón / tài xế / xe) */
    .left-info { 
      font-size: 12px; 
      line-height: 1.35; 
      flex: 0 0 auto;
    }
    .left-info .label{ font-weight:700; }

    /* Tiêu đề & ngày (không có khung TUYẾN bên phải) */
    .title-section {
      flex: 1;
      text-align: center;
    }
    .title{
      font-size: 20px; font-weight: 700;
      text-align:center; text-transform: uppercase;
      margin: 0;
      display: inline-block;
    }
    .date-center{
      display:block; text-align:center; font-size:12px;
      margin: 1mm 0 0 0;
    }

    /* Bảng */
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 0.5px solid #000; padding: 2px 6px; vertical-align: middle; }
    thead th { background: #fff; color:#000; font-weight: 700; }
    
    /* Dòng tên tuyến đường */
    .route-header {
      background: #fff;
      color: #000;
      font-weight: 700;
      text-align: center;
      padding: 6px;
    }

    /* Rowspan/colspan header */
    th[rowspan="2"]{ vertical-align: middle; }
    
    /* Merge cell styling */
    td[rowspan] {
      vertical-align: middle;
      text-align: center;
      font-weight: 500;
    }
    
    /* Station cell styling for merged cells */
    .station[rowspan] {
      background-color: #f8f9fa;
      font-weight: 600;
    }

    /* Độ rộng cột */
    .stt{ width: 6%; text-align:center; }
    .name{ width: 26%; text-align:left; }
    .station{ width: 26%; text-align:left; }
    .phone{ width: 13%; text-align:center; }
    .time{ width: 9%; text-align:center; }
    .notes{ width: 20%; text-align:left; font-size: 11px; }

    tbody td{ font-size:12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header-container">
      <div class="left-info">
        <div><span class="label">Giờ đón:</span> 19h15</div>
        ${route.driverInfo ? `
          <div><span class="label">Tài xế:</span> ${route.driverInfo.name} - ${route.driverInfo.phone}</div>
          <div><span class="label">Xe:</span> ${route.driverInfo.vehicleNumber}</div>
        ` : ``}
      </div>
      
      <div class="title-section">
        <div class="title">PHIẾU BÁO LÀM THÊM GIỜ</div>
        <div class="date-center">${dateStr}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="stt" rowspan="2">STT</th>
          <th class="name" rowspan="2">Họ và tên</th>
          <th class="station" rowspan="2">Trạm xe</th>
          <th class="phone" rowspan="2">Điện thoại</th>
          <th colspan="2">Thời gian làm việc</th>
          <th class="notes" rowspan="2">Ghi chú</th>
        </tr>
        <tr>
          <th class="time">Từ…</th>
          <th class="time">Đến…</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="7" class="route-header">${route.routeName}</td>
        </tr>
        ${tableRows}
      </tbody>
    </table>
  </div>
</body>
</html>
    `;
  }

  /**
   * HTML -> PDF (dựa trên html2canvas) – giữ đúng cách dùng hiện tại
   */
  private async convertHTMLToPDF(pdf: jsPDF, htmlContent: string): Promise<void> {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '210mm';    // A4 width
    tempDiv.style.fontSize = '12px';

    document.body.appendChild(tempDiv);
    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 794,   // A4 @ 96DPI
        height: 1123
      });
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297); // A4 mm
    } finally {
      document.body.removeChild(tempDiv);
    }
  }

  /** Tạo chuỗi ngày YYYYMMDD cho tên file */
  private getCurrentDateString(): string {
    const today = new Date();
    return `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
  }

  /**
   * Gom nhóm đăng ký theo trạm xe (loại bỏ trạm "tự túc")
   */
  private groupRegistrationsByStation(registrations: Registration[]): { [station: string]: Registration[] } {
    const grouped: { [station: string]: Registration[] } = {};
    const stationNameMap = new Map<string, string>(); // Map từ normalized name đến original name
    
    registrations.forEach(reg => {
      const station = reg.tramXe || 'Chưa phân trạm';
      
      // Loại bỏ nhân viên có trạm là "tự túc"
      if (this.isSelfTransportStation(station)) {
        return;
      }
      
      // Normalize tên trạm để không phân biệt chữ hoa thường khi so sánh
      const normalizedStation = this.normalizeStationName(station);
      
      // Lưu mapping từ normalized name đến original name (chỉ lưu lần đầu)
      if (!stationNameMap.has(normalizedStation)) {
        stationNameMap.set(normalizedStation, station);
      }
      
      // Sử dụng original name làm key để hiển thị đúng
      const displayStationName = stationNameMap.get(normalizedStation)!;
      
      if (!grouped[displayStationName]) {
        grouped[displayStationName] = [];
      }
      grouped[displayStationName].push(reg);
    });
    
    return grouped;
  }

  /**
   * Kiểm tra xem trạm có phải là "tự túc" không
   */
  private isSelfTransportStation(station: string): boolean {
    if (!station) return false;
    
    const selfTransportKeywords = [
      'tự túc',
      'tu tuc', 
      'TỰ TÚC',
      'TU TUC',
      'tự đi',
      'tu di',
      'TỰ ĐI',
      'TU DI',
      'đi riêng',
      'di rieng',
      'ĐI RIÊNG',
      'DI RIENG'
    ];
    
    return selfTransportKeywords.some(keyword => 
      station.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Tạo hàng bảng với merge cell cho nhân viên cùng trạm
   */
  private generateTableRowsWithMergedCells(groupedByStation: { [station: string]: Registration[] }): string {
    let tableRows = '';
    let sttCounter = 1;
    
    Object.keys(groupedByStation).forEach(station => {
      const employees = groupedByStation[station];
      const stationCount = employees.length;
      
      employees.forEach((reg, index) => {
        const isFirstRow = index === 0;
        const rowspan = isFirstRow ? stationCount : 0;
        const notes = '';
        
        tableRows += `
          <tr>
            <td class="stt">${sttCounter}</td>
            <td class="name">${reg.hoTen || ''}</td>
            ${isFirstRow ? `<td class="station" rowspan="${rowspan}">${station}</td>` : ''}
            <td class="phone">${reg.dienThoai || ''}</td>
            <td class="time">${reg.thoiGianBatDau || ''}</td>
            <td class="time">${reg.thoiGianKetThuc || ''}</td>
            <td class="notes">${notes}</td>
          </tr>
        `;
        sttCounter++;
      });
    });
    
    return tableRows;
  }

  /**
   * Template HTML cho phiếu báo làm thêm giờ với merge cell
   */
  private generateOvertimeReportHTMLTemplate(route: RouteInfo): string {
    const today = new Date();
    const dateStr =
      `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1)
        .toString().padStart(2, '0')} năm ${today.getFullYear()}`;

    // Gom nhóm nhân viên theo trạm xe để merge cell
    const groupedByStation = this.groupRegistrationsByStation(route.registrations || []);
    
    // Tạo hàng dữ liệu với merge cell
    const tableRows = this.generateOvertimeTableRowsWithMergedCells(groupedByStation);

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Times New Roman", Times, serif;
      margin: 0;
      padding: 0;
      font-size: 12px;
      color: #000;
    }
    .wrap { padding: 8mm 8mm 10mm; }

    /* Layout container for horizontal alignment */
    .header-container {
      display: flex;
      align-items: center;
      margin-bottom: 4mm;
    }

    /* Khối info trái (giờ đón / tài xế / xe) */
    .left-info { 
      font-size: 12px; 
      line-height: 1.35; 
      flex: 0 0 auto;
    }
    .left-info .label{ font-weight:700; }

    /* Tiêu đề & ngày */
    .title-section {
      flex: 1;
      text-align: center;
    }
    .title{
      font-size: 20px; font-weight: 700;
      text-align:center; text-transform: uppercase;
      margin: 0;
      display: inline-block;
    }
    .date-center{
      display:block; text-align:center; font-size:12px;
      margin: 1mm 0 0 0;
    }

    /* Bảng */
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 0.5px solid #000; padding: 2px 6px; vertical-align: middle; }
    thead th { background: #fff; color:#000; font-weight: 700; }
    
    /* Dòng tên tuyến đường */
    .route-header {
      background: #fff;
      color: #000;
      font-weight: 700;
      text-align: center;
      padding: 6px;
    }

    /* Rowspan/colspan header */
    th[rowspan="2"]{ vertical-align: middle; }
    
    /* Merge cell styling */
    td[rowspan] {
      vertical-align: middle;
      text-align: center;
      font-weight: 500;
    }
    
    /* Station cell styling for merged cells */
    .station[rowspan] {
      background-color: #f8f9fa;
      font-weight: 600;
    }

    /* Độ rộng cột */
    .stt{ width: 6%; text-align:center; }
    .name{ width: 26%; text-align:left; }
    .station{ width: 26%; text-align:left; }
    .phone{ width: 13%; text-align:center; }
    .time{ width: 9%; text-align:center; }
    .notes{ width: 20%; text-align:left; font-size: 11px; }

    tbody td{ font-size:12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header-container">
      <div class="left-info">
        <div><span class="label">Giờ đón:</span> 19h15</div>
        ${route.driverInfo ? `
          <div><span class="label">Tài xế:</span> ${route.driverInfo.name} - ${route.driverInfo.phone}</div>
          <div><span class="label">Xe:</span> ${route.driverInfo.vehicleNumber}</div>
        ` : ``}
      </div>
      
      <div class="title-section">
        <div class="title">PHIẾU BÁO LÀM THÊM GIỜ</div>
        <div class="date-center">${dateStr}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="stt" rowspan="2">STT</th>
          <th class="name" rowspan="2">Họ và tên</th>
          <th class="station" rowspan="2">Trạm xe</th>
          <th class="phone" rowspan="2">Điện thoại</th>
          <th colspan="2">Thời gian làm việc</th>
          <th class="notes" rowspan="2">Ghi chú</th>
        </tr>
        <tr>
          <th class="time">Từ…</th>
          <th class="time">Đến…</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="7" class="route-header">${route.routeName}</td>
        </tr>
        ${tableRows}
      </tbody>
    </table>
  </div>
</body>
</html>
    `;
  }

  /**
   * Tạo hàng bảng phiếu báo làm thêm giờ với merge cell cho nhân viên cùng trạm
   */
  private generateOvertimeTableRowsWithMergedCells(groupedByStation: { [station: string]: Registration[] }): string {
    let tableRows = '';
    let sttCounter = 1;
    
    Object.keys(groupedByStation).forEach(station => {
      const employees = groupedByStation[station];
      const stationCount = employees.length;
      
      employees.forEach((reg, index) => {
        const isFirstRow = index === 0;
        const rowspan = isFirstRow ? stationCount : 0;
        const notes = '';
        
        tableRows += `
          <tr>
            <td class="stt">${sttCounter}</td>
            <td class="name">${reg.hoTen || ''}</td>
            ${isFirstRow ? `<td class="station" rowspan="${rowspan}">${station}</td>` : ''}
            <td class="phone">${reg.dienThoai || ''}</td>
            <td class="time">${reg.thoiGianBatDau || '15h45'}</td>
            <td class="time">${reg.thoiGianKetThuc || '19h'}</td>
            <td class="notes">${notes}</td>
          </tr>
        `;
        sttCounter++;
      });
    });
    
    return tableRows;
  }

  // (Giữ lại các hàm PDF cũ nếu bạn còn sử dụng ở nơi khác)
  private addTitle(pdf: jsPDF): void {
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PHIEU BAO LAM THEM GIO', 105, 40, { align: 'center' });
  }

  private addRouteSection(pdf: jsPDF, route: RouteInfo, yPosition: number): number {
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${route.routeName} - Xe ${route.vehicleType}`, 20, yPosition);
    yPosition += 12;

    if (route.driverInfo) {
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Tai xe: ${route.driverInfo.name} - ${route.driverInfo.phone}`, 20, yPosition);
      pdf.text(`Xe: ${route.driverInfo.vehicleNumber}`, 20, yPosition + 6);
      yPosition += 18;
    }

    // phương án cũ không dùng nữa (đã chuyển sang HTML)
    return yPosition + 200;
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
