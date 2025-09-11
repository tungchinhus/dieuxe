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
  vehicleType: '16chỗ' | '29chỗ' | '45chỗ';
  registrations?: Registration[];
  driverInfo?: {
    name: string;
    phone: string;
    vehicleNumber: string;
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
      const routeGroups = this.groupRegistrationsByRoute(todayRegistrations);

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
   * Lấy đăng ký hôm nay từ Firestore
   */
  private async getTodayRegistrations(): Promise<Registration[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const registrations = await this.firestoreService.getDangKyPhanXeByDateRange(startOfDay, endOfDay);

    // Map DangKyPhanXe -> Registration
    return registrations.map(reg => ({
      id: parseInt(reg.ID || '0') || 0,
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
   * Gom nhóm theo tuyến dựa trên tên trạm
   */
  private groupRegistrationsByRoute(registrations: Registration[]): RouteInfo[] {
    const routeMap = new Map<string, RouteInfo>();

    for (const reg of registrations) {
      const routeInfo = this.determineRouteFromStation(reg.tramXe);

      if (!routeMap.has(routeInfo.routeName)) {
        routeMap.set(routeInfo.routeName, {
          routeName: routeInfo.routeName,
          vehicleType: routeInfo.vehicleType,
          registrations: [],
          driverInfo: routeInfo.driverInfo
        });
      }

      const existing = routeMap.get(routeInfo.routeName);
      if (existing) {
        existing.registrations = existing.registrations || [];
        existing.registrations.push(reg);
      }
    }

    return Array.from(routeMap.values());
  }

  /**
   * Suy ra thông tin tuyến từ tên trạm
   * (giữ nguyên mapping như file của bạn)
   */
  private determineRouteFromStation(stationName: string): RouteInfo {
    const station = (stationName || '').toLowerCase();

    // Route 1: HCM 1 - 16 chỗ
    if (station.includes('hcm 1') || station.includes('hcm1')) {
      return {
        routeName: 'HCM 1',
        vehicleType: '16chỗ',
        driverInfo: { name: 'TX Thắng', phone: '0962803228', vehicleNumber: '16C 60F01800' }
      };
    }

    // Route 2: Phước Tân - 29 chỗ
    if (station.includes('phước tân') || station.includes('phuoc tan') ||
        station.includes('cây xăng') || station.includes('cay xang')) {
      return {
        routeName: 'Phước Tân (Cây xăng Toàn Dung)',
        vehicleType: '29chỗ',
        driverInfo: { name: 'TX Minh', phone: '0901234567', vehicleNumber: '29C 60F01801' }
      };
    }

    // Route 3: Ngã 3 Bến Gỗ - 45 chỗ
    if (station.includes('ngã 3') || station.includes('nga 3') ||
        station.includes('bến gỗ') || station.includes('ben go')) {
      return {
        routeName: 'Ngã 3 Bến Gỗ',
        vehicleType: '45chỗ',
        driverInfo: { name: 'TX Long', phone: '0907654321', vehicleNumber: '45C 60F01802' }
      };
    }

    // Route 4: Ngã 4 Thủ Đức - 29 chỗ
    if (station.includes('ngã 4') || station.includes('nga 4') ||
        station.includes('thủ đức') || station.includes('thu duc')) {
      return {
        routeName: 'Ngã 4 Thủ Đức',
        vehicleType: '29chỗ',
        driverInfo: { name: 'TX Hùng', phone: '0909876543', vehicleNumber: '29C 60F01803' }
      };
    }

    // Default
    return {
      routeName: 'Tuyến chung',
      vehicleType: '16chỗ',
      driverInfo: { name: 'TX Chung', phone: '0900000000', vehicleNumber: '16C 60F01899' }
    };
  }

  /**
   * Template HTML cho 1 tuyến – đúng layout PDF mẫu:
   * - Ngày ngay dưới tiêu đề (canh giữa)
   * - Không hiển thị khung TUYẾN bên phải
   * - Header bảng dùng rowspan/colspan
   */
  private generateHTMLTemplate(route: RouteInfo): string {
    const today = new Date();
    const dateStr =
      `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1)
        .toString().padStart(2, '0')} năm ${today.getFullYear()}`;

    // Hàng dữ liệu
    const tableRows = (route.registrations || []).map((reg, index) => {
      let notes = '';
      return `
        <tr>
          <td class="stt">${index + 1}</td>
          <td class="name">${reg.hoTen || ''}</td>
          <td class="station">${reg.tramXe || ''}</td>
          <td class="phone">${reg.dienThoai || ''}</td>
          <td class="time">${reg.thoiGianBatDau || ''}</td>
          <td class="time">${reg.thoiGianKetThuc || ''}</td>
          <td class="notes">${notes}</td>
        </tr>
      `;
    }).join('');

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
}
