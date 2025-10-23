import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { firstValueFrom } from 'rxjs';
import { FirestoreService } from './firestore.service';
import { StationRouteMappingService } from './station-route-mapping.service';
import { DataCacheService } from './data-cache.service';

export interface Registration {
  maNhanVien: string;
  hoTen: string;
  dienThoai: string;
  ngayDangKy: string;
  thoiGianBatDau: string;
  thoiGianKetThuc: string;
  loaiCa: string;
  noiDungCongViec: string;
  dangKyCom: boolean;
  tramXe: string;
  maTuyenXe: string;
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
  assignedDriver: {
    driverName: string;
    phoneNumber: string;
  };
  assignedAt: Date;
  thuTu: number;
}

export interface RouteInfo {
  routeName: string;
  registrations: Registration[];
  driverInfo?: {
    name: string;
    phone: string;
    vehicleNumber: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  constructor(
    private firestoreService: FirestoreService,
    private stationRouteMappingService: StationRouteMappingService,
    private dataCacheService: DataCacheService
  ) {}

  /**
   * Export overtime report Excel with vehicle assignments
   */
  async exportOvertimeReportExcelWithVehicleAssignments(vehicleAssignments: RouteVehicleAssignment[]): Promise<void> {
    try {
      // 1) Lấy dữ liệu hôm nay từ Firebase
      const todayRegistrations = await this.getTodayRegistrations();
      if (todayRegistrations.length === 0) {
        alert('Không có dữ liệu đăng ký cho ngày hôm nay');
        return;
      }

      // 2) Gom theo tuyến với thông tin xe được phân công
      const routeGroups = await this.groupRegistrationsByRouteWithVehicleAssignments(todayRegistrations, vehicleAssignments);

      // Kiểm tra có tuyến nào có nhân viên không
      if (routeGroups.length === 0) {
        alert('Không có dữ liệu nhân viên để xuất Excel (tất cả nhân viên đều có trạm "tự túc")');
        return;
      }

      // 3) Tạo Excel workbook
      const workbook = XLSX.utils.book_new();

      // Tạo worksheet cho mỗi tuyến
      for (let i = 0; i < routeGroups.length; i++) {
        const route = routeGroups[i];
        const worksheet = this.createRouteWorksheet(route, i + 1);
        
        // Thêm worksheet vào workbook
        const sheetName = route.routeName || `Tuyen_${i + 1}`;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }

      // 4) Xuất file Excel
      const fileName = `Phieu_Bao_Lam_Them_Gio_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

    } catch (error) {
      console.error('Error exporting Excel:', error);
      throw error;
    }
  }

  /**
   * Lấy dữ liệu đăng ký hôm nay từ Firebase
   */
  private async getTodayRegistrations(): Promise<Registration[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const registrations = await this.firestoreService.getDangKyPhanXeByDateRange(startOfDay, endOfDay);
    
    return registrations.map((reg: any) => ({
      maNhanVien: reg.MaNhanVien,
      hoTen: reg.HoTen,
      dienThoai: reg.DienThoai,
      ngayDangKy: reg.NgayDangKy?.toDate?.()?.toISOString() || reg.NgayDangKy,
      thoiGianBatDau: reg.ThoiGianBatDau,
      thoiGianKetThuc: reg.ThoiGianKetThuc,
      loaiCa: reg.LoaiCa,
      noiDungCongViec: reg.NoiDungCongViec,
      dangKyCom: reg.DangKyCom,
      tramXe: reg.TramXe,
      maTuyenXe: reg.MaTuyenXe
    }));
  }

  /**
   * Gom nhóm theo tuyến với thông tin xe được phân công
   */
  private async groupRegistrationsByRouteWithVehicleAssignments(registrations: Registration[], vehicleAssignments: RouteVehicleAssignment[]): Promise<RouteInfo[]> {
    // Load station-route mapping from database
    await this.stationRouteMappingService.loadStationRouteMapping();
    
    const routeMap = new Map<string, RouteInfo>();

    for (const registration of registrations) {
      let finalRouteName = 'Chưa phân tuyến';
      
      // Map từ tramXe sử dụng database chiTietTuyenDuong
      if (registration.tramXe && registration.tramXe.trim() !== '') {
        const mappedRoute = this.stationRouteMappingService.getRouteForStation(registration.tramXe);
        if (mappedRoute) {
          finalRouteName = mappedRoute;
          console.log(`Excel Export - Mapped employee ${registration.hoTen} from station "${registration.tramXe}" to route "${mappedRoute}"`);
        } else {
          console.warn(`Excel Export - No route mapping found for station "${registration.tramXe}"`);
        }
      }
      
      // Áp dụng logic ưu tiên gom HCM routes và xử lý "tự túc"
      finalRouteName = this.applyHCMGroupingPriority(finalRouteName, registration.tramXe);
      
      if (!routeMap.has(finalRouteName)) {
        // Tìm thông tin xe được phân công cho tuyến này
        const vehicleAssignment = vehicleAssignments.find(va => va.routeCode === finalRouteName);
        
        const routeInfo: RouteInfo = {
          routeName: finalRouteName,
          registrations: []
        };

        // Cập nhật thông tin xe và tài xế từ vehicle assignment
        if (vehicleAssignment && vehicleAssignment.assignedVehicle.vehicleId) {
          // Lấy thông tin xe chi tiết từ Firebase để có tên tài xế và số điện thoại
          try {
            const vehicleDetails = await this.firestoreService.getXeDuaDonById(vehicleAssignment.assignedVehicle.vehicleId);
            
            if (vehicleDetails) {
              routeInfo.driverInfo = {
                name: vehicleDetails.TenTaiXe || 'TX ' + vehicleAssignment.assignedVehicle.vehicleId,
                phone: vehicleDetails.SoDienThoaiTaiXe || '0900000000',
                vehicleNumber: vehicleDetails.BienSoXe || vehicleAssignment.assignedVehicle.licensePlate
              };
            } else {
              // Fallback nếu không tìm thấy thông tin xe
              routeInfo.driverInfo = {
                name: 'TX ' + vehicleAssignment.assignedVehicle.vehicleId,
                phone: '0900000000',
                vehicleNumber: vehicleAssignment.assignedVehicle.licensePlate
              };
            }
          } catch (error) {
            console.error('Error getting vehicle details:', error);
            // Fallback nếu có lỗi
            routeInfo.driverInfo = {
              name: 'TX ' + vehicleAssignment.assignedVehicle.vehicleId,
              phone: '0900000000',
              vehicleNumber: vehicleAssignment.assignedVehicle.licensePlate
            };
          }
        }
        
        routeMap.set(finalRouteName, routeInfo);
      }

      routeMap.get(finalRouteName)!.registrations.push(registration);
    }

    // Convert to array and filter out routes with no employees and self-transport routes
    const routes = Array.from(routeMap.values()).filter(route => 
      route.registrations && 
      route.registrations.length > 0 &&
      route.routeName !== 'TỰ TÚC' // Exclude self-transport routes
    );

    // Sort routes according to the specified order: HCM01, HCM02, BH01, BH02, BH03, BH04
    const routeOrder = ['HCM01', 'HCM02', 'BH01', 'BH02', 'BH03', 'BH04'];
    
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

    // Áp dụng logic overflow HCM để đảm bảo tính nhất quán với PDF export
    const processedRoutes = await this.applyHCMOverflowLogicForExcel(routes);

    return processedRoutes;
  }

  /**
   * Apply HCM grouping priority logic - distribute evenly among HCM routes
   */
  private applyHCMGroupingPriority(routeName: string, tramXe: string): string {
    // Nếu là "tự túc", giữ nguyên
    if (tramXe && tramXe.toLowerCase().includes('tự túc')) {
      return 'TỰ TÚC';
    }

    // Nếu không phải HCM route, giữ nguyên
    if (!routeName.startsWith('HCM')) {
      return routeName;
    }

    // Áp dụng logic phân chia đều cho HCM routes
    return routeName; // Logic phân chia sẽ được xử lý trong applyHCMOverflowLogicForExcel
  }

  /**
   * Apply HCM overflow logic for Excel export
   */
  private async applyHCMOverflowLogicForExcel(routes: RouteInfo[]): Promise<RouteInfo[]> {
    const hcmRoutes = routes.filter(route => route.routeName.startsWith('HCM'));
    
    if (hcmRoutes.length === 0) {
      return routes;
    }

    const totalHCMEmployees = hcmRoutes.reduce((sum, route) => sum + (route.registrations?.length || 0), 0);
    console.log(`Excel Export - Total HCM employees: ${totalHCMEmployees}`);

    // Nếu tổng số nhân viên HCM <= 30, phân chia đều
    if (totalHCMEmployees <= 30) {
      return await this.distributeHCMEvenlyForExcel(routes, hcmRoutes);
    }

    // Nếu tổng số nhân viên HCM > 30, áp dụng logic overflow
    return routes; // TODO: Implement overflow logic if needed
  }

  /**
   * Distribute HCM employees evenly for Excel export - theo thứ tự trạm từ chiTietTuyenDuong
   */
  private async distributeHCMEvenlyForExcel(routes: RouteInfo[], hcmRoutes: RouteInfo[]): Promise<RouteInfo[]> {
    console.log('Excel Export - Applying even distribution logic for HCM routes...');
    const allHCMEmployees: Registration[] = [];
    hcmRoutes.forEach(route => {
      if (route.registrations) {
        allHCMEmployees.push(...route.registrations);
      }
    });
    console.log(`Excel Export - Total HCM employees to distribute: ${allHCMEmployees.length}`);
    
    // Sắp xếp nhân viên theo thứ tự trạm trong tuyến từ chiTietTuyenDuong
    const sortedHCMEmployees = await this.sortEmployeesByStationOrder(allHCMEmployees);
    console.log(`Excel Export - Sorted HCM employees by station order: ${sortedHCMEmployees.map(emp => `${emp.hoTen}(${emp.tramXe})`).join(', ')}`);
    
    const hcm01Employees: Registration[] = [];
    const hcm02Employees: Registration[] = [];
    const maxEmployeesPerRoute = 15;
    let currentRoute = 'HCM01';

    for (let i = 0; i < sortedHCMEmployees.length; i++) {
      const employee = sortedHCMEmployees[i];
      if (currentRoute === 'HCM01') {
        if (hcm01Employees.length < maxEmployeesPerRoute) {
          hcm01Employees.push(employee);
          console.log(`Excel Export - Assigned ${employee.hoTen} to HCM01 (${hcm01Employees.length}/${maxEmployeesPerRoute})`);
        } else {
          currentRoute = 'HCM02';
          hcm02Employees.push(employee);
          console.log(`Excel Export - HCM01 full, assigned ${employee.hoTen} to HCM02 (${hcm02Employees.length}/${maxEmployeesPerRoute})`);
        }
      } else if (currentRoute === 'HCM02') {
        if (hcm02Employees.length < maxEmployeesPerRoute) {
          hcm02Employees.push(employee);
          console.log(`Excel Export - Assigned ${employee.hoTen} to HCM02 (${hcm02Employees.length}/${maxEmployeesPerRoute})`);
        } else {
          console.log(`Excel Export - Both HCM routes full, employee ${employee.hoTen} will be handled by overflow logic`);
          break;
        }
      }
    }

    console.log(`Excel Export - Even distribution result: HCM01=${hcm01Employees.length}, HCM02=${hcm02Employees.length}`);

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
   * Sắp xếp nhân viên theo thứ tự trạm trong tuyến từ cache
   */
  private async sortEmployeesByStationOrder(employees: Registration[]): Promise<Registration[]> {
    try {
      if (!this.dataCacheService.isDataLoaded()) {
        console.warn('Excel Export - Data cache not loaded, returning employees without sorting');
        return employees;
      }

      // Sắp xếp nhân viên theo thứ tự trạm từ cache
      const sortedEmployees = [...employees].sort((a, b) => {
        const stationA = a.tramXe || '';
        const stationB = b.tramXe || '';
        
        // Tìm thứ tự trạm từ cache
        let orderA = 999;
        let orderB = 999;
        
        // Tìm thứ tự trạm từ HCM01
        const hcm01OrderA = this.dataCacheService.getStationOrderInRoute('HCM01', stationA);
        const hcm01OrderB = this.dataCacheService.getStationOrderInRoute('HCM01', stationB);
        if (hcm01OrderA !== null) orderA = hcm01OrderA;
        if (hcm01OrderB !== null) orderB = hcm01OrderB;
        
        // Nếu không tìm thấy trong HCM01, tìm trong HCM02
        if (orderA === 999 || orderB === 999) {
          const hcm02OrderA = this.dataCacheService.getStationOrderInRoute('HCM02', stationA);
          const hcm02OrderB = this.dataCacheService.getStationOrderInRoute('HCM02', stationB);
          if (hcm02OrderA !== null && orderA === 999) orderA = hcm02OrderA;
          if (hcm02OrderB !== null && orderB === 999) orderB = hcm02OrderB;
        }
        
        // Sắp xếp theo thứ tự trạm
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        
        // Fallback: sắp xếp theo tên nhân viên
        return a.hoTen.localeCompare(b.hoTen);
      });

      console.log(`Excel Export - Sorted ${sortedEmployees.length} employees by station order`);
      return sortedEmployees;
      
    } catch (error) {
      console.error('Excel Export - Error sorting employees by station order:', error);
      return employees;
    }
  }

  /**
   * Normalize station name for better matching
   */
  private normalizeStationName(stationName: string): string {
    if (!stationName) return '';
    
    return stationName
      .toLowerCase()
      .trim()
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Create worksheet for a specific route
   */
  private createRouteWorksheet(route: RouteInfo, routeNumber: number): XLSX.WorkSheet {
    const data: any[][] = [];

    // Header
    data.push(['PHIẾU BÁO LÀM THÊM GIỜ']);
    data.push([`Ngày ${new Date().toLocaleDateString('vi-VN')}`]);
    data.push([]);

    // Driver and vehicle info
    if (route.driverInfo) {
      data.push(['Giờ đón:', '19h15']);
      data.push(['Tài xế:', `${route.driverInfo.name} - ${route.driverInfo.phone}`]);
      data.push(['Xe:', route.driverInfo.vehicleNumber]);
      data.push([]);
    }

    // Table header
    data.push(['STT', 'Họ và tên', 'Trạm xe', 'Điện thoại', 'Thời gian làm việc', '', 'Ghi chú']);
    data.push(['', '', '', '', 'Từ...', 'Đến...', '']);

    // Employee data
    route.registrations.forEach((emp, index) => {
      data.push([
        index + 1,
        emp.hoTen,
        emp.tramXe,
        emp.dienThoai,
        emp.thoiGianBatDau,
        emp.thoiGianKetThuc,
        ''
      ]);
    });

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    const colWidths = [
      { wch: 5 },   // STT
      { wch: 25 },  // Họ và tên
      { wch: 20 },  // Trạm xe
      { wch: 15 },  // Điện thoại
      { wch: 12 },  // Từ...
      { wch: 12 },  // Đến...
      { wch: 15 }   // Ghi chú
    ];
    worksheet['!cols'] = colWidths;

    return worksheet;
  }
}
