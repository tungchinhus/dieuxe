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
   * preGroupedRoutes: dữ liệu đã được gom tuyến sẵn từ màn hình (ưu tiên dùng nếu có)
   */
  async exportOvertimeReportExcelWithVehicleAssignments(
    vehicleAssignments: RouteVehicleAssignment[],
    selectedDate?: Date,
    preGroupedRoutes?: RouteInfo[]
  ): Promise<void> {
    try {
      let routeGroups: RouteInfo[];

      if (preGroupedRoutes && preGroupedRoutes.length > 0) {
        // Sử dụng dữ liệu đã được gom tuyến sẵn từ màn hình (đảm bảo giống PDF/Dialog)
        routeGroups = await this.attachDriverInfoToRoutes(preGroupedRoutes, vehicleAssignments);
      } else {
        // 1) Lấy dữ liệu theo ngày đã chọn (fallback hôm nay)
        const todayRegistrations = selectedDate
          ? await this.getRegistrationsByDate(selectedDate)
          : await this.getTodayRegistrations();
        if (todayRegistrations.length === 0) {
          alert('Không có dữ liệu đăng ký cho ngày hôm nay');
          return;
        }

        // 2) Gom theo tuyến với thông tin xe được phân công
        routeGroups = await this.groupRegistrationsByRouteWithVehicleAssignments(todayRegistrations, vehicleAssignments);
      }

      // Kiểm tra có tuyến nào có nhân viên không
      if (!routeGroups || routeGroups.length === 0) {
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
   * Gắn thông tin xe/tài xế cho các tuyến đã được gom sẵn (từ dialog)
   */
  private async attachDriverInfoToRoutes(
    routeGroups: RouteInfo[],
    vehicleAssignments: RouteVehicleAssignment[]
  ): Promise<RouteInfo[]> {
    const enrichedRoutes: RouteInfo[] = [];

    for (const route of routeGroups) {
      const vehicleAssignment = vehicleAssignments.find(va => va.routeCode === route.routeName);

      const clonedRoute: RouteInfo = {
        routeName: route.routeName,
        registrations: route.registrations ? [...route.registrations] : [],
        driverInfo: route.driverInfo
          ? { ...route.driverInfo }
          : undefined
      };

      if (vehicleAssignment && vehicleAssignment.assignedVehicle?.vehicleId) {
        try {
          const vehicleDetails = await this.firestoreService.getXeDuaDonById(
            vehicleAssignment.assignedVehicle.vehicleId
          );

          if (vehicleDetails) {
            clonedRoute.driverInfo = {
              name: vehicleDetails.TenTaiXe || 'TX ' + vehicleAssignment.assignedVehicle.vehicleId,
              phone: vehicleDetails.SoDienThoaiTaiXe || '0900000000',
              vehicleNumber: vehicleDetails.BienSoXe || vehicleAssignment.assignedVehicle.licensePlate
            };
          } else {
            // Fallback nếu không tìm thấy thông tin xe
            clonedRoute.driverInfo = {
              name: 'TX ' + vehicleAssignment.assignedVehicle.vehicleId,
              phone: '0900000000',
              vehicleNumber: vehicleAssignment.assignedVehicle.licensePlate
            };
          }
        } catch (error) {
          console.error('Error getting vehicle details:', error);
          // Fallback nếu có lỗi
          clonedRoute.driverInfo = {
            name: 'TX ' + vehicleAssignment.assignedVehicle.vehicleId,
            phone: '0900000000',
            vehicleNumber: vehicleAssignment.assignedVehicle.licensePlate
          };
        }
      }

      enrichedRoutes.push(clonedRoute);
    }

    return enrichedRoutes;
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
    console.log('Excel Export - Applying HCM distribution logic (no split station + shared-station constraints)...');

    const maxEmployeesPerRoute = 15;
    const updatedRoutes = [...routes];

    // Snapshot: nhân viên từ các tuyến khác (không phải HCM01/HCM02) để bù HCM02 nếu thiếu
    const otherRoutesEmployeesSnapshot: Registration[] = [];
    updatedRoutes.forEach(r => {
      if (r.routeName !== 'HCM01' && r.routeName !== 'HCM02' && r.registrations?.length) {
        otherRoutesEmployeesSnapshot.push(...r.registrations);
      }
    });

    const allHCMEmployees: Registration[] = [];
    hcmRoutes.forEach(r => {
      if (r.registrations?.length) allHCMEmployees.push(...r.registrations);
    });
    console.log(`Excel Export - Total HCM employees to distribute: ${allHCMEmployees.length}`);

    const sortedHCMEmployees = await this.sortEmployeesByStationOrder(allHCMEmployees);

    const isThuDucStation = (tramXe: string | undefined): boolean => {
      const s = (tramXe || '').toLowerCase();
      return s.includes('ngã 4 thủ đức') || s.includes('nga 4 thu duc');
    };

    const isBvHoaHao = (tramXe: string | undefined): boolean => this.isBvHoaHaoStation(tramXe || '');

    const isHangXanhStation = (tramXe: string | undefined): boolean => {
      const s = (tramXe || '').toLowerCase();
      return s.includes('hàng xanh') || s.includes('hang xanh');
    };

    const isRMKStation = (tramXe: string | undefined): boolean => {
      const s = (tramXe || '').toLowerCase();
      return s.includes('rmk');
    };

    const getPreferredHCMRouteForStation = (tramXe: string | undefined): 'HCM01' | 'HCM02' => {
      const station = (tramXe || '').trim();
      if (isBvHoaHao(station)) return 'HCM01';
      if (isThuDucStation(station)) return 'HCM01'; // Ngã 4 Thủ Đức luôn về HCM01 (không tách)
      if (isHangXanhStation(station)) return 'HCM02'; // Hàng Xanh ưu tiên HCM02
      if (this.isSharedStation(station)) {
        // Shared: RMK có thể xuống HCM02 khi cần cân bằng, mặc định về HCM01
        return isRMKStation(station) ? 'HCM01' : 'HCM01';
      }
      if (this.isHCM02PriorityStation(station)) return 'HCM02';
      // Còn lại ưu tiên HCM01
      return 'HCM01';
    };

    const addedEmployeeIds = new Set<string>();
    const hcm01Employees: Registration[] = [];
    const hcm02Employees: Registration[] = [];

    const empKey = (e: Registration) => `${e.hoTen}_${e.tramXe}_${e.ngayDangKy}`;

    const addEmployee = (e: Registration, routeArr: Registration[], routeName: 'HCM01' | 'HCM02'): boolean => {
      const key = empKey(e);
      if (addedEmployeeIds.has(key)) return false;
      if (routeArr.length >= maxEmployeesPerRoute) return false;
      routeArr.push(e);
      addedEmployeeIds.add(key);
      return true;
    };

    const removeEmployeeFromRouteRegistrations = (e: Registration): void => {
      for (const r of updatedRoutes) {
        if (!r.registrations?.length) continue;
        const idx = r.registrations.findIndex(x =>
          x.hoTen === e.hoTen &&
          x.tramXe === e.tramXe &&
          x.ngayDangKy === e.ngayDangKy
        );
        if (idx >= 0) {
          r.registrations.splice(idx, 1);
          return;
        }
      }
    };

    // Group HCM employees by normalized station to avoid splitting
    const stationGroups = new Map<string, { stationRaw: string; employees: Registration[] }>();
    const stationOrder: string[] = [];
    for (const e of sortedHCMEmployees) {
      const stationRaw = (e.tramXe || '').trim();
      const key = this.normalizeStationName(stationRaw);
      if (!stationGroups.has(key)) {
        stationGroups.set(key, { stationRaw, employees: [] });
        stationOrder.push(key);
      }
      stationGroups.get(key)!.employees.push(e);
    }

    const tryAddGroup = (group: Registration[], dest: Registration[], destName: 'HCM01' | 'HCM02'): boolean => {
      if (dest.length + group.length > maxEmployeesPerRoute) return false;
      for (const e of group) {
        // group add: bypass capacity (checked) but still avoid duplicates
        const key = empKey(e);
        if (addedEmployeeIds.has(key)) continue;
        dest.push(e);
        addedEmployeeIds.add(key);
      }
      return true;
    };

    // Step 1: assign station groups by preference (no split unless forced)
    for (const key of stationOrder) {
      const groupInfo = stationGroups.get(key);
      if (!groupInfo) continue;
      const group = groupInfo.employees;
      const pref = getPreferredHCMRouteForStation(groupInfo.stationRaw);

      if (pref === 'HCM02') {
        if (!tryAddGroup(group, hcm02Employees, 'HCM02')) {
          if (!tryAddGroup(group, hcm01Employees, 'HCM01')) {
            console.warn(`Excel Export - WARNING: Cannot keep station "${groupInfo.stationRaw}" together within capacity, splitting as fallback.`);
            for (const e of group) {
              if (!addEmployee(e, hcm02Employees, 'HCM02')) addEmployee(e, hcm01Employees, 'HCM01');
            }
          }
        }
      } else {
        if (!tryAddGroup(group, hcm01Employees, 'HCM01')) {
          if (!tryAddGroup(group, hcm02Employees, 'HCM02')) {
            console.warn(`Excel Export - WARNING: Cannot keep station "${groupInfo.stationRaw}" together within capacity, splitting as fallback.`);
            for (const e of group) {
              if (!addEmployee(e, hcm01Employees, 'HCM01')) addEmployee(e, hcm02Employees, 'HCM02');
            }
          }
        }
      }
    }

    // Step 2: ensure HCM02 does NOT contain forbidden stations (shared trừ RMK, Thu Duc, BV Hoa Hao)
    for (let i = hcm02Employees.length - 1; i >= 0; i--) {
      const e = hcm02Employees[i];
      const station = (e.tramXe || '').trim();
      const isSharedButNotRMK = this.isSharedStation(station) && !isRMKStation(station);
      if (isBvHoaHao(station) || isThuDucStation(station) || isSharedButNotRMK) {
        hcm02Employees.splice(i, 1);
        const key = empKey(e);
        addedEmployeeIds.delete(key);
        if (!addEmployee(e, hcm01Employees, 'HCM01')) {
          // if HCM01 is full, re-add to HCM02 as overflow but warn
          hcm02Employees.push(e);
          addedEmployeeIds.add(key);
          console.warn(`Excel Export - WARNING: HCM01 full; cannot move employee "${e.hoTen}" (${e.tramXe}) out of HCM02.`);
        }
      }
    }

    // Step 3: if HCM02 thiếu người, ưu tiên chuyển từ HCM01 sang (chỉ trạm hợp lệ HCM02)
    const isValidForHCM02 = (tramXe: string | undefined): boolean => {
      const station = (tramXe || '').trim();
      // HCM02 nhận Hàng Xanh + HCM02 priority + RMK khi cần; không nhận BV Hòa Hảo, Thủ Đức, shared khác
      if (isBvHoaHao(station) || isThuDucStation(station)) return false;
      const isSharedNotRMK = this.isSharedStation(station) && !isRMKStation(station);
      if (isSharedNotRMK) return false;
      if (isRMKStation(station)) return true; // cho phép RMK xuống HCM02 khi cần
      return isHangXanhStation(station) || this.isHCM02PriorityStation(station);
    };

    const moveGroupFromHCM01ToHCM02 = (stationKey: string): boolean => {
      // collect group from HCM01 by normalized station
      const group = hcm01Employees.filter(e => this.normalizeStationName((e.tramXe || '').trim()) === stationKey);
      if (group.length === 0) return false;
      if (!isValidForHCM02(group[0].tramXe)) return false;
      if (hcm02Employees.length + group.length > maxEmployeesPerRoute) return false;

      // remove from HCM01
      for (let i = hcm01Employees.length - 1; i >= 0; i--) {
        const e = hcm01Employees[i];
        if (this.normalizeStationName((e.tramXe || '').trim()) === stationKey) {
          hcm01Employees.splice(i, 1);
          const key = empKey(e);
          addedEmployeeIds.delete(key);
        }
      }
      // add to HCM02
      for (const e of group) {
        addEmployee(e, hcm02Employees, 'HCM02');
      }
      return true;
    };

    const rebuildHCM01StationKeys = (): string[] => {
      const keys: string[] = [];
      const seen = new Set<string>();
      for (let i = hcm01Employees.length - 1; i >= 0; i--) {
        const k = this.normalizeStationName((hcm01Employees[i].tramXe || '').trim());
        if (!seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
      }
      return keys;
    };

    // Step 3b: nếu HCM01 vượt quá 15, chuyển bớt (ưu tiên RMK / HCM02 priority) sang HCM02
    const tryReduceHCM01 = (): void => {
      if (hcm01Employees.length <= maxEmployeesPerRoute) return;
      const priorityOrder = (stationKey: string): number => {
        const raw = stationKey;
        // ưu tiên đẩy RMK trước, sau đó các trạm HCM02 priority, sau đó khác
        if (isRMKStation(raw)) return 0;
        if (this.isHCM02PriorityStation(raw)) return 1;
        return 2;
      };

      // Build map stationKey -> group
      const groupsMap = new Map<string, Registration[]>();
      for (const e of hcm01Employees) {
        const k = this.normalizeStationName((e.tramXe || '').trim());
        if (!groupsMap.has(k)) groupsMap.set(k, []);
        groupsMap.get(k)!.push(e);
      }
      const keys = Array.from(groupsMap.keys()).sort((a, b) => priorityOrder(a) - priorityOrder(b));

      for (const k of keys) {
        if (hcm01Employees.length <= maxEmployeesPerRoute) break;
        const group = groupsMap.get(k) || [];
        if (group.length === 0) continue;
        if (!isValidForHCM02(group[0].tramXe)) continue; // BV Hòa Hảo/Thủ Đức/shared-other không được chuyển
        if (hcm02Employees.length + group.length > maxEmployeesPerRoute) continue;

        // move group
        for (let i = hcm01Employees.length - 1; i >= 0; i--) {
          const e = hcm01Employees[i];
          if (this.normalizeStationName((e.tramXe || '').trim()) === k) {
            hcm01Employees.splice(i, 1);
            const key = empKey(e);
            addedEmployeeIds.delete(key);
          }
        }
        for (const e of group) addEmployee(e, hcm02Employees, 'HCM02');
      }
    };

    tryReduceHCM01();

    while (hcm02Employees.length < maxEmployeesPerRoute) {
      const needed = maxEmployeesPerRoute - hcm02Employees.length;
      // try move from HCM01 first
      let movedAny = false;
      const candidateStationKeys = rebuildHCM01StationKeys();
      for (const k of candidateStationKeys) {
        if (hcm02Employees.length >= maxEmployeesPerRoute) break;
        if (moveGroupFromHCM01ToHCM02(k)) {
          movedAny = true;
          if (maxEmployeesPerRoute - hcm02Employees.length <= 0) break;
        }
      }
      if (movedAny) continue;

      // Step 4: still thiếu -> lấy từ tuyến khác (snapshot) theo trạm hợp lệ HCM02
      const availableFromOtherRoutes = otherRoutesEmployeesSnapshot.filter(e => {
        const key = empKey(e);
        return !addedEmployeeIds.has(key) && isValidForHCM02(e.tramXe);
      });

      if (availableFromOtherRoutes.length === 0) {
        console.log(`Excel Export - No compatible employees found from other routes to fill HCM02 (still missing ${needed}).`);
        break;
      }

      const sortedCandidates = await this.sortEmployeesByStationOrder(availableFromOtherRoutes);

      // add by station group (avoid split if possible)
      const candidateGroups = new Map<string, Registration[]>();
      const candidateOrder: string[] = [];
      for (const e of sortedCandidates) {
        const k = this.normalizeStationName((e.tramXe || '').trim());
        if (!candidateGroups.has(k)) {
          candidateGroups.set(k, []);
          candidateOrder.push(k);
        }
        candidateGroups.get(k)!.push(e);
      }

      let added = false;
      for (const k of candidateOrder) {
        if (hcm02Employees.length >= maxEmployeesPerRoute) break;
        const group = candidateGroups.get(k) || [];
        if (group.length === 0) continue;
        if (hcm02Employees.length + group.length > maxEmployeesPerRoute) continue;

        // add the group
        for (const e of group) {
          if (addEmployee(e, hcm02Employees, 'HCM02')) {
            removeEmployeeFromRouteRegistrations(e);
            added = true;
          }
        }
      }

      if (!added) {
        // fallback: add individuals if no group fits
        for (const e of sortedCandidates) {
          if (hcm02Employees.length >= maxEmployeesPerRoute) break;
          if (addEmployee(e, hcm02Employees, 'HCM02')) {
            removeEmployeeFromRouteRegistrations(e);
            added = true;
          }
        }
      }

      if (!added) break;
    }

    console.log(`Excel Export - Final distribution result: HCM01=${hcm01Employees.length}, HCM02=${hcm02Employees.length}`);

    const hcm01Index = updatedRoutes.findIndex(r => r.routeName === 'HCM01');
    const hcm02Index = updatedRoutes.findIndex(r => r.routeName === 'HCM02');
    if (hcm01Index >= 0) updatedRoutes[hcm01Index].registrations = await this.sortEmployeesByStationOrder(hcm01Employees);
    if (hcm02Index >= 0) updatedRoutes[hcm02Index].registrations = await this.sortEmployeesByStationOrder(hcm02Employees);

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
    // RMK thuộc tuyến HCM (HCM01/HCM02), mặc định ưu tiên HCM01 - đồng bộ với PDF export
    const priorities = ['đinh tiên hoàng', 'dinh tien hoang', 'hai bà trưng', 'hai ba trung', 'ngã 4 thủ đức', 'nga 4 thu duc', 'hàng xanh', 'hang xanh', 'hàng xanh (gần văn thánh)', 'hang xanh (gan van thanh)', 'rmk'];
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
