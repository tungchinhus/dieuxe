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
  async exportOvertimeReportExcelWithVehicleAssignments(vehicleAssignments: RouteVehicleAssignment[], selectedDate?: Date): Promise<void> {
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
        alert('Không có dữ liệu nhân viên để xuất Excel');
        return;
      }

      // 3) Tạo Excel workbook với ONE sheet chứa tất cả tuyến
      const workbook = XLSX.utils.book_new();
      const worksheet = await this.createSingleSheetWithAllRoutes(routeGroups);

      // Thêm worksheet vào workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh Sach Phu Troi');

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
   */
  private async groupRegistrationsByRouteWithVehicleAssignments(registrations: Registration[], vehicleAssignments: RouteVehicleAssignment[]): Promise<RouteInfo[]> {
    // Load station-route mapping from database
    await this.stationRouteMappingService.loadStationRouteMapping();
    
    const routeMap = new Map<string, RouteInfo>();

    for (const registration of registrations) {
      let finalRouteName = 'Chưa phân tuyến';
      
      // Áp dụng logic ưu tiên gom HCM routes TRƯỚC khi check database
      // Điều này đảm bảo các trạm ưu tiên như "Hàng Xanh (Gần Văn Thánh)" được gán đúng vào HCM01
      if (registration.tramXe && registration.tramXe.trim() !== '') {
        // Kiểm tra trạm ưu tiên HCM01 trước (bao gồm Hàng Xanh)
        if (this.isHCM01PriorityStation(registration.tramXe)) {
          finalRouteName = 'HCM01';
          console.log(`Excel Export - Station "${registration.tramXe}" is HCM01 priority, assigned to HCM01`);
        } else if (this.isHCM02PriorityStation(registration.tramXe)) {
          finalRouteName = 'HCM02';
          console.log(`Excel Export - Station "${registration.tramXe}" is HCM02 priority, assigned to HCM02`);
        } else {
          // Nếu không phải trạm ưu tiên, mới check database
          const mappedRoute = this.stationRouteMappingService.getRouteForStation(registration.tramXe);
          if (mappedRoute) {
            finalRouteName = mappedRoute;
            console.log(`Excel Export - Mapped employee ${registration.hoTen} from station "${registration.tramXe}" to route "${mappedRoute}" from database`);
          } else {
            console.warn(`Excel Export - No route mapping found for station "${registration.tramXe}"`);
          }
        }
      }
      
      // Áp dụng logic ưu tiên gom HCM routes và xử lý "tự túc" (cho các trường hợp đặc biệt)
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

    // Convert to array and filter out routes with no employees
    // Bổ sung: Bao gồm cả nhân viên tự túc (tục túc) trong Excel export
    const routes = Array.from(routeMap.values()).filter(route => 
      route.registrations && 
      route.registrations.length > 0
    );

    // Sort routes according to the specified order: HCM01, HCM02, BH01, BH02, BH03, TỰ TÚC
    const routeOrder = ['HCM01', 'HCM02', 'BH01', 'BH02', 'BH03', 'TỰ TÚC'];
    
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

    // Áp dụng logic phân chia tương tự cho các tuyến Biên Hòa (like PDF)
    const finalRoutes = await this.applyBHDistributionLogic(processedRoutes);

    return finalRoutes;
  }

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

    // QUAN TRỌNG: Kiểm tra trạm ưu tiên HCM01 TRƯỚC HCM02 để đảm bảo "Hàng Xanh (Gần Văn Thánh)" luôn vào HCM01
    // Ngay cả khi database trả về HCM02, logic này sẽ override
    if (this.isHCM01PriorityStation(tramXe)) {
      console.log(`Excel Export - Overriding route from "${routeName}" to "HCM01" for station "${tramXe}" (HCM01 priority)`);
      return 'HCM01';
    }

    // Kiểm tra nếu là trạm ưu tiên cho HCM02
    if (this.isHCM02PriorityStation(tramXe)) {
      return 'HCM02';
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
    // Use the same logic as PDF export to ensure consistency
    console.log('Excel Export - Applying even distribution logic for HCM routes with specific station transfers...');
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
    
    // Phân loại nhân viên theo trạm để xử lý chuyển đổi
    // QUAN TRỌNG: Tách riêng BV Hòa Hảo để đảm bảo luôn ở HCM01
    const bvHoaHaoEmployees: Registration[] = [];
    const employeesToMoveToHCM01: Registration[] = [];
    const employeesToMoveToHCM02: Registration[] = [];
    const sharedStationEmployees: Registration[] = []; // Separate shared stations from HCM02 priority
    const otherEmployees: Registration[] = [];
    
    sortedHCMEmployees.forEach(employee => {
      const station = employee.tramXe?.toLowerCase() || '';
      
      // QUAN TRỌNG: Tách riêng BV Hòa Hảo - phải luôn ở HCM01
      if (this.isBvHoaHaoStation(employee.tramXe)) {
        console.log(`Excel Export - Classifying employee ${employee.hoTen} from station "${employee.tramXe}" as BV Hòa Hảo (must be in HCM01)`);
        bvHoaHaoEmployees.push(employee);
      }
      // QUAN TRỌNG: Kiểm tra HCM01 priority TRƯỚC (bao gồm Hàng Xanh, nhưng không bao gồm BV Hòa Hảo vì đã tách riêng)
      else if (this.isHCM01PriorityStation(employee.tramXe)) {
        console.log(`Excel Export - Moving employee ${employee.hoTen} from station "${employee.tramXe}" to HCM01 (HCM01 priority)`);
        employeesToMoveToHCM01.push(employee);
      } 
      // Kiểm tra HCM02 priority (như Chợ Gò Vấp)
      else if (this.isHCM02PriorityStation(employee.tramXe)) {
        console.log(`Excel Export - Moving employee ${employee.hoTen} from station "${employee.tramXe}" to HCM02 (HCM02 priority)`);
        employeesToMoveToHCM02.push(employee);
      }
      // Kiểm tra shared stations (các trạm chung như RMK)
      else if (this.isSharedStation(station)) {
        sharedStationEmployees.push(employee);
      } else {
        otherEmployees.push(employee);
      }
    });
    
    console.log(`Excel Export - Employee classification: BV Hòa Hảo=${bvHoaHaoEmployees.length}, To HCM01=${employeesToMoveToHCM01.length}, To HCM02=${employeesToMoveToHCM02.length}, Shared=${sharedStationEmployees.length}, Other=${otherEmployees.length}`);
    
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
        return true;
      }
      return false;
    };
    
    // Bước 1: Thêm nhân viên từ các trạm ưu tiên HCM01 (không bao gồm BV Hòa Hảo) vào HCM01
    const sortedHCM01Priority = await this.sortEmployeesByStationOrder(employeesToMoveToHCM01);
    for (const employee of sortedHCM01Priority) {
      if (!addToRoute(employee, hcm01Employees, 'HCM01')) {
        // HCM01 is full, add to HCM02 instead
        addToRoute(employee, hcm02Employees, 'HCM02');
      }
    }
    
    // Bước 2: Thêm nhân viên từ các trạm ưu tiên HCM02 vào HCM02
    const sortedHCM02Priority = await this.sortEmployeesByStationOrder(employeesToMoveToHCM02);
    for (const employee of sortedHCM02Priority) {
      if (!addToRoute(employee, hcm02Employees, 'HCM02')) {
        // HCM02 is full, add to HCM01 instead
        addToRoute(employee, hcm01Employees, 'HCM01');
      }
    }
    
    // Bước 3: Thêm nhân viên từ các trạm chung (shared stations như RMK) vào HCM01 trước, sau đó HCM02
    const sortedSharedEmployees = await this.sortEmployeesByStationOrder(sharedStationEmployees);
    // Ưu tiên đặc biệt: Ngã 3 Bến Gỗ phải được đưa vào HCM01 trước
    const isBenGo = (s: string | undefined) => (s || '').toLowerCase().includes('ngã 3 bến gỗ') || (s || '').toLowerCase().includes('nga 3 ben go');
    const benGoShared = sortedSharedEmployees.filter(emp => isBenGo(emp.tramXe));
    const otherShared = sortedSharedEmployees.filter(emp => !isBenGo(emp.tramXe));

    for (const employee of [...benGoShared, ...otherShared]) {
      if (!addToRoute(employee, hcm01Employees, 'HCM01')) {
        // HCM01 is full, add to HCM02 instead
        addToRoute(employee, hcm02Employees, 'HCM02');
      }
    }
    
    // Bước 4: Thêm nhân viên khác vào HCM01, sau đó HCM02
    const sortedOtherEmployees = await this.sortEmployeesByStationOrder(otherEmployees);
    for (const employee of sortedOtherEmployees) {
      if (!addToRoute(employee, hcm01Employees, 'HCM01')) {
        // HCM01 is full, add to HCM02 instead
        addToRoute(employee, hcm02Employees, 'HCM02');
      }
    }
    
    // Bước 5: QUAN TRỌNG - Đảm bảo tất cả nhân viên từ BV Hòa Hảo được đưa vào HCM01
    // Nếu HCM01 đầy, chuyển nhân viên từ các trạm chung (shared stations) từ HCM01 sang HCM02 để tạo chỗ trống
    const sortedBvHoaHaoEmployees = await this.sortEmployeesByStationOrder(bvHoaHaoEmployees);
    for (const employee of sortedBvHoaHaoEmployees) {
      if (!addToRoute(employee, hcm01Employees, 'HCM01')) {
        // HCM01 is full, cần chuyển nhân viên từ trạm chung từ HCM01 sang HCM02 để tạo chỗ trống
        console.log(`Excel Export - HCM01 is full, moving shared station employees from HCM01 to HCM02 to make room for BV Hòa Hảo employee ${employee.hoTen}`);
        
        // Tìm nhân viên từ trạm chung trong HCM01 để chuyển sang HCM02
        let moved = false;
        for (let i = hcm01Employees.length - 1; i >= 0; i--) {
          const empInHCM01 = hcm01Employees[i];
          const stationLower = (empInHCM01.tramXe || '').toLowerCase();
          
          // Chỉ chuyển nhân viên từ trạm chung (shared stations)
          if (this.isSharedStation(stationLower)) {
            if (moveFromRoute(empInHCM01, hcm01Employees, hcm02Employees)) {
              console.log(`Excel Export - Moved shared station employee ${empInHCM01.hoTen} from HCM01 to HCM02 to make room for BV Hòa Hảo`);
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
          console.warn(`Excel Export - WARNING: Could not make room in HCM01 for BV Hòa Hảo employee ${employee.hoTen}, adding anyway (overflow)`);
          hcm01Employees.push(employee);
          addedEmployeeIds.add(`${employee.hoTen}_${employee.tramXe}_${employee.ngayDangKy}`);
        }
      }
    }
    
    // Bước 6: Đảm bảo tất cả nhân viên được thêm vào (overflow handling - nếu cả 2 tuyến đều đầy, vẫn thêm vào)
    const allEmployees = [...sortedHCM01Priority, ...sortedHCM02Priority, ...sortedSharedEmployees, ...sortedOtherEmployees, ...sortedBvHoaHaoEmployees];
    for (const employee of allEmployees) {
      const empId = `${employee.hoTen}_${employee.tramXe}_${employee.ngayDangKy}`;
      if (!addedEmployeeIds.has(empId)) {
        // Not yet added, try to add to HCM02 first, then HCM01
        if (!addToRoute(employee, hcm02Employees, 'HCM02')) {
          // HCM02 is also full, add to HCM01 anyway (overflow)
          if (!addToRoute(employee, hcm01Employees, 'HCM01')) {
            // Both routes are full, add to HCM02 anyway to ensure no employee is lost
            hcm02Employees.push(employee);
            addedEmployeeIds.add(empId);
          }
        }
      }
    }

    console.log(`Excel Export - Final distribution result: HCM01=${hcm01Employees.length}, HCM02=${hcm02Employees.length}`);
    console.log(`Excel Export - HCM01 final order:`, hcm01Employees.map(emp => `${emp.hoTen}(${emp.tramXe})`).join(', '));
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
   * Create single sheet with all routes and stations grouped (like PDF)
   */
  private async createSingleSheetWithAllRoutes(routeGroups: RouteInfo[]): Promise<XLSX.WorkSheet> {
    const data: any[][] = [];
    
    // Header
    data.push(['PHIẾU BÁO LÀM THÊM GIỜ']);
    data.push([`Ngày ${new Date().toLocaleDateString('vi-VN')}`]);
    data.push([]);
    
    // Table header - matching template order: STT, Họ và tên, Trạm xe, Điện thoại, (Empty), Từ..., Đến...
    data.push(['STT', 'Họ và tên', 'Trạm xe', 'Điện thoại', '', 'Từ...', 'Đến...']);
    
    // Iterate through each route
    for (const route of routeGroups) {
      if (!route.registrations || route.registrations.length === 0) {
        continue;
      }
      
      // Reset STT counter to 1 for each route
      let routeSttCounter = 1;
      
      // Group employees by station
      const groupedByStation = await this.groupRegistrationsByStation(route.registrations);
      
      // Add route header
      data.push([]);
      const routeHeaderText = `TUYẾN: ${route.routeName}`;
      if (route.driverInfo) {
        data.push([`${routeHeaderText} | Tài xế: ${route.driverInfo.name} | SĐT: ${route.driverInfo.phone} | Xe: ${route.driverInfo.vehicleNumber}`, '', '', '', '', '', '']);
      } else {
        data.push([routeHeaderText, '', '', '', '', '', '']);
      }
      
      // Iterate through stations
      for (const [station, employees] of Object.entries(groupedByStation)) {
        // Keep employees in their original order (already sorted by station order from database)
        // DO NOT sort alphabetically - use the original order as provided
        for (const emp of employees) {
          // Ensure correct data mapping - verify each field
          const hoTen = String(emp.hoTen || '').trim(); // Họ và tên - Column B (must be name)
          const tramXe = String(emp.tramXe || '').trim(); // Trạm xe - Column C (must be station)
          const dienThoai = String(emp.dienThoai || '').trim(); // Điện thoại - Column D (must be phone)
          const thoiGianBatDau = String(emp.thoiGianBatDau || '').trim(); // Từ... - Column F
          const thoiGianKetThuc = String(emp.thoiGianKetThuc || '').trim(); // Đến... - Column G
          
          // #region agent log
          if(hoTen&&hoTen.includes('Trần Thanh Hùng')){fetch('http://127.0.0.1:7242/ingest/a8508535-ed0c-4922-87ac-bc19c30df599',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'excel-export.service.ts:561',message:'Writing Trần Thanh Hùng to Excel',data:{routeName:route.routeName,station,hoTen,tramXe,dienThoai,thoiGianBatDau,thoiGianKetThuc,routeSttCounter},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});}
          // #endregion
          
          // Debug: Verify data before pushing
          if (hoTen && hoTen.match(/^\d+$/)) {
            console.warn('Excel Export - WARNING: Column B (Họ và tên) contains number:', hoTen, 'Employee:', emp);
          }
          if (dienThoai && !dienThoai.match(/^[\d\s\-\+\(\)]+$/)) {
            console.warn('Excel Export - WARNING: Column D (Điện thoại) does not look like phone:', dienThoai, 'Employee:', emp);
          }
          
          data.push([
            routeSttCounter++,
            hoTen, // Họ và tên - Column B
            tramXe, // Trạm xe - Column C
            dienThoai, // Điện thoại - Column D
            '', // Empty column - Column E
            thoiGianBatDau, // Từ... - Column F
            thoiGianKetThuc // Đến... - Column G
          ]);
        }
      }
    }
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths - matching template order
    const colWidths = [
      { wch: 5 },   // STT
      { wch: 20 },  // Họ và tên
      { wch: 30 },  // Trạm xe
      { wch: 12 },  // Điện thoại
      { wch: 10 },  // Empty column
      { wch: 10 },  // Từ...
      { wch: 10 }   // Đến...
    ];
    worksheet['!cols'] = colWidths;
    
    return worksheet;
  }
  
  /**
   * Group registrations by station
   */
  private async groupRegistrationsByStation(registrations: Registration[]): Promise<{ [station: string]: Registration[] }> {
    const grouped: { [station: string]: Registration[] } = {};
    
    for (const reg of registrations) {
      const station = reg.tramXe || 'Chưa phân trạm';
      
      if (!grouped[station]) {
        grouped[station] = [];
      }
      grouped[station].push(reg);
    }
    
    // Sort stations within the route
    const sortedGrouped = await this.sortStationsByOrder(grouped);
    
    return sortedGrouped;
  }
  
  /**
   * Sort stations by order (similar to PDF logic)
   */
  private async sortStationsByOrder(grouped: { [station: string]: Registration[] }): Promise<{ [station: string]: Registration[] }> {
    try {
      if (!this.dataCacheService.isDataLoaded()) {
        return grouped;
      }
      
      // Get route details from cache
      const routeDetails = this.dataCacheService.getRouteDetails();
      
      if (!routeDetails || routeDetails.length === 0) {
        return grouped;
      }
      
      // Create station order map from cache
      const stationOrderMap = new Map<string, number>();
      
      routeDetails.forEach((detail: any) => {
        const stationName = detail.tenDiemDon;
        const order = detail.thuTu;
        stationOrderMap.set(stationName, order);
        // Also store normalized name
        stationOrderMap.set(this.normalizeStationName(stationName), order);
      });
      
      // Sort stations by their order
      const sortedEntries = Object.entries(grouped).sort(([stationA], [stationB]) => {
        const orderA = stationOrderMap.get(stationA) || stationOrderMap.get(this.normalizeStationName(stationA)) || 999;
        const orderB = stationOrderMap.get(stationB) || stationOrderMap.get(this.normalizeStationName(stationB)) || 999;
        return orderA - orderB;
      });
      
      // Convert back to object
      const sortedGrouped: { [station: string]: Registration[] } = {};
      sortedEntries.forEach(([station, registrations]) => {
        sortedGrouped[station] = registrations;
      });
      
      return sortedGrouped;
      
    } catch (error) {
      console.error('Error sorting stations:', error);
      return grouped;
    }
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

    // Table header - matching template order
    data.push(['STT', 'Họ và tên', 'Trạm xe', 'Điện thoại', '', 'Thời gian làm việc', '']);
    data.push(['', '', '', '', '', 'Từ...', 'Đến...']);

    // Employee data - matching template order
    route.registrations.forEach((emp, index) => {
      data.push([
        index + 1,
        emp.hoTen,
        emp.tramXe,
        emp.dienThoai,
        '', // Empty column to match template
        emp.thoiGianBatDau,
        emp.thoiGianKetThuc
      ]);
    });

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths - matching template order
    const colWidths = [
      { wch: 5 },   // STT
      { wch: 20 },  // Họ và tên
      { wch: 30 },  // Trạm xe
      { wch: 12 },  // Điện thoại
      { wch: 10 },  // Empty column
      { wch: 10 },  // Từ...
      { wch: 10 }   // Đến...
    ];
    worksheet['!cols'] = colWidths;

    return worksheet;
  }

  /**
   * Kiểm tra xem trạm có phải là trạm cần chuyển lên HCM01 không
   * Bao gồm tất cả các trạm ưu tiên HCM01, đặc biệt là "Hàng Xanh (Gần Văn Thánh)"
   */
  private isTargetStationForHCM01(station: string): boolean {
    if (!station) return false;
    
    // Sử dụng hàm isHCM01PriorityStation để đảm bảo nhất quán
    return this.isHCM01PriorityStation(station);
  }

  /**
   * Kiểm tra xem trạm có phải là trạm chung giữa 2 tuyến không
   * Lưu ý: Hàng Xanh (Gần Văn Thánh) chỉ thuộc HCM01, không phải trạm chung
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
      'nga 3 cat lai'
    ];
    
    return sharedStations.some(sharedStation => 
      stationLower.includes(sharedStation) || sharedStation.includes(stationLower)
    );
  }

  /**
   * Kiểm tra xem trạm có phải là Ngã 3 Hãng dầu không
   */
  private isNga3HangDauStation(station: string): boolean {
    if (!station) return false;
    const stationLower = station.toLowerCase();
    const variations = ['ngã 3 hãng dầu', 'nga 3 hang dau', 'ngã 3 hàng dầu', 'nga 3 hang dau', 'hãng dầu', 'hang dau', 'hàng dầu', 'hang dau'];
    return variations.some(v => stationLower.includes(v) || v.includes(stationLower));
  }

  /**
   * Kiểm tra xem trạm có phải là "Ngã 3 Bến Gỗ" hoặc "Ngã 3 Long Bình Tân" không
   * Các trạm này được ưu tiên vào tuyến Biên Hòa để tối ưu chi phí
   */
  private isBenGoOrLongBinhTanStation(station: string): boolean {
    if (!station) return false;
    const stationLower = station.toLowerCase();
    const priorityStations = ['ngã 3 bến gỗ', 'nga 3 ben go', 'ngã 3 long bình tân', 'nga 3 long binh tan'];
    return priorityStations.some(p => stationLower.includes(p) || p.includes(stationLower));
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
   * Kiểm tra xem trạm có phải là trạm ưu tiên cho HCM01 không
   * Cập nhật: HCM01 bao gồm Đinh Tiên Hoàng-ĐBP, Hai Bà Trưng-ĐBP, Ngã 4 Thủ Đức, Hàng Xanh
   * Lưu ý: BV Hòa Hảo được xử lý riêng bằng isBvHoaHaoStation
   * (Đã loại bỏ "Ngã 3 Bến Gỗ" và "Ngã 3 Long Bình Tân" - ưu tiên vào BH)
   */
  private isHCM01PriorityStation(station: string): boolean {
    if (!station) return false;
    // Loại bỏ BV Hòa Hảo vì đã được xử lý riêng
    if (this.isBvHoaHaoStation(station)) {
      return false;
    }
    const stationLower = station.toLowerCase();
    const priorities = ['đinh tiên hoàng', 'dinh tien hoang', 'hai bà trưng', 'hai ba trung', 'ngã 4 thủ đức', 'nga 4 thu duc', 'hàng xanh', 'hang xanh', 'hàng xanh (gần văn thánh)', 'hang xanh (gan van thanh)'];
    return priorities.some(p => stationLower.includes(p) || p.includes(stationLower));
  }

  /**
   * Kiểm tra xem trạm có phải là trạm ưu tiên cho HCM02 không
   */
  private isHCM02PriorityStation(station: string): boolean {
    if (!station) return false;
    const stationLower = station.toLowerCase();
    const priorities = ['bà chiểu', 'ba chieu', 'chợ gò vấp', 'cho go vap', 'gò vấp', 'go vap', 'hóc môn', 'hoc mon', 'chùa hoằng pháp', 'chua hoang phap', 'trường lý tự trọng', 'truong ly tu trong'];
    return priorities.some(p => stationLower.includes(p) || p.includes(stationLower));
  }

  /**
   * Apply BH distribution logic
   */
  private async applyBHDistributionLogic(routes: RouteInfo[]): Promise<RouteInfo[]> {
    return routes; // Stub - returns routes as-is for now
  }
}
