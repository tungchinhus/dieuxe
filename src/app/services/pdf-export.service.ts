// pdf-export.service.ts
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { firstValueFrom } from 'rxjs';
import { Registration } from '../models/registration.model';
import { FirestoreService } from './firestore.service';
import { DataCacheService } from './data-cache.service';
import { RouteDetail } from '../models/route-detail.model';
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

export interface RouteVehicleAssignment {
  routeId: string;
  routeName: string;
  routeCode: string;
  employeeCount: number;
  assignedVehicle: {
    vehicleId: string;
    licensePlate: string;
    vehicleType: string;
    capacity: number;
    garageId: string;
    garageName: string;
  };
  assignedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  constructor(
    private firestoreService: FirestoreService,
    private dataCacheService: DataCacheService
  ) {}

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

        const htmlContent = await this.generateHTMLTemplate(route);
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
   * Export overtime report PDF with vehicle assignments
   */
  async exportOvertimeReportPDFWithVehicleAssignments(vehicleAssignments: RouteVehicleAssignment[], selectedDate?: Date): Promise<void> {
    try {
      // 1) Lấy dữ liệu theo ngày đã chọn (fallback hôm nay)
      const todayRegistrations = selectedDate
        ? await this.getRegistrationsByDate(selectedDate)
        : await this.getTodayRegistrations();
      if (todayRegistrations.length === 0) {
        alert('Không có dữ liệu đăng ký cho ngày hôm nay');
        return;
      }

      // 2) Gom theo tuyến với thông tin xe được phân công
      const routeGroups = await this.groupRegistrationsByRouteWithVehicleAssignments(todayRegistrations, vehicleAssignments);

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

        const htmlContent = await this.generateOvertimeReportHTMLTemplate(route);
        await this.convertHTMLToPDF(pdf, htmlContent);
      }

      // 4) Lưu file
      const fileName = `PHIEU_BAO_LAM_THEM_GIO_${this.getCurrentDateString()}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error exporting overtime report PDF with vehicle assignments:', error);
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

        // Kiểm tra nếu số nhân viên > 36 thì chia thành nhiều trang
        const maxEmployeesPerPage = 36;
        if (route.registrations.length > maxEmployeesPerPage) {
          await this.exportMultiplePagesForRoute(pdf, route, maxEmployeesPerPage);
        } else {
          const htmlContent = await this.generateOvertimeReportHTMLTemplate(route);
          await this.convertHTMLToPDF(pdf, htmlContent);
        }
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
   * Lấy đăng ký theo một ngày cụ thể từ Firestore
   */
  private async getRegistrationsByDate(date: Date): Promise<Registration[]> {
    const base = new Date(date);
    const startOfDay = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const endOfDay = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59);

    const registrations = await this.firestoreService.getDangKyPhanXeByDateRange(startOfDay, endOfDay);

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
   * Gom nhóm theo tuyến với thông tin xe được phân công
   * Enhanced version with improved route assignment and sorting
   */
  private async groupRegistrationsByRouteWithVehicleAssignments(registrations: Registration[], vehicleAssignments: RouteVehicleAssignment[]): Promise<RouteInfo[]> {
    const routeMap = new Map<string, RouteInfo>();

    // Ensure data cache is loaded
    if (!this.dataCacheService.isDataLoaded()) {
      await this.dataCacheService.loadAllData();
    }

    for (const registration of registrations) {
      let finalRouteName = 'Chưa phân tuyến';
      
      // Enhanced route assignment based on station column
      if (registration.tramXe && registration.tramXe.trim() !== '') {
        const mappedRoute = this.dataCacheService.getRouteForStation(registration.tramXe);
        if (mappedRoute) {
          finalRouteName = mappedRoute;
          console.log(`PDF Export - Mapped employee ${registration.hoTen} from station "${registration.tramXe}" to route "${mappedRoute}"`);
        } else {
          // Fallback: try to determine route from station name patterns
          finalRouteName = this.determineRouteFromStationName(registration.tramXe);
          console.log(`PDF Export - Fallback mapping for employee ${registration.hoTen} from station "${registration.tramXe}" to route "${finalRouteName}"`);
        }
      }
      
      // Áp dụng logic ưu tiên gom HCM routes và xử lý "tự túc"
      finalRouteName = this.applyHCMGroupingPriority(finalRouteName, registration.tramXe);
      
      if (!routeMap.has(finalRouteName)) {
        // Tìm thông tin xe được phân công cho tuyến này
        const vehicleAssignment = vehicleAssignments.find(va => va.routeCode === finalRouteName);
        
        const routeInfo: RouteInfo = {
          routeName: finalRouteName,
          vehicleType: '16chỗ', // Default vehicle type
          registrations: [],
          driverInfo: undefined
        };
        
        // Cập nhật thông tin xe và tài xế từ vehicle assignment
        if (vehicleAssignment && vehicleAssignment.assignedVehicle.vehicleId) {
          // Lấy thông tin xe chi tiết từ Firebase để có tên tài xế và số điện thoại
          try {
            const vehicleDetails = await this.firestoreService.getXeDuaDonById(vehicleAssignment.assignedVehicle.vehicleId);
            
            if (vehicleDetails) {
              const vehicleType = vehicleAssignment.assignedVehicle.vehicleType || '';
              const licensePlate = vehicleDetails.BienSoXe || vehicleAssignment.assignedVehicle.licensePlate || '';
              const vehicleNumber = vehicleType ? `${vehicleType} - ${licensePlate}` : licensePlate;
              
              routeInfo.driverInfo = {
                name: vehicleDetails.TenTaiXe || 'TX ' + vehicleAssignment.assignedVehicle.vehicleId,
                phone: vehicleDetails.SoDienThoaiTaiXe || '0900000000',
                vehicleNumber: vehicleNumber
              };
            } else {
              // Fallback nếu không tìm thấy thông tin xe
              const vehicleType = vehicleAssignment.assignedVehicle.vehicleType || '';
              const licensePlate = vehicleAssignment.assignedVehicle.licensePlate || '';
              const vehicleNumber = vehicleType ? `${vehicleType} - ${licensePlate}` : licensePlate;
              
              routeInfo.driverInfo = {
                name: 'TX ' + vehicleAssignment.assignedVehicle.vehicleId,
                phone: '0900000000',
                vehicleNumber: vehicleNumber
              };
            }
          } catch (error) {
            console.error('Error getting vehicle details:', error);
            // Fallback nếu có lỗi
            const vehicleType = vehicleAssignment.assignedVehicle.vehicleType || '';
            const licensePlate = vehicleAssignment.assignedVehicle.licensePlate || '';
            const vehicleNumber = vehicleType ? `${vehicleType} - ${licensePlate}` : licensePlate;
            
            routeInfo.driverInfo = {
              name: 'TX ' + vehicleAssignment.assignedVehicle.vehicleId,
              phone: '0900000000',
              vehicleNumber: vehicleNumber
            };
          }
        }
        
        routeMap.set(finalRouteName, routeInfo);
      }

      routeMap.get(finalRouteName)!.registrations!.push(registration);
    }

    // Convert to array and filter out routes with no employees and self-transport routes
    const routes = Array.from(routeMap.values()).filter(route => 
      route.registrations && 
      route.registrations.length > 0 &&
      route.routeName !== 'TỰ TÚC' // Exclude self-transport routes
    );

    // Sort routes according to the specified order: HCM01, HCM02, BH01, BH02, BH03
    const routeOrder = ['HCM01', 'HCM02', 'BH01', 'BH02', 'BH03'];
    
    routes.sort((a, b) => {
      const indexA = routeOrder.indexOf(a.routeName);
      const indexB = routeOrder.indexOf(b.routeName);
      
      // If both routes are in the predefined order, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one route is in the predefined order, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither route is in the predefined order, sort alphabetically
      return a.routeName.localeCompare(b.routeName);
    });

    // Áp dụng logic overflow HCM để đảm bảo tính nhất quán với Excel export
    const processedRoutes = await this.applyHCMOverflowLogicForPDF(routes);

    // Áp dụng logic phân chia tương tự cho các tuyến Biên Hòa
    const finalRoutes = await this.applyBHDistributionLogic(processedRoutes);

    return finalRoutes;
  }

  /**
   * Gom nhóm theo tuyến dựa trên mã tuyến xe
   * Enhanced version with improved route assignment
   */
  private async groupRegistrationsByRoute(registrations: Registration[]): Promise<RouteInfo[]> {
    const routeMap = new Map<string, RouteInfo>();

    // Ensure data cache is loaded
    if (!this.dataCacheService.isDataLoaded()) {
      await this.dataCacheService.loadAllData();
    }

    for (const reg of registrations) {
      let finalRouteName = 'Chưa phân tuyến';
      
      // Enhanced route assignment based on station column
      if (reg.tramXe && reg.tramXe.trim() !== '') {
        const mappedRoute = this.dataCacheService.getRouteForStation(reg.tramXe);
        if (mappedRoute) {
          finalRouteName = mappedRoute;
          console.log(`PDF Export - Mapped employee ${reg.hoTen} from station "${reg.tramXe}" to route "${mappedRoute}"`);
        } else {
          // Fallback: try to determine route from station name patterns
          finalRouteName = this.determineRouteFromStationName(reg.tramXe);
          console.log(`PDF Export - Fallback mapping for employee ${reg.hoTen} from station "${reg.tramXe}" to route "${finalRouteName}"`);
        }
      }

      // Áp dụng logic ưu tiên gom HCM routes
      finalRouteName = this.applyHCMGroupingPriority(finalRouteName, reg.tramXe);

      if (!routeMap.has(finalRouteName)) {
        routeMap.set(finalRouteName, {
          routeName: finalRouteName,
          vehicleType: '16chỗ', // Default vehicle type
          registrations: [],
          driverInfo: undefined
        });
      }

      const existing = routeMap.get(finalRouteName);
      if (existing) {
        existing.registrations = existing.registrations || [];
        existing.registrations.push(reg);
      }
    }

    // Convert to array and filter out routes with no employees and self-transport routes
    const routes = Array.from(routeMap.values()).filter(route => 
      route.registrations && 
      route.registrations.length > 0 &&
      route.routeName !== 'TỰ TÚC' // Exclude self-transport routes
    );

    // Sort routes according to the specified order: HCM01, HCM02, BH01, BH02, BH03
    const routeOrder = ['HCM01', 'HCM02', 'BH01', 'BH02', 'BH03'];
    
    routes.sort((a, b) => {
      const indexA = routeOrder.indexOf(a.routeName);
      const indexB = routeOrder.indexOf(b.routeName);
      
      // If both routes are in the predefined order, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one route is in the predefined order, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither route is in the predefined order, sort alphabetically
      return a.routeName.localeCompare(b.routeName);
    });

    // Áp dụng logic overflow HCM để đảm bảo tính nhất quán với Excel export
    const processedRoutes = await this.applyHCMOverflowLogicForPDF(routes);

    // Áp dụng logic phân chia tương tự cho các tuyến Biên Hòa
    const finalRoutes = await this.applyBHDistributionLogic(processedRoutes);

    return finalRoutes;
  }







  /**
   * Áp dụng logic ưu tiên gom HCM và BH routes theo tiêu chí mới:
   * - HCM phụ trội chỉ có 2 tuyến (16 chỗ)
   * - Tuyến thứ 3 phát sinh: Phước Tân, Bến Gỗ, Long Bình Tân, Thủ Đức
   * - Tối ưu chi phí: Phước Tân, Bến Gỗ, Long Bình Tân sắp vào tuyến BH
   * - Thủ Đức: nếu chỉ có vài người thì cho đi taxi
   */
  /**
   * Apply HCM grouping priority logic - Updated: Ưu tiên "Ngã 3 Bến Gỗ" và "Ngã 3 Long Bình Tân" vào tuyến Biên Hòa
   * HCM01: Ngã 4 Thủ Đức, RMK, Ngã 3 Cát Lái, Hàng Xanh (Gần Văn Thánh), Đinh Tiên Hoàng-ĐBP, Hai Bà Trưng-ĐBP, BV Hòa Hảo
   * HCM02: Ngã 4 Thủ Đức, RMK, Ngã 3 Cát Lái, Bà Chiểu, Chợ Gò Vấp, Hóc Môn, Trường Lý Tự Trọng
   */
  private applyHCMGroupingPriority(routeName: string, tramXe: string): string {
    // Nếu là "tự túc", giữ nguyên
    if (tramXe && tramXe.toLowerCase().includes('tự túc')) {
      return 'TỰ TÚC';
    }

    // Đặc biệt: "Ngã 3 Hãng dầu" luôn thuộc BH03, không phân biệt tuyến gốc
    if (this.isNga3HangDauStation(tramXe)) {
      return 'BH03';
    }

    // ƯU TIÊN: "Ngã 3 Bến Gỗ" và "Ngã 3 Long Bình Tân" vào tuyến Biên Hòa để tối ưu chi phí
    if (this.isBenGoOrLongBinhTanStation(tramXe)) {
      // Nếu đã là tuyến BH, giữ nguyên
      if (routeName === 'BH01' || routeName === 'BH02' || routeName === 'BH03') {
        return routeName;
      }
      // Nếu là tuyến HCM hoặc chưa phân tuyến, chuyển sang BH03
      return 'BH03';
    }

    // Kiểm tra nếu là trạm ưu tiên cho HCM02
    if (this.isHCM02PriorityStation(tramXe)) {
      return 'HCM02';
    }

    // Kiểm tra nếu là trạm ưu tiên cho HCM01
    if (this.isHCM01PriorityStation(tramXe)) {
      return 'HCM01';
    }

    // Nếu không phải HCM route, giữ nguyên
    if (!routeName.startsWith('HCM')) {
      return routeName;
    }

    // Áp dụng logic phân chia đều cho HCM routes
    return routeName; // Logic phân chia sẽ được xử lý trong applyHCMOverflowLogicForPDF
  }

  /**
   * Apply HCM overflow logic for PDF export
   * Cập nhật: Ưu tiên tách số dư từ trạm Thủ Đức và lấy trạm gần để tối ưu chi phí
   */
  private async applyHCMOverflowLogicForPDF(routes: RouteInfo[]): Promise<RouteInfo[]> {
    const hcmRoutes = routes.filter(route => route.routeName.startsWith('HCM'));
    
    if (hcmRoutes.length === 0) {
      return routes;
    }

    const totalHCMEmployees = hcmRoutes.reduce((sum, route) => sum + (route.registrations?.length || 0), 0);
    console.log(`PDF Export - Total HCM employees: ${totalHCMEmployees}`);

    // Nếu tổng số nhân viên HCM <= 30, phân chia đều
    if (totalHCMEmployees <= 30) {
      return await this.distributeHCMEvenlyForPDF(routes, hcmRoutes);
    }

    // Nếu tổng số nhân viên HCM > 30, áp dụng logic overflow với ưu tiên Thủ Đức
    return await this.applyHCMOverflowWithThuDucPriority(routes, hcmRoutes);
  }

  /**
   * Áp dụng logic overflow HCM với ưu tiên tách số dư từ trạm Thủ Đức
   * Cập nhật: Thủ Đức dư thừa sẽ đi taxi thay vì phân bổ vào tuyến BH
   */
  private async applyHCMOverflowWithThuDucPriority(routes: RouteInfo[], hcmRoutes: RouteInfo[]): Promise<RouteInfo[]> {
    console.log('PDF Export - Applying HCM overflow logic with Thủ Đức priority (taxi for overflow)...');
    
    const allHCMEmployees: Registration[] = [];
    hcmRoutes.forEach(route => {
      if (route.registrations) {
        allHCMEmployees.push(...route.registrations);
      }
    });

    const totalHCMEmployees = allHCMEmployees.length;
    const maxCapacityPerRoute = 15; // Xe 16 chỗ, 15 nhân viên
    const maxTotalCapacity = maxCapacityPerRoute * 2; // 2 tuyến HCM
    const overflowCount = totalHCMEmployees - maxTotalCapacity;

    console.log(`Total HCM employees: ${totalHCMEmployees}, Max capacity: ${maxTotalCapacity}, Overflow: ${overflowCount}`);

    if (overflowCount <= 0) {
      return await this.distributeHCMEvenlyForPDF(routes, hcmRoutes);
    }

    // Phân loại nhân viên theo trạm
    const thuDucEmployees: Registration[] = [];
    const otherEmployees: Registration[] = [];

    allHCMEmployees.forEach(emp => {
      if (this.isThuDucStation(emp.tramXe)) {
        thuDucEmployees.push(emp);
      } else {
        otherEmployees.push(emp);
      }
    });

    console.log(`Thủ Đức employees: ${thuDucEmployees.length}, Other employees: ${otherEmployees.length}`);

    // Ưu tiên tách số dư từ trạm Thủ Đức trước - đi taxi
    let employeesToMoveToTaxi: Registration[] = [];
    let employeesToMoveToBH: Registration[] = [];
    
    if (thuDucEmployees.length >= overflowCount) {
      // Đủ nhân viên Thủ Đức để tách - tất cả đi taxi
      employeesToMoveToTaxi = thuDucEmployees.slice(0, overflowCount);
      console.log(`Moving ${overflowCount} Thủ Đức employees to TAXI`);
    } else {
      // Tách tất cả nhân viên Thủ Đức đi taxi + một số nhân viên khác đi BH
      employeesToMoveToTaxi = [...thuDucEmployees];
      const remainingToMove = overflowCount - thuDucEmployees.length;
      
      // Ưu tiên các trạm gần để tối ưu chi phí cho BH routes
      const sortedOtherEmployees = this.sortEmployeesByCostOptimization(otherEmployees);
      employeesToMoveToBH = sortedOtherEmployees.slice(0, remainingToMove);
      
      console.log(`Moving ${thuDucEmployees.length} Thủ Đức to TAXI + ${remainingToMove} other employees to BH routes`);
    }

    // Chuyển nhân viên Thủ Đức sang taxi
    const taxiEmployees = employeesToMoveToTaxi.map(emp => ({
      ...emp,
      maTuyenXe: 'TAXI'
    }));

    // Chuyển nhân viên khác sang tuyến BH gần nhất
    const bhEmployees = await this.moveEmployeesToNearestBHRoute(employeesToMoveToBH);
    
    // Cập nhật routes
    const updatedRoutes = routes.map(route => {
      if (route.routeName.startsWith('HCM')) {
        const updatedRegistrations = route.registrations?.filter(reg => 
          !taxiEmployees.some(taxi => taxi.hoTen === reg.hoTen && taxi.tramXe === reg.tramXe) &&
          !bhEmployees.some(bh => bh.hoTen === reg.hoTen && bh.tramXe === reg.tramXe)
        ) || [];
        
        return {
          ...route,
          registrations: updatedRegistrations
        };
      }
      return route;
    });

    // Thêm nhân viên taxi
    if (taxiEmployees.length > 0) {
      updatedRoutes.push({
        routeName: 'TAXI',
        vehicleType: 'Taxi',
        registrations: taxiEmployees,
        driverInfo: undefined
      });
    }

    // Thêm nhân viên đã chuyển vào tuyến BH tương ứng
    bhEmployees.forEach(emp => {
      const targetRoute = emp.maTuyenXe || 'BH01';
      const existingRoute = updatedRoutes.find(r => r.routeName === targetRoute);
      
      if (existingRoute) {
        existingRoute.registrations = existingRoute.registrations || [];
        existingRoute.registrations.push(emp);
      } else {
        updatedRoutes.push({
          routeName: targetRoute,
          vehicleType: '16chỗ',
          registrations: [emp],
          driverInfo: undefined
        });
      }
    });

    return updatedRoutes;
  }

  /**
   * Sắp xếp nhân viên theo tối ưu chi phí (trạm gần nhất)
   */
  private sortEmployeesByCostOptimization(employees: Registration[]): Registration[] {
    // Thứ tự ưu tiên từ gần đến xa (theo chi phí vận chuyển)
    const costOptimizationOrder = [
      'ngã 3 bến gỗ',
      'ngã 3 long bình tân', 
      'rmk',
      'ngã 3 cát lái',
      'hàng xanh',
      'bà chiểu',
      'chợ gò vấp',
      'hóc môn',
      'đinh tiên hoàng',
      'hai bà trưng',
      'bv hòa hảo',
      'trường lý tự trọng'
    ];

    return employees.sort((a, b) => {
      const stationA = a.tramXe?.toLowerCase() || '';
      const stationB = b.tramXe?.toLowerCase() || '';
      
      const indexA = costOptimizationOrder.findIndex(order => 
        stationA.includes(order) || order.includes(stationA)
      );
      const indexB = costOptimizationOrder.findIndex(order => 
        stationB.includes(order) || order.includes(stationB)
      );
      
      // Nếu không tìm thấy trong danh sách, đặt cuối
      const finalIndexA = indexA === -1 ? 999 : indexA;
      const finalIndexB = indexB === -1 ? 999 : indexB;
      
      return finalIndexA - finalIndexB;
    });
  }

  /**
   * Chuyển nhân viên sang tuyến BH gần nhất
   */
  private async moveEmployeesToNearestBHRoute(employees: Registration[]): Promise<Registration[]> {
    // Load Firebase mapping data để tìm tuyến BH phù hợp
    if (!this.dataCacheService.isDataLoaded()) {
      await this.dataCacheService.loadAllData();
    }

    return employees.map(emp => {
      // Tìm tuyến BH có trạm gần nhất với trạm của nhân viên
      const nearestBHRoute = this.findNearestBHRoute(emp.tramXe);
      
      return {
        ...emp,
        MaTuyenXe: nearestBHRoute
      };
    });
  }

  /**
   * Tìm tuyến BH gần nhất với trạm của nhân viên
   */
  private findNearestBHRoute(station: string): string {
    if (!station) return 'BH01';

    const stationLower = station.toLowerCase();
    
    // Mapping trạm HCM sang tuyến BH gần nhất
    const stationToBHRouteMapping: { [key: string]: string } = {
      'ngã 3 bến gỗ': 'BH03',
      'ngã 3 long bình tân': 'BH03', 
      'rmk': 'BH01',
      'ngã 3 cát lái': 'BH01',
      'hàng xanh': 'BH01',
      'bà chiểu': 'BH02',
      'chợ gò vấp': 'BH02',
      'hóc môn': 'BH02',
      'đinh tiên hoàng': 'BH01',
      'hai bà trưng': 'BH01',
      'bv hòa hảo': 'BH01',
      'trường lý tự trọng': 'BH02'
    };

    // Tìm mapping phù hợp
    for (const [stationPattern, bhRoute] of Object.entries(stationToBHRouteMapping)) {
      if (stationLower.includes(stationPattern) || stationPattern.includes(stationLower)) {
        return bhRoute;
      }
    }

    // Mặc định trả về BH01 nếu không tìm thấy
    return 'BH01';
  }
  private async distributeHCMEvenlyForPDF(routes: RouteInfo[], hcmRoutes: RouteInfo[]): Promise<RouteInfo[]> {
    console.log('PDF Export - Applying even distribution logic for HCM routes with specific station transfers...');
    const allHCMEmployees: Registration[] = [];
    hcmRoutes.forEach(route => {
      if (route.registrations) {
        allHCMEmployees.push(...route.registrations);
      }
    });
    console.log(`PDF Export - Total HCM employees to distribute: ${allHCMEmployees.length}`);
    
    // Sắp xếp nhân viên theo thứ tự trạm trong tuyến từ chiTietTuyenDuong
    const sortedHCMEmployees = await this.sortEmployeesByStationOrder(allHCMEmployees);
    console.log(`PDF Export - Sorted HCM employees by station order: ${sortedHCMEmployees.map(emp => `${emp.hoTen}(${emp.tramXe})`).join(', ')}`);
    
    // Phân loại nhân viên theo trạm để xử lý chuyển đổi
    // QUAN TRỌNG: Tách riêng BV Hòa Hảo để đảm bảo luôn ở HCM01
    const bvHoaHaoEmployees: Registration[] = [];
    const employeesToMoveToHCM01: Registration[] = [];
    const employeesToMoveToHCM02: Registration[] = [];
    const otherEmployees: Registration[] = [];
    
    sortedHCMEmployees.forEach(employee => {
      const station = employee.tramXe?.toLowerCase() || '';
      
      // QUAN TRỌNG: Tách riêng BV Hòa Hảo - phải luôn ở HCM01
      if (this.isBvHoaHaoStation(employee.tramXe)) {
        console.log(`PDF Export - Classifying employee ${employee.hoTen} from station "${employee.tramXe}" as BV Hòa Hảo (must be in HCM01)`);
        bvHoaHaoEmployees.push(employee);
      }
      // Kiểm tra xem có phải trạm cần chuyển lên HCM01 không (không bao gồm BV Hòa Hảo)
      else if (this.isTargetStationForHCM01(station)) {
        console.log(`PDF Export - Moving employee ${employee.hoTen} from station "${employee.tramXe}" to HCM01`);
        employeesToMoveToHCM01.push(employee);
      } else if (this.isSharedStation(station)) {
        // Các trạm chung giữa 2 tuyến - có thể chuyển xuống HCM02 để bù lại
        employeesToMoveToHCM02.push(employee);
      } else {
        // Các trạm khác
        otherEmployees.push(employee);
      }
    });
    
    console.log(`PDF Export - Employee classification: BV Hòa Hảo=${bvHoaHaoEmployees.length}, To HCM01=${employeesToMoveToHCM01.length}, To HCM02=${employeesToMoveToHCM02.length}, Other=${otherEmployees.length}`);
    
    const hcm01Employees: Registration[] = [];
    const hcm02Employees: Registration[] = [];
    const maxEmployeesPerRoute = 15;
    const addedEmployeeIds = new Set<string>(); // Track which employees have been added
    
    // Helper function to add employee to a route if there's space
    const addToRoute = (employee: Registration, route: Registration[], routeName: string): boolean => {
      const empId = `${employee.hoTen}_${employee.tramXe}_${employee.ngayDangKy}`;
      if (addedEmployeeIds.has(empId)) {
        return false; // Already added
      }
      if (route.length < maxEmployeesPerRoute) {
        route.push(employee);
        addedEmployeeIds.add(empId);
        return true;
      }
      return false; // Route is full
    };
    
    // Helper function to move employee from one route to another
    const moveFromRoute = (employee: Registration, fromRoute: Registration[], toRoute: Registration[]): boolean => {
      const index = fromRoute.findIndex(emp => 
        emp.hoTen === employee.hoTen && 
        emp.tramXe === employee.tramXe && 
        emp.ngayDangKy === employee.ngayDangKy
      );
      if (index >= 0 && toRoute.length < maxEmployeesPerRoute) {
        fromRoute.splice(index, 1);
        toRoute.push(employee);
        const empId = `${employee.hoTen}_${employee.tramXe}_${employee.ngayDangKy}`;
        addedEmployeeIds.delete(empId); // Remove from tracking to allow re-adding
        return true;
      }
      return false;
    };
    
    // Bước 1: Thêm nhân viên từ các trạm đặc biệt vào HCM01 (theo thứ tự từ database)
    console.log(`PDF Export - Step 1: Adding target station employees to HCM01 in correct order`);
    
    // Sắp xếp lại nhân viên từ trạm đặc biệt theo thứ tự từ database
    const sortedTargetEmployees = await this.sortEmployeesByStationOrder(employeesToMoveToHCM01);
    
    for (const employee of sortedTargetEmployees) {
      if (!addToRoute(employee, hcm01Employees, 'HCM01')) {
        // HCM01 is full, add to HCM02 instead
        addToRoute(employee, hcm02Employees, 'HCM02');
      }
    }
    
    // Bước 2: Thêm nhân viên từ các trạm chung để đủ 15 người cho HCM01 (theo thứ tự từ database)
    console.log(`PDF Export - Step 2: Adding shared station employees to HCM01 to reach 15 in correct order`);
    
    // Sắp xếp lại nhân viên từ trạm chung theo thứ tự từ database
    const sortedSharedEmployees = await this.sortEmployeesByStationOrder(employeesToMoveToHCM02);
    
    // Ưu tiên đặc biệt: Ngã 3 Bến Gỗ phải được đưa vào HCM01 trước khi HCM01 đủ 15
    const isBenGo = (s: string | undefined) => (s || '').toLowerCase().includes('ngã 3 bến gỗ') || (s || '').toLowerCase().includes('nga 3 ben go');
    const benGoShared = sortedSharedEmployees.filter(emp => isBenGo(emp.tramXe));
    const otherShared = sortedSharedEmployees.filter(emp => !isBenGo(emp.tramXe));

    // Đưa Bến Gỗ vào trước
    for (const employee of [...benGoShared, ...otherShared]) {
      if (!addToRoute(employee, hcm01Employees, 'HCM01')) {
        // HCM01 is full, add to HCM02 instead
        addToRoute(employee, hcm02Employees, 'HCM02');
      }
    }
    
    // Bước 3: Thêm nhân viên khác để đủ 15 người cho HCM01 (theo thứ tự từ database)
    console.log(`PDF Export - Step 3: Adding other employees to HCM01 to reach 15 in correct order`);
    
    // Sắp xếp lại nhân viên khác theo thứ tự từ database
    const sortedOtherEmployees = await this.sortEmployeesByStationOrder(otherEmployees);
    
    for (const employee of sortedOtherEmployees) {
      if (!addToRoute(employee, hcm01Employees, 'HCM01')) {
        // HCM01 is full, add to HCM02 instead
        addToRoute(employee, hcm02Employees, 'HCM02');
      }
    }
    
    // Bước 4: QUAN TRỌNG - Đảm bảo tất cả nhân viên từ BV Hòa Hảo được đưa vào HCM01
    // Nếu HCM01 đầy, chuyển nhân viên từ các trạm chung (shared stations) từ HCM01 sang HCM02 để tạo chỗ trống
    const sortedBvHoaHaoEmployees = await this.sortEmployeesByStationOrder(bvHoaHaoEmployees);
    for (const employee of sortedBvHoaHaoEmployees) {
      if (!addToRoute(employee, hcm01Employees, 'HCM01')) {
        // HCM01 is full, cần chuyển nhân viên từ trạm chung từ HCM01 sang HCM02 để tạo chỗ trống
        console.log(`PDF Export - HCM01 is full, moving shared station employees from HCM01 to HCM02 to make room for BV Hòa Hảo employee ${employee.hoTen}`);
        
        // Tìm nhân viên từ trạm chung trong HCM01 để chuyển sang HCM02
        let moved = false;
        for (let i = hcm01Employees.length - 1; i >= 0; i--) {
          const empInHCM01 = hcm01Employees[i];
          const stationLower = (empInHCM01.tramXe || '').toLowerCase();
          
          // Chỉ chuyển nhân viên từ trạm chung (shared stations)
          if (this.isSharedStation(stationLower)) {
            if (moveFromRoute(empInHCM01, hcm01Employees, hcm02Employees)) {
              console.log(`PDF Export - Moved shared station employee ${empInHCM01.hoTen} from HCM01 to HCM02 to make room for BV Hòa Hảo`);
              moved = true;
              break;
            }
          }
        }
        
        // Nếu đã chuyển được, thêm nhân viên BV Hòa Hảo vào HCM01
        if (moved) {
          addToRoute(employee, hcm01Employees, 'HCM01');
        } else {
          // Nếu không thể chuyển, vẫn thêm vào HCM01 (overflow) nhưng log warning
          console.warn(`PDF Export - WARNING: Could not make room in HCM01 for BV Hòa Hảo employee ${employee.hoTen}, adding anyway (overflow)`);
          hcm01Employees.push(employee);
          addedEmployeeIds.add(`${employee.hoTen}_${employee.tramXe}_${employee.ngayDangKy}`);
        }
      }
    }
    
    // Bước 5: Phân chia nhân viên còn lại cho HCM02 (theo thứ tự từ database)
    console.log(`PDF Export - Step 5: Distributing remaining employees to HCM02 in correct order`);
    
    // Lấy tất cả nhân viên chưa được thêm vào
    const allProcessedEmployees = [...sortedTargetEmployees, ...sortedSharedEmployees, ...sortedOtherEmployees, ...sortedBvHoaHaoEmployees];
    const remainingEmployees = allProcessedEmployees.filter(emp => {
      const empId = `${emp.hoTen}_${emp.tramXe}_${emp.ngayDangKy}`;
      return !addedEmployeeIds.has(empId);
    });
    
    // Sắp xếp lại nhân viên còn lại theo thứ tự từ database
    const sortedRemainingEmployees = await this.sortEmployeesByStationOrder(remainingEmployees);
    
    for (const employee of sortedRemainingEmployees) {
      if (!addToRoute(employee, hcm02Employees, 'HCM02')) {
        console.log(`PDF Export - HCM02 full, employee ${employee.hoTen} will be handled by overflow logic`);
        break;
      }
    }
    
    console.log(`PDF Export - Final distribution result: HCM01=${hcm01Employees.length}, HCM02=${hcm02Employees.length}`);
    console.log(`PDF Export - Moved ${employeesToMoveToHCM01.length} employees from target stations to HCM01`);
    console.log(`PDF Export - Moved ${bvHoaHaoEmployees.length} BV Hòa Hảo employees to HCM01`);
    
    // Log thứ tự cuối cùng của HCM01 để kiểm tra
    console.log(`PDF Export - HCM01 final order:`, hcm01Employees.map(emp => `${emp.hoTen}(${emp.tramXe})`).join(', '));

    const updatedRoutes = [...routes];
    const hcm01Index = updatedRoutes.findIndex(r => r.routeName === 'HCM01');
    const hcm02Index = updatedRoutes.findIndex(r => r.routeName === 'HCM02');
    
    if (hcm01Index >= 0) {
      updatedRoutes[hcm01Index].registrations = hcm01Employees;
    }
    if (hcm02Index >= 0) {
      updatedRoutes[hcm02Index].registrations = hcm02Employees;
    }
    
    return updatedRoutes;
  }

  /**
   * Kiểm tra xem trạm có phải là BV Hòa Hảo không
   * BV Hòa Hảo phải luôn ở HCM01, không bao giờ được đưa vào HCM02
   */
  private isBvHoaHaoStation(station: string): boolean {
    if (!station) return false;
    const stationLower = station.toLowerCase();
    const bvHoaHaoVariations = ['bv hòa hảo', 'bv hoa hao', 'bệnh viện hòa hảo', 'benh vien hoa hao'];
    return bvHoaHaoVariations.some(v => stationLower.includes(v) || v.includes(stationLower));
  }

  /**
   * Kiểm tra xem trạm có phải là trạm cần chuyển lên HCM01 không
   * Lưu ý: BV Hòa Hảo được xử lý riêng bằng isBvHoaHaoStation
   */
  private isTargetStationForHCM01(station: string): boolean {
    if (!station) return false;
    // Loại bỏ BV Hòa Hảo vì đã được xử lý riêng
    if (this.isBvHoaHaoStation(station)) {
      return false;
    }
    
    const stationLower = station.toLowerCase();
    
    const targetStations = [
      'đinh tiên hoàng-đbp',
      'dinh tien hoang-dbp',
      'hai bà trưng-đbp',
      'hai ba trung-dbp'
    ];
    
    return targetStations.some(targetStation => 
      stationLower.includes(targetStation) || targetStation.includes(stationLower)
    );
  }

  /**
   * Kiểm tra xem trạm có phải là trạm chung giữa 2 tuyến không
   */
  private isSharedStation(station: string): boolean {
    if (!station) return false;
    
    const stationLower = station.toLowerCase();
    
    const sharedStations = [
      'ngã 3 bến gỗ',
      'nga 3 ben go',
      'ngã 3 long bình tân',
      'nga 3 long binh tan',
      'ngã 4 thủ đức',
      'nga 4 thu duc',
      'rmk',
      'ngã 3 cát lái',
      'nga 3 cat lai',
      'hàng xanh',
      'hang xanh',
      'hàng xanh (gần văn thánh)',
      'hang xanh (gan van thanh)'
    ];
    
    return sharedStations.some(sharedStation => 
      stationLower.includes(sharedStation) || sharedStation.includes(stationLower)
    );
  }

  /**
   * Áp dụng logic phân chia cho các tuyến Biên Hòa dựa trên trạm thực tế từ database
   */
  private async applyBHDistributionLogic(routes: RouteInfo[]): Promise<RouteInfo[]> {
    console.log('PDF Export - Applying BH distribution logic based on actual stations...');
    
    const bhRoutes = routes.filter(route => route.routeName.startsWith('BH'));
    
    if (bhRoutes.length === 0) {
      console.log('PDF Export - No BH routes found, skipping BH distribution');
      return routes;
    }

    console.log(`PDF Export - Found ${bhRoutes.length} BH routes: ${bhRoutes.map(r => r.routeName).join(', ')}`);

    // Gom tất cả nhân viên BH
    const allBHEmployees: Registration[] = [];
    bhRoutes.forEach(route => {
      if (route.registrations) {
        allBHEmployees.push(...route.registrations);
      }
    });

    console.log(`PDF Export - Total BH employees to distribute: ${allBHEmployees.length}`);

    if (allBHEmployees.length === 0) {
      console.log('PDF Export - No BH employees found, skipping BH distribution');
      return routes;
    }

    // Sắp xếp nhân viên BH theo thứ tự trạm từ database để đảm bảo thứ tự đúng
    const sortedBHEmployees = await this.sortEmployeesByStationOrder(allBHEmployees);
    console.log(`PDF Export - Sorted BH employees by station order: ${sortedBHEmployees.map(emp => `${emp.hoTen}(${emp.tramXe})`).join(', ')}`);

    // QUAN TRỌNG: Tách riêng các trạm ưu tiên cho từng tuyến BH
    const phuocTanEmployees: Registration[] = []; // Ưu tiên BH01
    const nga3HangDauEmployees: Registration[] = []; // Ưu tiên BH03
    const benGoLongBinhTanEmployees: Registration[] = []; // Ưu tiên BH03
    const otherBHEmployees: Registration[] = [];
    
    sortedBHEmployees.forEach(employee => {
      const station = employee.tramXe || '';
      if (this.isPhuocTanToanDung(station)) {
        console.log(`PDF Export - Classifying employee ${employee.hoTen} from station "${station}" as Phước Tân (must be in BH01)`);
        phuocTanEmployees.push(employee);
      } else if (this.isNga3HangDauStation(station)) {
        console.log(`PDF Export - Classifying employee ${employee.hoTen} from station "${station}" as Ngã 3 Hãng dầu (must be in BH03)`);
        nga3HangDauEmployees.push(employee);
      } else if (this.isBenGoOrLongBinhTanStation(station)) {
        console.log(`PDF Export - Classifying employee ${employee.hoTen} from station "${station}" as Ngã 3 Bến Gỗ/Long Bình Tân (must be in BH03)`);
        benGoLongBinhTanEmployees.push(employee);
      } else {
        otherBHEmployees.push(employee);
      }
    });
    
    console.log(`PDF Export - BH Employee classification: Phước Tân=${phuocTanEmployees.length}, Ngã 3 Hãng dầu=${nga3HangDauEmployees.length}, Bến Gỗ/Long Bình Tân=${benGoLongBinhTanEmployees.length}, Other=${otherBHEmployees.length}`);

    // Phân chia nhân viên BH dựa trên trạm thực tế và thứ tự từ database
    const bh01Employees: Registration[] = [];
    const bh02Employees: Registration[] = [];
    const bh03Employees: Registration[] = [];
    
    const maxEmployeesBH01 = 45; // BH01 xe 45 chỗ
    const maxEmployeesBH02 = 45; // BH02 xe 45 chỗ
    const maxEmployeesBH03 = 15; // BH03 xe 16 chỗ

    console.log(`PDF Export - BH01: max ${maxEmployeesBH01} employees for 45-seat vehicle`);
    console.log(`PDF Export - BH02: max ${maxEmployeesBH02} employees for 45-seat vehicle`);
    console.log(`PDF Export - BH03: max ${maxEmployeesBH03} employees for 16-seat vehicle`);

    // Helper function to add employee to a route if there's space
    const addToRoute = (employee: Registration, route: Registration[], routeName: string): boolean => {
      if (route.includes(employee)) {
        return false; // Already added
      }
      if (route.length < (routeName === 'BH01' ? maxEmployeesBH01 : routeName === 'BH02' ? maxEmployeesBH02 : maxEmployeesBH03)) {
        route.push(employee);
        return true;
      }
      return false; // Route is full
    };
    
    // Helper function to move employee from one route to another
    const moveFromRoute = (employee: Registration, fromRoute: Registration[], toRoute: Registration[], toRouteName: string): boolean => {
      const index = fromRoute.indexOf(employee);
      const maxCapacity = toRouteName === 'BH01' ? maxEmployeesBH01 : toRouteName === 'BH02' ? maxEmployeesBH02 : maxEmployeesBH03;
      if (index >= 0 && toRoute.length < maxCapacity) {
        fromRoute.splice(index, 1);
        toRoute.push(employee);
        return true;
      }
      return false;
    };
    
    // Helper function to check if station is shared between multiple BH routes
    const isSharedBHStation = (station: string, bh01Stations: string[], bh02Stations: string[], bh03Stations: string[]): boolean => {
      const stationLower = station.toLowerCase();
      const inBH01 = bh01Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );
      const inBH02 = bh02Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );
      const inBH03 = bh03Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );
      const routeCount = [inBH01, inBH02, inBH03].filter(Boolean).length;
      return routeCount > 1; // Shared if appears in more than one route
    };

    const bh01Stations = this.dataCacheService.getStationsForRoute('BH01');
    const bh02Stations = this.dataCacheService.getStationsForRoute('BH02');
    const bh03Stations = this.dataCacheService.getStationsForRoute('BH03');
    
    console.log(`PDF Export - BH01 stations: ${bh01Stations.join(', ')}`);
    console.log(`PDF Export - BH02 stations: ${bh02Stations.join(', ')}`);
    console.log(`PDF Export - BH03 stations: ${bh03Stations.join(', ')}`);

    // BƯỚC 1: Gom nhân viên vào BH01 từ các trạm khác (trước khi thêm trạm ưu tiên)
    console.log(`PDF Export - Step 1: Grouping other employees into BH01`);
    
    for (const employee of otherBHEmployees) {
      const station = employee.tramXe || '';
      const stationLower = station.toLowerCase();
      
      const inBH01 = bh01Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );
      const inBH02 = bh02Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );
      const inBH03 = bh03Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );
      
      const routeCount = [inBH01, inBH02, inBH03].filter(Boolean).length;
      const shouldAddToBH01 = (inBH01 && inBH02 && inBH03) || (inBH01 && routeCount === 1);
      
      if (shouldAddToBH01) {
        addToRoute(employee, bh01Employees, 'BH01');
      }
    }
    
    // BƯỚC 2: QUAN TRỌNG - Đảm bảo tất cả nhân viên từ Phước Tân được đưa vào BH01
    // Nếu BH01 đầy, chuyển nhân viên từ trạm chung từ BH01 sang BH02 hoặc BH03 để tạo chỗ trống
    const sortedPhuocTanEmployees = await this.sortEmployeesByStationOrder(phuocTanEmployees);
    for (const employee of sortedPhuocTanEmployees) {
      if (!addToRoute(employee, bh01Employees, 'BH01')) {
        // BH01 is full, cần chuyển nhân viên từ trạm chung từ BH01 sang BH02/BH03 để tạo chỗ trống
        console.log(`PDF Export - BH01 is full, moving shared station employees from BH01 to make room for Phước Tân employee ${employee.hoTen}`);
        
        // Tìm nhân viên từ trạm chung trong BH01 để chuyển sang BH02 hoặc BH03
        let moved = false;
        for (let i = bh01Employees.length - 1; i >= 0; i--) {
          const empInBH01 = bh01Employees[i];
          const stationLower = (empInBH01.tramXe || '').toLowerCase();
          
          // Chỉ chuyển nhân viên từ trạm chung (shared stations)
          if (isSharedBHStation(empInBH01.tramXe || '', bh01Stations, bh02Stations, bh03Stations)) {
            // Ưu tiên chuyển sang BH02 trước
            if (moveFromRoute(empInBH01, bh01Employees, bh02Employees, 'BH02')) {
              console.log(`PDF Export - Moved shared station employee ${empInBH01.hoTen} from BH01 to BH02 to make room for Phước Tân`);
              moved = true;
              break;
            } else if (moveFromRoute(empInBH01, bh01Employees, bh03Employees, 'BH03')) {
              console.log(`PDF Export - Moved shared station employee ${empInBH01.hoTen} from BH01 to BH03 to make room for Phước Tân`);
              moved = true;
              break;
            }
          }
        }
        
        // Nếu đã chuyển được, thêm nhân viên Phước Tân vào BH01
        if (moved) {
          addToRoute(employee, bh01Employees, 'BH01');
        } else {
          // Nếu không thể chuyển, vẫn thêm vào BH01 (overflow) nhưng log warning
          console.warn(`PDF Export - WARNING: Could not make room in BH01 for Phước Tân employee ${employee.hoTen}, adding anyway (overflow)`);
          bh01Employees.push(employee);
        }
      }
    }
    
    console.log(`PDF Export - BH01 now has ${bh01Employees.length} employees`);
    
    // BƯỚC 3: Gom nhân viên vào BH02 từ nhân viên còn lại (không bao gồm trạm ưu tiên)
    console.log(`PDF Export - Step 3: Grouping remaining employees into BH02`);
    
    for (const employee of otherBHEmployees) {
      // Bỏ qua nhân viên đã được gán vào BH01
      if (bh01Employees.includes(employee)) {
        continue;
      }
      
      const station = employee.tramXe || '';
      const stationLower = station.toLowerCase();

      const inBH02 = bh02Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );
      const inBH03 = bh03Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );
      
      const routeCount = [inBH02, inBH03].filter(Boolean).length;
      const shouldAddToBH02 = (inBH02 && inBH03) || (inBH02 && routeCount === 1);
      
      if (shouldAddToBH02) {
        addToRoute(employee, bh02Employees, 'BH02');
      }
    }
    
    console.log(`PDF Export - BH02 now has ${bh02Employees.length} employees`);
    
    // BƯỚC 4: QUAN TRỌNG - Đảm bảo tất cả nhân viên từ Ngã 3 Hãng dầu và Bến Gỗ/Long Bình Tân được đưa vào BH03
    // Nếu BH03 đầy, chuyển nhân viên từ trạm chung từ BH03 sang BH01 hoặc BH02 để tạo chỗ trống
    const sortedNga3HangDauEmployees = await this.sortEmployeesByStationOrder(nga3HangDauEmployees);
    const sortedBenGoLongBinhTanEmployees = await this.sortEmployeesByStationOrder(benGoLongBinhTanEmployees);
    const allBH03PriorityEmployees = [...sortedNga3HangDauEmployees, ...sortedBenGoLongBinhTanEmployees];
    
    for (const employee of allBH03PriorityEmployees) {
      if (!addToRoute(employee, bh03Employees, 'BH03')) {
        // BH03 is full, cần chuyển nhân viên từ trạm chung từ BH03 sang BH01 hoặc BH02 để tạo chỗ trống
        console.log(`PDF Export - BH03 is full, moving shared station employees from BH03 to make room for priority employee ${employee.hoTen}`);
        
        // Tìm nhân viên từ trạm chung trong BH03 để chuyển sang BH01 hoặc BH02
        let moved = false;
        for (let i = bh03Employees.length - 1; i >= 0; i--) {
          const empInBH03 = bh03Employees[i];
          
          // Chỉ chuyển nhân viên từ trạm chung (shared stations), không chuyển các trạm ưu tiên khác
          if (isSharedBHStation(empInBH03.tramXe || '', bh01Stations, bh02Stations, bh03Stations)) {
            // Ưu tiên chuyển sang BH02 trước
            if (moveFromRoute(empInBH03, bh03Employees, bh02Employees, 'BH02')) {
              console.log(`PDF Export - Moved shared station employee ${empInBH03.hoTen} from BH03 to BH02 to make room for priority employee`);
              moved = true;
              break;
            } else if (moveFromRoute(empInBH03, bh03Employees, bh01Employees, 'BH01')) {
              console.log(`PDF Export - Moved shared station employee ${empInBH03.hoTen} from BH03 to BH01 to make room for priority employee`);
              moved = true;
              break;
            }
          }
        }
        
        // Nếu đã chuyển được, thêm nhân viên ưu tiên vào BH03
        if (moved) {
          addToRoute(employee, bh03Employees, 'BH03');
        } else {
          // Nếu không thể chuyển, vẫn thêm vào BH03 (overflow) nhưng log warning
          console.warn(`PDF Export - WARNING: Could not make room in BH03 for priority employee ${employee.hoTen}, adding anyway (overflow)`);
          bh03Employees.push(employee);
        }
      }
    }
    
    // BƯỚC 5: Thêm các nhân viên còn lại vào BH03
    console.log(`PDF Export - Step 5: Adding remaining employees to BH03`);
    
    for (const employee of otherBHEmployees) {
      // Bỏ qua nhân viên đã được gán vào BH01 hoặc BH02
      if (bh01Employees.includes(employee) || bh02Employees.includes(employee)) {
        continue;
      }
      
      const station = employee.tramXe || '';
      const stationLower = station.toLowerCase();
      
      const inBH03 = bh03Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );
      
      if (inBH03) {
        addToRoute(employee, bh03Employees, 'BH03');
      }
    }
    
    console.log(`PDF Export - BH03 now has ${bh03Employees.length} employees`);

    console.log(`PDF Export - BH distribution result: BH01=${bh01Employees.length}, BH02=${bh02Employees.length}, BH03=${bh03Employees.length}`);

    // Sắp xếp lại nhân viên trong từng tuyến BH theo đúng thứ tự trạm từ database
    console.log(`PDF Export - Sorting employees within each BH route by database order...`);
    
    const sortedBH01Employees = await this.sortEmployeesByStationOrder(bh01Employees);
    const sortedBH02Employees = await this.sortEmployeesByStationOrder(bh02Employees);
    const sortedBH03Employees = await this.sortEmployeesByStationOrder(bh03Employees);
    
    console.log(`PDF Export - BH01 sorted order:`, sortedBH01Employees.map(emp => `${emp.hoTen}(${emp.tramXe})`).join(', '));
    console.log(`PDF Export - BH02 sorted order:`, sortedBH02Employees.map(emp => `${emp.hoTen}(${emp.tramXe})`).join(', '));
    console.log(`PDF Export - BH03 sorted order:`, sortedBH03Employees.map(emp => `${emp.hoTen}(${emp.tramXe})`).join(', '));
    
    // Cập nhật routes
    const updatedRoutes = [...routes];
    
    // Cập nhật từng tuyến BH với nhân viên đã sắp xếp theo thứ tự database
    const bh01Index = updatedRoutes.findIndex(r => r.routeName === 'BH01');
    const bh02Index = updatedRoutes.findIndex(r => r.routeName === 'BH02');
    const bh03Index = updatedRoutes.findIndex(r => r.routeName === 'BH03');

    if (bh01Index >= 0) {
      updatedRoutes[bh01Index].registrations = sortedBH01Employees;
    }
    if (bh02Index >= 0) {
      updatedRoutes[bh02Index].registrations = sortedBH02Employees;
    }
    if (bh03Index >= 0) {
      updatedRoutes[bh03Index].registrations = sortedBH03Employees;
    }

    return updatedRoutes;
  }

  /**
   * Kiểm tra trạm "Phước Tân (Cây xăng Toàn Dung)" với dạng chuẩn hóa để so khớp ổn định
   */
  private isPhuocTanToanDung(station: string): boolean {
    if (!station) return false;
    const normalized = this.normalizeStationName(station);
    const targets = [
      'phuoc tan cay xang toan dung',
      'phuoc tan (cay xang toan dung)',
      'phước tân (cây xăng toàn dung)'
    ].map(s => this.normalizeStationName(s));
    return targets.includes(normalized);
  }

  /**
   * Xác định tuyến BH phù hợp cho trạm dựa trên danh sách trạm tuyến xe chính xác
   * Xử lý các trạm thuộc nhiều tuyến với logic ưu tiên
   */
  private getBHRouteForStation(station: string): string {
    if (!station) return 'BH01'; // Default fallback
    
    const stationLower = station.toLowerCase();
    
    // Ưu tiên sử dụng DataCacheService để lấy tuyến chính xác từ database
    const actualRoute = this.dataCacheService.getRouteForStation(station);
    if (actualRoute && actualRoute.startsWith('BH')) {
      console.log(`PDF Export - Found route "${actualRoute}" for station "${station}" from database cache`);
      
      // Xử lý các trạm đặc biệt thuộc nhiều tuyến
      const specialRoute = this.handleSpecialMultiRouteStations(station, actualRoute);
      if (specialRoute) {
        console.log(`PDF Export - Special handling: Station "${station}" redirected from ${actualRoute} to ${specialRoute}`);
        return specialRoute;
      }
      
      return actualRoute;
    }
    
    // Fallback mapping cho các trạm không có trong cache
    return this.getFallbackBHRoute(station);
  }

  /**
   * Xử lý các trạm đặc biệt thuộc nhiều tuyến
   */
  private handleSpecialMultiRouteStations(station: string, currentRoute: string): string | null {
    const stationLower = station.toLowerCase();
    
    // Ngã 3 Bến Gỗ: thuộc BH03, BH04, HCM01, HCM02
    if (stationLower.includes('ngã 3 bến gỗ') || stationLower.includes('nga 3 ben go')) {
      // Ưu tiên BH03 trước, sau đó BH04
      if (currentRoute === 'BH01' || currentRoute === 'BH02') {
        console.log(`PDF Export - "Ngã 3 Bến Gỗ" should not be in ${currentRoute}, redirecting to BH03`);
        return 'BH03';
      }
      // Nếu đã đúng BH03 hoặc BH04, giữ nguyên
      return null;
    }
    
    // Ngã 4 Vũng Tàu (Ajinomoto): thuộc BH03, BH04
    if (stationLower.includes('ngã 4 vũng tàu') || stationLower.includes('nga 4 vung tau')) {
      if (currentRoute === 'BH01' || currentRoute === 'BH02') {
        console.log(`PDF Export - "Ngã 4 Vũng Tàu" should not be in ${currentRoute}, redirecting to BH03`);
        return 'BH03';
      }
      // Nếu đã đúng BH03 hoặc BH04, giữ nguyên
      return null;
    }
    
    // Ngã 3 hãng dầu: thuộc BH03
    if (stationLower.includes('ngã 3 hãng dầu') || stationLower.includes('nga 3 hang dau')) {
      if (currentRoute !== 'BH03') {
        console.log(`PDF Export - "Ngã 3 hãng dầu" should be in BH03, redirecting from ${currentRoute}`);
        return 'BH03';
      }
      return null;
    }
    
    // Ngã 3 An Bình: thuộc BH03
    if (stationLower.includes('ngã 3 an bình') || stationLower.includes('nga 3 an binh')) {
      if (currentRoute !== 'BH03') {
        console.log(`PDF Export - "Ngã 3 An Bình" should be in BH03, redirecting from ${currentRoute}`);
        return 'BH03';
      }
      return null;
    }
    
    return null;
  }

  /**
   * Fallback mapping cho các trạm không có trong cache
   */
  private getFallbackBHRoute(station: string): string {
    const stationLower = station.toLowerCase();
    
    // BH01 stations (ưu tiên cho xe 45 chỗ) - chỉ các trạm chắc chắn thuộc BH01
    const bh01Stations = [
      'phước tân (cây xăng toàn dung)',
      'phuoc tan (cay xang toan dung)',
      'cổng 11 (cây xăng thành thái thịnh)',
      'cong 11 (cay xang thanh thai thinh)',
      'công viên tam hiệp',
      'cong vien tam hiep',
      'bv đồng nai',
      'bv dong nai',
      'bệnh viện đồng nai',
      'benh vien dong nai',
      'nhà trẻ hoa sen',
      'nha tre hoa sen',
      'bv tâm hồng phước',
      'bv tam hong phuoc',
      'bệnh viện tâm hồng phước',
      'benh vien tam hong phuoc',
      'giáo xứ lộc lâm',
      'giao xu loc lam',
      'giáo xứ đại lộ',
      'giao xu dai lo'
    ];
    
    // BH02 stations - chỉ các trạm chắc chắn thuộc BH02
    const bh02Stations = [
      'bv 7b',
      'bv 7b'
    ];
    
    // BH03 stations - chỉ các trạm chắc chắn thuộc BH03
    const bh03Stations = [
      'chùa long quang tự',
      'chua long quang tu',
      'ubnd p. bình đa',
      'ubnd p. binh da',
      'đầu đường trần quốc toản',
      'dau duong tran quoc toan',
      'trường tiểu học an bình',
      'truong tieu hoc an binh',
      'ngã 4 vincom',
      'nga 4 vincom',
      'cổng chào tân mai',
      'cong chao tan mai'
    ];
    
    // BH04 stations - chỉ các trạm chắc chắn thuộc BH04
    const bh04Stations = [
      'cầu hiệp hòa',
      'cau hiep hoa',
      'ngã 3 huỳnh văn lũy (đối diện metro)',
      'nga 3 huynh van luy (doi dien metro)',
      'bưu điện tỉnh',
      'buu dien tinh',
      'chung cư thanh bình',
      'chung cu thanh binh'
    ];
    
    // Kiểm tra BH01 trước (ưu tiên cao nhất)
    if (bh01Stations.some(bh01Station => 
      stationLower.includes(bh01Station) || bh01Station.includes(stationLower)
    )) {
      console.log(`PDF Export - Station "${station}" mapped to BH01 (fallback exact match)`);
      return 'BH01';
    }
    
    // Kiểm tra BH02
    if (bh02Stations.some(bh02Station => 
      stationLower.includes(bh02Station) || bh02Station.includes(stationLower)
    )) {
      console.log(`PDF Export - Station "${station}" mapped to BH02 (fallback exact match)`);
      return 'BH02';
    }
    
    // Kiểm tra BH03
    if (bh03Stations.some(bh03Station => 
      stationLower.includes(bh03Station) || bh03Station.includes(stationLower)
    )) {
      console.log(`PDF Export - Station "${station}" mapped to BH03 (fallback exact match)`);
      return 'BH03';
    }
    
    // Kiểm tra BH04 - redirect to BH03
    if (bh04Stations.some(bh04Station => 
      stationLower.includes(bh04Station) || bh04Station.includes(stationLower)
    )) {
      console.log(`PDF Export - Station "${station}" mapped to BH03 (redirected from BH04)`);
      return 'BH03';
    }
    
    // Default fallback - ưu tiên BH03
    console.log(`PDF Export - No specific BH route found for station "${station}", defaulting to BH03 (priority)`);
    return 'BH03';
  }

  /**
   * Tìm tuyến BH thay thế cho các trạm không nên thuộc BH01
   */
  private findAlternativeBHRoute(station: string): string {
    const stationLower = station.toLowerCase();
    
    // Ngã 3 Bến Gỗ nên thuộc BH02 hoặc tuyến khác
    if (stationLower.includes('ngã 3 bến gỗ') || stationLower.includes('nga 3 ben go')) {
      console.log(`PDF Export - Redirecting "Ngã 3 Bến Gỗ" to BH02 (not BH01)`);
      return 'BH02';
    }
    
    // Các trạm khác có thể cần xử lý tương tự
    // Có thể mở rộng logic này trong tương lai
    
    // Default fallback
    return 'BH02';
  }


  /**
   * Sắp xếp nhân viên theo thứ tự trạm trong tuyến từ cache
   * Enhanced version with better station order handling
   */
  private async sortEmployeesByStationOrder(employees: Registration[]): Promise<Registration[]> {
    try {
      if (!this.dataCacheService.isDataLoaded()) {
        console.warn('PDF Export - Data cache not loaded, loading data first...');
        await this.dataCacheService.loadAllData();
      }

      // Sắp xếp nhân viên theo thứ tự trạm từ cache
      const sortedEmployees = [...employees].sort((a, b) => {
        const stationA = a.tramXe || '';
        const stationB = b.tramXe || '';
        
        // Tìm thứ tự trạm từ cache
        let orderA = 999;
        let orderB = 999;
        
        // Tìm thứ tự trạm từ các tuyến theo thứ tự ưu tiên
        const routes = ['HCM01', 'HCM02', 'BH01', 'BH02', 'BH03'];
        
        for (const route of routes) {
          if (orderA === 999) {
            const routeOrderA = this.dataCacheService.getStationOrderInRoute(route, stationA);
            if (routeOrderA !== null) orderA = routeOrderA;
          }
          if (orderB === 999) {
            const routeOrderB = this.dataCacheService.getStationOrderInRoute(route, stationB);
            if (routeOrderB !== null) orderB = routeOrderB;
          }
          
          // Nếu cả hai đều tìm thấy, dừng lại
          if (orderA !== 999 && orderB !== 999) {
            break;
          }
        }
        
        // Enhanced fallback: try pattern matching if cache doesn't have the station
        if (orderA === 999) {
          orderA = this.getStationOrderFromPattern(stationA);
        }
        if (orderB === 999) {
          orderB = this.getStationOrderFromPattern(stationB);
        }
        
        // Sắp xếp theo thứ tự trạm
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        
        // Fallback: sắp xếp theo tên nhân viên
        return a.hoTen.localeCompare(b.hoTen);
      });

      console.log(`PDF Export - Sorted ${sortedEmployees.length} employees by station order`);
      console.log(`PDF Export - Sorted order:`, sortedEmployees.map(emp => `${emp.hoTen}(${emp.tramXe})`).join(', '));
      return sortedEmployees;
      
    } catch (error) {
      console.error('PDF Export - Error sorting employees by station order:', error);
      return employees;
    }
  }

  /**
   * Get station order from pattern matching based on route mapping
   */
  private getStationOrderFromPattern(stationName: string): number {
    if (!stationName) return 999;
    
    const stationLower = stationName.toLowerCase().trim();
    
    // Define station orders based on the route mapping from images
    const stationOrderMap = new Map<string, number>([
      // HCM01/HCM02 common stations
      ['ngã 3 bến gỗ', 1],
      ['ngã 3 long bình tân', 2], 
      ['ngã 4 thủ đức', 3],
      ['rmk', 4],
      ['ngã 3 cát lái', 5],
      ['hàng xanh (gần văn thánh)', 6],
      
      // HCM01 specific
      ['đinh tiên hoàng-đbp', 7],
      ['hai bà trưng-đbp', 8],
      ['bv hòa hảo', 9],
      
      // HCM02 specific
      ['bà chiểu', 7],
      ['chợ gò vấp', 8],
      ['hóc môn (chùa hoằng pháp)', 9],
      ['trường lý tự trọng', 10],
      
      // BH01 stations
      ['phước tân (cây xăng toàn dung)', 1],
      ['cổng 11 (cây xăng thành thái thịnh)', 2],
      ['công viên tam hiệp', 3],
      ['bv đồng nai', 4],
      ['nhà trẻ hoa sen', 5],
      ['bv tâm hồng phước', 6],
      ['giáo xứ lộc lâm', 7],
      ['giáo xứ đại lộ', 8],
      
      // BH02 stations
      ['bv 7b', 6],
      
      // BH03 stations
      ['ngã 4 vũng tàu (ajinomoto)', 4],
      ['ngã 3 an bình', 5],
      ['trường tiểu học an bình', 6],
      ['ubnd p. bình đa', 7],
      ['đầu đường trần quốc toản', 8],
      ['chùa long quang tự', 9],
      ['cổng chào tân mai', 10],
      ['ngã 4 vincom', 11],
      
      // BH03 stations (formerly BH04)
      ['cầu hiệp hòa', 4],
      ['ngã 3 hãng dầu', 5],
      ['chung cư thanh bình', 6],
      ['ngã 3 huỳnh văn lũy (đối diện metro)', 7],
      ['bưu điện tỉnh', 8]
    ]);
    
    // Try exact match first
    for (const [pattern, order] of stationOrderMap) {
      if (stationLower.includes(pattern.toLowerCase()) || pattern.toLowerCase().includes(stationLower)) {
        console.log(`Pattern matching: Station "${stationName}" matched with "${pattern}" -> Order ${order}`);
        return order;
      }
    }
    
    return 999; // Default order for unknown stations
  }

  /**
   * Kiểm tra xem trạm có phải là trạm cần sắp vào BH không (Phước Tân, Bến Gỗ, Long Bình Tân)
   */
  private isStationForBHAssignment(tramXe: string): boolean {
    if (!tramXe) return false;
    
    const station = tramXe.toLowerCase();
    
    const stationsForBH = [
      'phước tân',
      'phuoc tan',
      'bến gỗ',
      'ben go',
      'ngã 3 bến gỗ',
      'nga 3 ben go',
      'long bình tân',
      'long binh tan',
      'ngã 3 long bình tân',
      'nga 3 long binh tan'
    ];
    
    return stationsForBH.some(stationName => 
      station.includes(stationName) || stationName.includes(station)
    );
  }

  /**
   * Kiểm tra xem trạm có phải là Ngã 3 Hãng dầu không
   */
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
   * Kiểm tra xem trạm có phải là BV Hòa Hảo không
   */
  private isBVHoaHaoStation(station: string): boolean {
    if (!station) return false;
    
    const stationLower = station.toLowerCase();
    
    const bvHoaHaoVariations = [
      'bv hòa hảo',
      'bv hoa hao',
      'bệnh viện hòa hảo',
      'benh vien hoa hao',
      'hòa hảo',
      'hoa hao'
    ];
    
    return bvHoaHaoVariations.some(variation => 
      stationLower.includes(variation) || variation.includes(stationLower)
    );
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
   * Kiểm tra xem trạm có phải là Thủ Đức không
   */
  private isThuDucStation(tramXe: string): boolean {
    if (!tramXe) return false;
    
    const station = tramXe.toLowerCase();
    
    const thuDucStations = [
      'thủ đức',
      'thu duc',
      'ngã 4 thủ đức',
      'nga 4 thu duc'
    ];
    
    return thuDucStations.some(stationName => 
      station.includes(stationName) || stationName.includes(station)
    );
  }

  /**
   * Kiểm tra xem trạm có phải là "Ngã 3 Bến Gỗ" hoặc "Ngã 3 Long Bình Tân" không
   * Các trạm này được ưu tiên vào tuyến Biên Hòa để tối ưu chi phí
   */
  private isBenGoOrLongBinhTanStation(station: string): boolean {
    if (!station) return false;
    
    const stationLower = station.toLowerCase();
    
    const priorityStations = [
      'ngã 3 bến gỗ', 'nga 3 ben go',
      'ngã 3 long bình tân', 'nga 3 long binh tan'
    ];
    
    return priorityStations.some(priorityStation =>
      stationLower.includes(priorityStation) || priorityStation.includes(stationLower)
    );
  }

  /**
   * Kiểm tra xem trạm có phải là trạm ưu tiên cho HCM01 không
   * Cập nhật: HCM01 bao gồm Đinh Tiên Hoàng-ĐBP, Hai Bà Trưng-ĐBP, BV Hòa Hảo, Ngã 4 Thủ Đức
   * (Đã loại bỏ "Ngã 3 Bến Gỗ" và "Ngã 3 Long Bình Tân" - ưu tiên vào BH)
   */
  private isHCM01PriorityStation(station: string): boolean {
    if (!station) return false;
    
    const stationLower = station.toLowerCase();
    
    const hcm01PriorityStations = [
      'đinh tiên hoàng', 'dinh tien hoang',
      'hai bà trưng', 'hai ba trung',
      'bv hòa hảo', 'bv hoa hao', 'bệnh viện hòa hảo', 'benh vien hoa hao',
      'ngã 4 thủ đức', 'nga 4 thu duc',
      'hàng xanh', 'hang xanh', 'hàng xanh (gần văn thánh)', 'hang xanh (gan van thanh)'
    ];
    
    return hcm01PriorityStations.some(priorityStation =>
      stationLower.includes(priorityStation) || priorityStation.includes(stationLower)
    );
  }

  /**
   * Kiểm tra xem trạm có phải là trạm ưu tiên cho HCM02 không
   * Cập nhật theo hình ảnh: HCM02 bao gồm Bà Chiểu, Chợ Gò Vấp, Hóc Môn, Trường Lý Tự Trọng
   */
  private isHCM02PriorityStation(station: string): boolean {
    if (!station) return false;
    
    const stationLower = station.toLowerCase();
    
    const hcm02PriorityStations = [
      'bà chiểu', 'ba chieu',
      'chợ gò vấp', 'cho go vap', 'gò vấp', 'go vap',
      'hóc môn', 'hoc mon',
      'chùa hoằng pháp', 'chua hoang phap',
      'trường lý tự trọng', 'truong ly tu trong'
    ];
    
    return hcm02PriorityStations.some(priorityStation =>
      stationLower.includes(priorityStation) || priorityStation.includes(stationLower)
    );
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
   * Sắp xếp các tuyến xe theo thứ tự ưu tiên:
   * HCM01, HCM02 (chỉ 2 tuyến chính)
   * BH01, BH02, BH03
   * THU_DUC_TAXI (taxi cho Thủ Đức)
   * Các tuyến khác theo thứ tự alphabet
   */
  private sortRoutesByPriority(routes: RouteInfo[]): RouteInfo[] {
    // Định nghĩa thứ tự ưu tiên
    const priorityOrder = [
      'HCM01', 'HCM02', // Chỉ 2 tuyến HCM chính
      'BH01', 'BH02', 'BH03',
      'THU_DUC_TAXI' // Taxi cho Thủ Đức
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

    // Xử lý trường hợp "THU_DUC_TAXI"
    if (maTuyenXe === 'THU_DUC_TAXI') {
      return {
        routeName: 'THU_DUC_TAXI',
        vehicleType: 'Taxi',
        driverInfo: { name: 'Taxi Thủ Đức', phone: 'Taxi', vehicleNumber: 'Taxi' }
      };
    }

    try {
      // Lấy thông tin tuyến xe từ database
      const routeInfo = await this.firestoreService.getLichTrinhXeByMaTuyen(maTuyenXe);
      
      if (routeInfo && routeInfo.length > 0) {
        const route = routeInfo[0];
        const normalizedRouteName = this.normalizeRouteName(route.TenTuyenXe || maTuyenXe);
        
        // Lấy thông tin tài xế từ xe được gán cho tuyến này
        let driverInfo = {
          name: 'TX ' + (route.MaXe || 'Chung'),
          phone: '0900000000',
          vehicleNumber: route.MaXe || '16C 60F01899'
        };
        
        // Nếu có mã xe, lấy thông tin tài xế chi tiết
        if (route.MaXe) {
          try {
            const vehicleDetails = await this.firestoreService.getXeDuaDonById(route.MaXe);
            if (vehicleDetails) {
              driverInfo = {
                name: vehicleDetails.TenTaiXe || 'TX ' + route.MaXe,
                phone: vehicleDetails.SoDienThoaiTaiXe || '0900000000',
                vehicleNumber: vehicleDetails.BienSoXe || route.MaXe
              };
            }
          } catch (error) {
            console.error('Error getting vehicle details for route:', error);
          }
        }
        
        return {
          routeName: normalizedRouteName,
          vehicleType: this.determineVehicleType(route.SoGheToiDa),
          driverInfo: driverInfo
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
      'HCM4': 'HCM04',
      'HCM 1': 'HCM01',
      'HCM 2': 'HCM02',
      'HCM 4': 'HCM04',
      'TUYẾN HCM01': 'HCM01',
      'TUYẾN HCM02': 'HCM02',
      'TUYẾN HCM04': 'HCM04',
      'HCM01 - TUYẾN HỒ CHÍ MINH 1': 'HCM01',
      'HCM02 - TUYẾN HỒ CHÍ MINH 2': 'HCM02',
      'HCM04 - TUYẾN HỒ CHÍ MINH 4': 'HCM04',
      'BH1': 'BH01',
      'BH2': 'BH02',
      'BH3': 'BH03',
      'BH4': 'BH03',
      'BH 1': 'BH01',
      'BH 2': 'BH02',
      'BH 3': 'BH03',
      'BH 4': 'BH03',
      'TUYẾN BH01': 'BH01',
      'TUYẾN BH02': 'BH02',
      'TUYẾN BH03': 'BH03'
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
   * Tính toán phân loại xe cho từng tuyến dựa trên số lượng nhân viên và logic mới
   */
  private calculateVehicleAllocation(routes: RouteInfo[]): RouteInfo[] {
    return routes.map(route => {
      // Loại bỏ nhân viên có trạm "tự túc"
      const filteredRegistrations = (route.registrations || []).filter(reg => 
        !this.isSelfTransportStation(reg.tramXe || '')
      );
      
      const totalEmployees = filteredRegistrations.length;
      
      // Xử lý đặc biệt cho các tuyến
      let vehicleAllocation;
      
      if (route.routeName === 'THU_DUC_TAXI') {
        // Thủ Đức: luôn dùng taxi
        vehicleAllocation = {
          vehicleType: 'Taxi' as const,
          vehicleCount: Math.ceil(totalEmployees / 4), // Taxi chở tối đa 4 người
          reason: `Thủ Đức (${totalEmployees} người) - sử dụng taxi`
        };
      } else if (route.routeName === 'HCM01' || route.routeName === 'HCM02') {
        // HCM01, HCM02: luôn dùng xe 16 chỗ
        vehicleAllocation = {
          vehicleType: '16chỗ' as const,
          vehicleCount: Math.ceil(totalEmployees / 16),
          reason: `HCM phụ trội (${totalEmployees} người) - sử dụng xe 16 chỗ`
        };
      } else {
        // Các tuyến khác: tính toán theo số lượng nhân viên
        vehicleAllocation = this.calculateVehicleTypeByEmployeeCount(totalEmployees);
      }
      
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
  private async generateHTMLTemplate(route: RouteInfo): Promise<string> {
    const today = new Date();
    const dateStr =
      `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1)
        .toString().padStart(2, '0')} năm ${today.getFullYear()}`;

    // Gom nhóm nhân viên theo trạm xe để merge cell
    // Sử dụng routeName như routeCode để sắp xếp theo thứ tự từ Quản lý tuyến đường
    const groupedByStation = await this.groupRegistrationsByStation(route.registrations || [], route.routeName);
    
    // Tạo hàng dữ liệu với merge cell
    const tableRows = await this.generateTableRowsWithMergedCells(groupedByStation);

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
    th, td { border: 0.3px solid #666; padding: 2px 6px; vertical-align: middle; }
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
   * Gom nhóm đăng ký theo trạm xe (loại bỏ trạm "tự túc") và sắp xếp theo thuTu
   * @param registrations - Danh sách đăng ký
   * @param routeCode - Mã tuyến để sắp xếp theo thứ tự từ Quản lý tuyến đường (optional)
   */
  private async groupRegistrationsByStation(registrations: Registration[], routeCode?: string): Promise<{ [station: string]: Registration[] }> {
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
    
    // Get route code from parameter, or try to find it from data cache
    let finalRouteCode = routeCode || '';
    if (!finalRouteCode) {
      const firstStation = Object.keys(grouped)[0];
      if (firstStation) {
        // Try to get route from data cache
        if (this.dataCacheService.isDataLoaded()) {
          finalRouteCode = this.dataCacheService.getRouteForStation(firstStation) || '';
        }
      }
    }
    
    // Sắp xếp các trạm theo thuTu từ RouteDetail (Quản lý tuyến đường)
    const sortedGrouped = await this.sortStationsByThuTu(grouped, finalRouteCode);
    
    return sortedGrouped;
  }

  /**
   * Normalize station name for consistent matching
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
   * Sort stations by thuTu from RouteDetail
   * @param grouped - Grouped registrations by station
   * @param routeCode - The route code to use for sorting (optional, will be looked up if not provided)
   */
  private async sortStationsByThuTu(grouped: { [station: string]: Registration[] }, routeCode?: string): Promise<{ [station: string]: Registration[] }> {
    try {
      // Get route details to determine station order from cache
      const routeDetails = this.dataCacheService.getRouteDetails();
      
      if (!routeDetails || routeDetails.length === 0) {
        console.warn('No route details found, returning stations without sorting');
        return grouped;
      }

      // Create a map of station names to their order for each route
      const stationOrderMap = new Map<string, Map<string, number>>();
      
      routeDetails.forEach((detail: any) => {
        if (!stationOrderMap.has(detail.maTuyenXe)) {
          stationOrderMap.set(detail.maTuyenXe, new Map());
        }
        const routeMap = stationOrderMap.get(detail.maTuyenXe)!;
        const stationName = detail.tenDiemDon;
        
        // Store multiple variations for better matching:
        // 1. Exact name
        routeMap.set(stationName, detail.thuTu);
        
        // 2. Normalized name (no accents, lowercase)
        routeMap.set(this.normalizeStationName(stationName), detail.thuTu);
        
        // 3. Lowercase version
        routeMap.set(stationName.toLowerCase().trim(), detail.thuTu);
        
        // 4. Without parentheses
        const withoutParentheses = stationName.replace(/[()]/g, '').trim();
        if (withoutParentheses !== stationName) {
          routeMap.set(withoutParentheses, detail.thuTu);
          routeMap.set(withoutParentheses.toLowerCase().trim(), detail.thuTu);
          routeMap.set(this.normalizeStationName(withoutParentheses), detail.thuTu);
        }
        
        // 5. Trimmed version
        const trimmed = stationName.trim();
        if (trimmed !== stationName) {
          routeMap.set(trimmed, detail.thuTu);
        }
      });

      // If routeCode is not provided, try to find it from the stations
      if (!routeCode) {
        // Try to find routeCode from all stations, not just the first one
        const allStations = Object.keys(grouped);
        let foundRouteCode = '';
        
        // Strategy 1: Try data cache for each station
        if (this.dataCacheService.isDataLoaded()) {
          for (const station of allStations) {
            const route = this.dataCacheService.getRouteForStation(station);
            if (route) {
              foundRouteCode = route;
              break;
            }
          }
        }
        
        // Strategy 2: Search in station order map
        if (!foundRouteCode) {
          for (const station of allStations) {
            for (const [route, stationMap] of stationOrderMap.entries()) {
              if (stationMap.has(station) || 
                  stationMap.has(this.normalizeStationName(station)) ||
                  stationMap.has(station.toLowerCase().trim())) {
                foundRouteCode = route;
                break;
              }
            }
            if (foundRouteCode) break;
          }
        }
        
        routeCode = foundRouteCode;
        
        if (!routeCode) {
          console.warn('⚠️ Could not determine routeCode for stations:', allStations);
          console.warn('⚠️ Returning stations without sorting');
          return grouped;
        }
        
        console.log(`✅ Found routeCode: ${routeCode} for stations:`, allStations);
      }

      const routeOrderMap = routeCode ? stationOrderMap.get(routeCode) : undefined;

      if (!routeOrderMap) {
        console.warn(`No route details found for route "${routeCode || 'unknown'}", returning stations without sorting`);
        return grouped;
      }

      // Sort stations by their thuTu order
      const sortedEntries = Object.entries(grouped).sort(([stationA], [stationB]) => {
        // Helper function to find order with multiple matching strategies
        const findOrder = (stationName: string): number => {
          // Strategy 1: Exact match
          let order = routeOrderMap.get(stationName);
          if (order !== undefined) return order;
          
          // Strategy 2: Normalized match
          const normalized = this.normalizeStationName(stationName);
          order = routeOrderMap.get(normalized);
          if (order !== undefined) return order;
          
          // Strategy 3: Case-insensitive match
          const lowerStation = stationName.toLowerCase().trim();
          for (const [key, value] of routeOrderMap.entries()) {
            if (key.toLowerCase().trim() === lowerStation) {
              return value;
            }
          }
          
          // Strategy 4: Partial match (contains)
          for (const [key, value] of routeOrderMap.entries()) {
            const keyLower = key.toLowerCase().trim();
            const stationLower = stationName.toLowerCase().trim();
            // Check if station name contains route detail name or vice versa
            if (keyLower.includes(stationLower) || stationLower.includes(keyLower)) {
              // Only match if the match is significant (at least 5 characters)
              if (Math.min(keyLower.length, stationLower.length) >= 5) {
                return value;
              }
            }
          }
          
          // Strategy 5: Remove parentheses and try again
          const withoutParentheses = stationName.replace(/[()]/g, '').trim();
          if (withoutParentheses !== stationName) {
            order = routeOrderMap.get(withoutParentheses);
            if (order !== undefined) return order;
            const normalizedWithout = this.normalizeStationName(withoutParentheses);
            order = routeOrderMap.get(normalizedWithout);
            if (order !== undefined) return order;
          }
          
          return 999; // Default order for unmatched stations
        };
        
        const orderA = findOrder(stationA);
        const orderB = findOrder(stationB);
        
        // Log for debugging
        if (orderA === 999 || orderB === 999) {
          console.log(`⚠️ Station matching: "${stationA}" -> order ${orderA}, "${stationB}" -> order ${orderB}`);
        }
        
        return orderA - orderB;
      });

      // Convert back to object
      const sortedGrouped: { [station: string]: Registration[] } = {};
      sortedEntries.forEach(([station, registrations]) => {
        sortedGrouped[station] = registrations;
      });

      // Helper function to find order for logging
      const findOrderForLog = (stationName: string): number | string => {
        let order = routeOrderMap.get(stationName);
        if (order !== undefined) return order;
        order = routeOrderMap.get(this.normalizeStationName(stationName));
        if (order !== undefined) return order;
        order = routeOrderMap.get(stationName.toLowerCase().trim());
        if (order !== undefined) return order;
        const withoutParentheses = stationName.replace(/[()]/g, '').trim();
        order = routeOrderMap.get(withoutParentheses);
        if (order !== undefined) return order;
        return 'unknown';
      };
      
      console.log(`📋 Sorted stations by thuTu for route ${routeCode}:`);
      sortedEntries.forEach(([station, registrations]) => {
        const order = findOrderForLog(station);
        console.log(`   ${order}. ${station} (${registrations.length} nhân viên)`);
      });
      
      // Debug: Log all route details for this route
      const routeDetailsForCode = routeDetails.filter(d => d.maTuyenXe === routeCode);
      console.log(`🗺️ Route details for ${routeCode} (${routeDetailsForCode.length} stations):`);
      routeDetailsForCode.forEach(detail => {
        console.log(`   ${detail.thuTu}. ${detail.tenDiemDon}`);
      });

      return sortedGrouped;

    } catch (error) {
      console.error('Error sorting stations by thuTu:', error);
      // Return original grouped if sorting fails
      return grouped;
    }
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
  private async generateTableRowsWithMergedCells(groupedByStation: { [station: string]: Registration[] }): Promise<string> {
    let tableRows = '';
    let sttCounter = 1;
    
    Object.keys(groupedByStation).forEach(station => {
      // Keep employees in their original order (already sorted by station order from database)
      // DO NOT sort alphabetically - use the original order as provided
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
   * Xuất nhiều trang khi số nhân viên > 36
   */
  private async exportMultiplePagesForRoute(pdf: jsPDF, route: RouteInfo, maxEmployeesPerPage: number): Promise<void> {
    // Gom nhóm theo trạm xe
    // Sử dụng routeName như routeCode để sắp xếp theo thứ tự từ Quản lý tuyến đường
    const groupedByStation = await this.groupRegistrationsByStation(route.registrations || [], route.routeName);
    const stations = Object.keys(groupedByStation);
    
    let currentPageEmployees: Registration[] = [];
    let currentEmployeeCount = 0;
    
    for (let stationIndex = 0; stationIndex < stations.length; stationIndex++) {
      const station = stations[stationIndex];
      const employees = groupedByStation[station];
      
      // Nếu thêm nhóm nhân viên này vượt quá 36, xuất trang hiện tại và bắt đầu trang mới
      if (currentEmployeeCount + employees.length > maxEmployeesPerPage && currentEmployeeCount > 0) {
        // Xuất trang hiện tại
        const pageRoute: RouteInfo = {
          ...route,
          registrations: currentPageEmployees
        };
        const htmlContent = await this.generateOvertimeReportHTMLTemplate(pageRoute);
        await this.convertHTMLToPDF(pdf, htmlContent);
        
        // Bắt đầu trang mới
        pdf.addPage();
        currentPageEmployees = [];
        currentEmployeeCount = 0;
      }
      
      // Thêm nhóm nhân viên vào trang hiện tại
      currentPageEmployees = currentPageEmployees.concat(employees);
      currentEmployeeCount += employees.length;
    }
    
    // Xuất trang cuối cùng nếu còn dữ liệu
    if (currentPageEmployees.length > 0) {
      const pageRoute: RouteInfo = {
        ...route,
        registrations: currentPageEmployees
      };
      const htmlContent = await this.generateOvertimeReportHTMLTemplate(pageRoute);
      await this.convertHTMLToPDF(pdf, htmlContent);
    }
  }

  /**
   * Template HTML cho phiếu báo làm thêm giờ với merge cell
   */
  private async generateOvertimeReportHTMLTemplate(route: RouteInfo): Promise<string> {
    const today = new Date();
    const dateStr =
      `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1)
        .toString().padStart(2, '0')} năm ${today.getFullYear()}`;

    // Gom nhóm nhân viên theo trạm xe để merge cell
    // Sử dụng routeName như routeCode để sắp xếp theo thứ tự từ Quản lý tuyến đường
    const groupedByStation = await this.groupRegistrationsByStation(route.registrations || [], route.routeName);
    
    // Tạo hàng dữ liệu với merge cell
    const tableRows = await this.generateOvertimeTableRowsWithMergedCells(groupedByStation);

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
    th, td { border: 0.3px solid #666; padding: 2px 6px; vertical-align: middle; }
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
  private async generateOvertimeTableRowsWithMergedCells(groupedByStation: { [station: string]: Registration[] }): Promise<string> {
    let tableRows = '';
    let sttCounter = 1;
    
    Object.keys(groupedByStation).forEach(station => {
      // Keep employees in their original order (already sorted by station order from database)
      // DO NOT sort alphabetically - use the original order as provided
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

    return yPosition;
  }


  /**
   * Determine route from station name with enhanced pattern matching
   * Based on the route-station mapping from the images provided
   */
  private determineRouteFromStationName(stationName: string): string {
    if (!stationName) return 'Chưa phân tuyến';
    
    const stationLower = stationName.toLowerCase().trim();
    
    // HCM01 stations (from the route mapping image)
    const hcm01Stations = [
      'ngã 3 bến gỗ',
      'ngã 3 long bình tân', 
      'ngã 4 thủ đức',
      'rmk',
      'ngã 3 cát lái',
      'hàng xanh (gần văn thánh)',
      'đinh tiên hoàng-đbp',
      'hai bà trưng-đbp',
      'bv hòa hảo'
    ];
    
    // HCM02 stations (from the route mapping image)
    const hcm02Stations = [
      'ngã 3 bến gỗ',
      'ngã 3 long bình tân',
      'ngã 4 thủ đức', 
      'rmk',
      'ngã 3 cát lái',
      'hàng xanh (gần văn thánh)',
      'bà chiểu',
      'chợ gò vấp',
      'hóc môn (chùa hoằng pháp)',
      'trường lý tự trọng'
    ];
    
    // BH01 stations (from the route mapping image)
    const bh01Stations = [
      'phước tân (cây xăng toàn dung)',
      'cổng 11 (cây xăng thành thái thịnh)',
      'công viên tam hiệp',
      'bv đồng nai',
      'nhà trẻ hoa sen',
      'bv tâm hồng phước',
      'giáo xứ lộc lâm',
      'giáo xứ đại lộ'
    ];
    
    // BH02 stations (from the route mapping image)
    const bh02Stations = [
      'phước tân (cây xăng toàn dung)',
      'cổng 11 (cây xăng thành thái thịnh)',
      'công viên tam hiệp',
      'bv đồng nai',
      'nhà trẻ hoa sen',
      'bv 7b'
    ];
    
    // BH03 stations (from the route mapping image)
    const bh03Stations = [
      'phước tân (cây xăng toàn dung)',
      'ngã 3 bến gỗ',
      'ngã 3 long bình tân',
      'ngã 4 vũng tàu (ajinomoto)',
      'ngã 3 an bình',
      'trường tiểu học an bình',
      'ubnd p. bình đa',
      'đầu đường trần quốc toản',
      'chùa long quang tự',
      'cổng chào tân mai',
      'ngã 4 vincom',
      'cầu hiệp hòa',
      'ngã 3 hãng dầu',
      'chung cư thanh bình',
      'ngã 3 huỳnh văn lũy (đối diện metro)',
      'bưu điện tỉnh'
    ];
    
    // Check for exact matches first
    const allStations = [
      { stations: hcm01Stations, route: 'HCM01' },
      { stations: hcm02Stations, route: 'HCM02' },
      { stations: bh01Stations, route: 'BH01' },
      { stations: bh02Stations, route: 'BH02' },
      { stations: bh03Stations, route: 'BH03' },
      { stations: bh03Stations, route: 'BH03' }
    ];
    
    for (const routeGroup of allStations) {
      for (const station of routeGroup.stations) {
        if (stationLower.includes(station.toLowerCase()) || station.toLowerCase().includes(stationLower)) {
          console.log(`Enhanced mapping: Station "${stationName}" matched with "${station}" -> Route "${routeGroup.route}"`);
          return routeGroup.route;
        }
      }
    }
    
    // Special handling for self-transport
    if (stationLower.includes('tự túc') || stationLower.includes('tu tuc')) {
      return 'TỰ TÚC';
    }
    
    console.log(`No route mapping found for station "${stationName}", defaulting to BH01`);
    return 'BH01';
  }

  /**
   * Tìm tuyến BH phù hợp cho trạm từ DB
   */
  private async findBHRouteForStation(stationName: string): Promise<string> {
    // Lấy tuyến từ cache
    const actualRoute = this.dataCacheService.getRouteForStation(stationName);
    if (actualRoute) {
      console.log(`Found route "${actualRoute}" for station "${stationName}" from cache`);
      return actualRoute;
    }
    
    console.log(`No matching route found for "${stationName}", defaulting to BH01`);
    return 'BH01';
  }
}
