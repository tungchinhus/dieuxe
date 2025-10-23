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
  async exportOvertimeReportPDFWithVehicleAssignments(vehicleAssignments: RouteVehicleAssignment[]): Promise<void> {
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

        const htmlContent = await this.generateOvertimeReportHTMLTemplate(route);
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
   * Gom nhóm theo tuyến với thông tin xe được phân công
   */
  private async groupRegistrationsByRouteWithVehicleAssignments(registrations: Registration[], vehicleAssignments: RouteVehicleAssignment[]): Promise<RouteInfo[]> {
    const routeMap = new Map<string, RouteInfo>();

    for (const registration of registrations) {
      let finalRouteName = 'Chưa phân tuyến';
      
      // Map từ tramXe sử dụng cache
      if (registration.tramXe && registration.tramXe.trim() !== '') {
        const mappedRoute = this.dataCacheService.getRouteForStation(registration.tramXe);
        if (mappedRoute) {
          finalRouteName = mappedRoute;
          console.log(`PDF Export - Mapped employee ${registration.hoTen} from station "${registration.tramXe}" to route "${mappedRoute}"`);
        } else {
          console.warn(`PDF Export - No route mapping found for station "${registration.tramXe}"`);
        }
      }
      
      // Áp dụng logic ưu tiên gom HCM routes và xử lý "tự túc"
      finalRouteName = this.applyHCMGroupingPriority(finalRouteName, registration.tramXe);
      
      if (!routeMap.has(finalRouteName)) {
        // Tìm thông tin xe được phân công cho tuyến này
        const vehicleAssignment = vehicleAssignments.find(va => va.routeCode === finalRouteName);
        
        const routeInfo = await this.determineRouteFromCode(finalRouteName, registration.hoTen);
        
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
        
        routeInfo.registrations = [];
        routeMap.set(finalRouteName, routeInfo);
      }

      routeMap.get(finalRouteName)!.registrations!.push(registration);
    }

    const routes = Array.from(routeMap.values());
    return this.sortRoutesByPriority(routes);
  }

  /**
   * Gom nhóm theo tuyến dựa trên mã tuyến xe
   */
  private async groupRegistrationsByRoute(registrations: Registration[]): Promise<RouteInfo[]> {
    const routeMap = new Map<string, RouteInfo>();

    for (const reg of registrations) {
      let finalRouteName = 'Chưa phân tuyến';
      
      // Map từ tramXe sử dụng cache
      if (reg.tramXe && reg.tramXe.trim() !== '') {
        const mappedRoute = this.dataCacheService.getRouteForStation(reg.tramXe);
        if (mappedRoute) {
          finalRouteName = mappedRoute;
          console.log(`PDF Export - Mapped employee ${reg.hoTen} from station "${reg.tramXe}" to route "${mappedRoute}"`);
        } else {
          console.warn(`PDF Export - No route mapping found for station "${reg.tramXe}"`);
        }
      }

      // Áp dụng logic ưu tiên gom HCM routes vào HCM01
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

    // Sắp xếp theo thứ tự cụ thể và tính toán phân loại xe
    const routeArray = Array.from(routeMap.values());
    const sortedRoutes = this.sortRoutesByPriority(routeArray);
    
    // Áp dụng logic overflow cho HCM nếu tổng > 30 nhân viên
    const finalRoutes = await this.applyHCMOverflowLogic(sortedRoutes);
    
    // Áp dụng logic fill HCM02 nếu < 15 người
    const finalRoutesWithHCM02Fill = await this.applyHCM02FillLogic(finalRoutes);
    
    // Tính toán phân loại xe cho từng tuyến
    return this.calculateVehicleAllocation(finalRoutesWithHCM02Fill);
  }

  /**
   * Áp dụng logic fill HCM02 nếu < 15 người:
   * - Chuyển nhân viên từ các trạm "Ngã 3 long Bình Tân", "Ngã 4 Thủ Đức", "Bà Chiểu" từ BH sang HCM02
   * - Mục tiêu: HCM02 có đủ 15 người cho xe 16 chỗ
   */
  private async applyHCM02FillLogic(routes: RouteInfo[]): Promise<RouteInfo[]> {
    // Tìm HCM02 route
    const hcm02Index = routes.findIndex(r => r.routeName === 'HCM02');
    if (hcm02Index === -1) {
      return routes; // Không có HCM02, không cần xử lý
    }
    
    const hcm02Route = routes[hcm02Index];
    const currentHCM02Count = hcm02Route.registrations?.length || 0;
    
    console.log(`HCM02 current count: ${currentHCM02Count}`);
    
    // Nếu HCM02 đã có >= 15 người, không cần fill
    if (currentHCM02Count >= 15) {
      console.log('HCM02 already has enough people (>= 15), no need to fill');
      return routes;
    }
    
    const targetCount = 15;
    const neededCount = targetCount - currentHCM02Count;
    
    console.log(`HCM02 needs ${neededCount} more people to reach 15`);
    
    // Tìm nhân viên từ các trạm mục tiêu trong BH routes
    const targetStations = [
      'ngã 3 long bình tân',
      'nga 3 long binh tan',
      'ngã 4 thủ đức',
      'nga 4 thu duc',
      'bà chiểu',
      'ba chieu'
    ];
    
    const employeesToMove: Registration[] = [];
    const updatedRoutes = [...routes];
    
    // Tìm nhân viên từ BH routes có trạm mục tiêu
    updatedRoutes.forEach((route, routeIndex) => {
      if (route.routeName.startsWith('BH') && route.registrations) {
        const employeesToRemove: Registration[] = [];
        
        route.registrations.forEach(employee => {
          const stationName = this.normalizeStationName(employee.tramXe);
          
          // Kiểm tra xem trạm có khớp với trạm mục tiêu không
          const isTargetStation = targetStations.some(targetStation => 
            stationName.includes(targetStation) || targetStation.includes(stationName)
          );
          
          if (isTargetStation && employeesToMove.length < neededCount) {
            console.log(`Moving employee ${employee.hoTen} from ${employee.tramXe} (${route.routeName}) to HCM02`);
            employeesToMove.push(employee);
            employeesToRemove.push(employee);
          }
        });
        
        // Xóa nhân viên đã chuyển khỏi BH route
        if (employeesToRemove.length > 0) {
          updatedRoutes[routeIndex].registrations = route.registrations.filter(
            emp => !employeesToRemove.includes(emp)
          );
        }
      }
    });
    
    console.log(`Found ${employeesToMove.length} employees to move to HCM02`);
    
    // Thêm nhân viên vào HCM02
    if (employeesToMove.length > 0) {
      if (!updatedRoutes[hcm02Index].registrations) {
        updatedRoutes[hcm02Index].registrations = [];
      }
      updatedRoutes[hcm02Index].registrations!.push(...employeesToMove);
      
      const newHCM02Count = updatedRoutes[hcm02Index].registrations!.length;
      console.log(`HCM02 new count: ${newHCM02Count}`);
    }
    
    // Loại bỏ các BH routes không còn nhân viên
    const finalRoutes = updatedRoutes.filter(route => 
      !route.routeName.startsWith('BH') || (route.registrations && route.registrations.length > 0)
    );
    
    console.log('Final route distribution after HCM02 fill logic:');
    finalRoutes.forEach(route => {
      console.log(`${route.routeName}: ${route.registrations?.length || 0} employees`);
    });
    
    return finalRoutes;
  }

  /**
   * Áp dụng logic overflow cho HCM routes
   * LUÔN LUÔN ưu tiên HCM01 đủ 15 nhân viên trước khi chuyển sang HCM02
   * - Gom tất cả nhân viên HCM và sắp xếp theo thứ tự trạm từ chiTietTuyenDuong
   * - Gán tuần tự: HCM01 đủ 15 → HCM02 đủ 15 → Phần dư chuyển sang BH routes
   */
  private async applyHCMOverflowLogic(routes: RouteInfo[]): Promise<RouteInfo[]> {
    // Tính tổng nhân viên HCM
    const hcmRoutes = routes.filter(route => 
      route.routeName === 'HCM01' || route.routeName === 'HCM02'
    );
    
    const totalHCMEmployees = hcmRoutes.reduce((sum, route) => 
      sum + (route.registrations?.length || 0), 0
    );
    
    console.log('Total HCM employees:', totalHCMEmployees);
    
    // LUÔN LUÔN ưu tiên HCM01 đủ 15 nhân viên trước khi chuyển sang HCM02
    console.log('PDF Export - Always prioritizing HCM01 to fill 15 employees first, then HCM02');
    return await this.distributeHCMEvenly(routes, hcmRoutes);
    
    // Lấy tất cả nhân viên HCM
    const allHCMEmployees: Registration[] = [];
    hcmRoutes.forEach(route => {
      if (route.registrations) {
        allHCMEmployees.push(...route.registrations);
      }
    });
    
    // Lấy danh sách trạm BH để so sánh
    const bhStations = await this.getBHStationNames();
    console.log('BH stations for matching:', bhStations);
    
    // Phân loại nhân viên HCM: không trùng trạm BH vs trùng trạm BH
    const employeesNotMatchingBH: Registration[] = [];
    const employeesMatchingBH: Registration[] = [];
    const hcm02PriorityEmployees: Registration[] = []; // Nhân viên ưu tiên cho HCM02
    
    allHCMEmployees.forEach(employee => {
      const stationName = this.normalizeStationName(employee.tramXe);
      
      // Kiểm tra xem có phải trạm ưu tiên cho HCM02 không
      if (this.isHCM02PriorityStation(employee.tramXe)) {
        console.log(`Employee ${employee.hoTen} at station ${employee.tramXe} is priority for HCM02`);
        hcm02PriorityEmployees.push(employee);
        return;
      }
      
      // Kiểm tra xem trạm có khớp với trạm BH không
      const matchingBHStation = bhStations.find(bhStation => 
        this.normalizeStationName(bhStation) === stationName ||
        stationName.includes(this.normalizeStationName(bhStation)) ||
        this.normalizeStationName(bhStation).includes(stationName)
      );
      
      if (matchingBHStation) {
        console.log(`Employee ${employee.hoTen} at station ${employee.tramXe} matches BH station ${matchingBHStation}`);
        employeesMatchingBH.push(employee);
      } else {
        employeesNotMatchingBH.push(employee);
      }
    });
    
    console.log(`HCM02 Priority: ${hcm02PriorityEmployees.length}, Not matching BH: ${employeesNotMatchingBH.length}, Matching BH: ${employeesMatchingBH.length}`);
    
    // Ưu tiên nhân viên cho HCM02 trước
    const targetEmployeesPerHCMRoute = 15;
    const hcm02Employees = hcm02PriorityEmployees.slice(0, targetEmployeesPerHCMRoute);
    
    // Nếu HCM02 chưa đủ, lấy thêm từ nhân viên không trùng trạm BH
    const remainingHCM02Slots = targetEmployeesPerHCMRoute - hcm02Employees.length;
    if (remainingHCM02Slots > 0) {
      const additionalForHCM02 = employeesNotMatchingBH.slice(0, remainingHCM02Slots);
      hcm02Employees.push(...additionalForHCM02);
    }
    
    // Phần còn lại của nhân viên không trùng trạm BH cho HCM01
    const remainingNotMatchingBH = employeesNotMatchingBH.slice(remainingHCM02Slots);
    const hcm01Employees = remainingNotMatchingBH.slice(0, targetEmployeesPerHCMRoute);
    
    // Nếu HCM01 chưa đủ, lấy thêm từ nhân viên trùng trạm BH
    const remainingHCM01Slots = targetEmployeesPerHCMRoute - hcm01Employees.length;
    if (remainingHCM01Slots > 0) {
      const additionalForHCM01 = employeesMatchingBH.slice(0, remainingHCM01Slots);
      hcm01Employees.push(...additionalForHCM01);
    }
    
    // Phần dư còn lại (nhân viên trùng trạm BH) sắp qua tuyến Biên Hòa
    const remainingEmployees = employeesMatchingBH.slice(remainingHCM01Slots);
    console.log(`Remaining employees to be assigned to BH routes: ${remainingEmployees.length}`);
    
    // Cập nhật routes
    const updatedRoutes = [...routes];
    
    // Cập nhật HCM01 và HCM02
    const hcm01Index = updatedRoutes.findIndex(r => r.routeName === 'HCM01');
    const hcm02Index = updatedRoutes.findIndex(r => r.routeName === 'HCM02');
    
    if (hcm01Index >= 0) {
      updatedRoutes[hcm01Index].registrations = hcm01Employees;
    }
    if (hcm02Index >= 0) {
      updatedRoutes[hcm02Index].registrations = hcm02Employees;
    }
    
    
    // Chuyển nhân viên dư thừa vào BH routes
    remainingEmployees.forEach(employee => {
      const targetBHRoute = this.findBestBHRouteForEmployee(employee, updatedRoutes);
      if (targetBHRoute) {
        const routeIndex = updatedRoutes.findIndex(r => r.routeName === targetBHRoute);
        if (routeIndex >= 0) {
          if (!updatedRoutes[routeIndex].registrations) {
            updatedRoutes[routeIndex].registrations = [];
          }
          updatedRoutes[routeIndex].registrations!.push(employee);
        }
      }
    });
    
    console.log('Final route distribution after overflow logic:');
    updatedRoutes.forEach(route => {
      console.log(`${route.routeName}: ${route.registrations?.length || 0} employees`);
    });
    
    return updatedRoutes;
  }

  /**
   * Kiểm tra xem trạm có phải là trạm ưu tiên cho HCM02 không
   */
  private isHCM02PriorityStation(station: string): boolean {
    if (!station) return false;
    
    const stationLower = station.toLowerCase();
    
    const hcm02PriorityStations = [
      'ngã 3 long bình tân',
      'nga 3 long binh tan',
      'ngã 3 long bình tân',
      'nga 3 long binh tan',
      'long bình tân',
      'long binh tan',
      'bà chiểu',
      'ba chieu',
      'bà chiểu',
      'ba chieu'
    ];
    
    return hcm02PriorityStations.some(priorityStation => 
      stationLower.includes(priorityStation) || priorityStation.includes(stationLower)
    );
  }

  /**
   * Sắp xếp nhân viên theo độ ưu tiên trạm chung giữa HCM01 và HCM02
   * Ưu tiên các trạm chung: Ngã 3 Bến Gỗ, Ngã 3 Long Bình Tân, Ngã 4 Thủ Đức, RMK, Ngã 3 Cát Lái, Hàng Xanh (Gần Văn Thánh)
   */
  private async sortEmployeesByHCMSharedStationPriority(employees: Registration[]): Promise<Registration[]> {
    console.log('PDF Export - Sorting employees by HCM shared station priority...');
    
    // Định nghĩa các trạm chung giữa HCM01 và HCM02 (ưu tiên cao)
    const hcmSharedStations = [
      'Ngã 3 Bến Gỗ',
      'Ngã 3 Long Bình Tân', 
      'Ngã 4 Thủ Đức',
      'RMK',
      'Ngã 3 Cát Lái',
      'Hàng Xanh (Gần Văn Thánh)'
    ];
    
    // Định nghĩa các trạm riêng của HCM01 (ưu tiên trung bình)
    const hcm01OnlyStations = [
      'Đinh Tiên Hoàng-ĐBP',
      'Hai Bà Trưng-ĐBP'
    ];
    
    // Định nghĩa các trạm riêng của HCM02 (ưu tiên thấp)
    const hcm02OnlyStations = [
      'Bà Chiểu',
      'Chợ Gò Vấp'
    ];
    
    // Sắp xếp nhân viên theo độ ưu tiên
    const sortedEmployees = employees.sort((a, b) => {
      const stationA = a.tramXe?.trim() || '';
      const stationB = b.tramXe?.trim() || '';
      
      // Lấy độ ưu tiên của trạm (số càng nhỏ = ưu tiên càng cao)
      const priorityA = this.getStationPriority(stationA, hcmSharedStations, hcm01OnlyStations, hcm02OnlyStations);
      const priorityB = this.getStationPriority(stationB, hcmSharedStations, hcm01OnlyStations, hcm02OnlyStations);
      
      // Sắp xếp theo độ ưu tiên
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Nếu cùng độ ưu tiên, sắp xếp theo tên nhân viên
      return a.hoTen.localeCompare(b.hoTen);
    });
    
    // Log kết quả sắp xếp
    console.log('PDF Export - Employee sorting by priority:');
    sortedEmployees.forEach((emp, index) => {
      const station = emp.tramXe?.trim() || '';
      const priority = this.getStationPriority(station, hcmSharedStations, hcm01OnlyStations, hcm02OnlyStations);
      const priorityText = priority === 1 ? 'HIGH (Shared)' : priority === 2 ? 'MEDIUM (HCM01)' : priority === 3 ? 'LOW (HCM02)' : 'UNKNOWN';
      console.log(`  ${index + 1}. ${emp.hoTen} (${station}) - Priority: ${priorityText}`);
    });
    
    return sortedEmployees;
  }
  
  /**
   * Lấy độ ưu tiên của trạm
   * @param station Tên trạm
   * @param hcmSharedStations Danh sách trạm chung
   * @param hcm01OnlyStations Danh sách trạm riêng HCM01
   * @param hcm02OnlyStations Danh sách trạm riêng HCM02
   * @returns Độ ưu tiên (1 = cao nhất, 2 = trung bình, 3 = thấp, 4 = không xác định)
   */
  private getStationPriority(station: string, hcmSharedStations: string[], hcm01OnlyStations: string[], hcm02OnlyStations: string[]): number {
    const stationLower = station.toLowerCase();
    
    // Kiểm tra trạm chung (ưu tiên cao nhất)
    for (const sharedStation of hcmSharedStations) {
      if (stationLower.includes(sharedStation.toLowerCase()) || sharedStation.toLowerCase().includes(stationLower)) {
        return 1; // HIGH priority
      }
    }
    
    // Kiểm tra trạm riêng HCM01 (ưu tiên trung bình)
    for (const hcm01Station of hcm01OnlyStations) {
      if (stationLower.includes(hcm01Station.toLowerCase()) || hcm01Station.toLowerCase().includes(stationLower)) {
        return 2; // MEDIUM priority
      }
    }
    
    // Kiểm tra trạm riêng HCM02 (ưu tiên thấp)
    for (const hcm02Station of hcm02OnlyStations) {
      if (stationLower.includes(hcm02Station.toLowerCase()) || hcm02Station.toLowerCase().includes(stationLower)) {
        return 3; // LOW priority
      }
    }
    
    return 4; // UNKNOWN priority
  }

  /**
   * Chia nhân viên HCM với ưu tiên HCM01 đủ 15 nhân viên trước khi chuyển sang HCM02
   * - Gom tất cả nhân viên HCM01 và HCM02 thành một danh sách chung
   * - Sắp xếp theo độ ưu tiên trạm chung giữa HCM01 và HCM02
   * - Gán tuần tự: HCM01 đủ 15 → HCM02 đủ 15 → Phần dư chuyển sang BH routes
   */
  private async distributeHCMEvenly(routes: RouteInfo[], hcmRoutes: RouteInfo[]): Promise<RouteInfo[]> {
    console.log('PDF Export - Applying new even distribution logic for HCM routes...');
    
    // Gom tất cả nhân viên HCM01 và HCM02 thành một danh sách chung
    const allHCMEmployees: Registration[] = [];
    hcmRoutes.forEach(route => {
      if (route.registrations) {
        allHCMEmployees.push(...route.registrations);
      }
    });
    
    console.log(`PDF Export - Total HCM employees to distribute: ${allHCMEmployees.length}`);
    console.log(`PDF Export - HCM employees details:`, allHCMEmployees.map(emp => `${emp.hoTen}(${emp.tramXe})`));
    
    // Sắp xếp nhân viên theo độ ưu tiên trạm chung giữa HCM01 và HCM02
    const sortedHCMEmployees = await this.sortEmployeesByHCMSharedStationPriority(allHCMEmployees);
    console.log(`PDF Export - Sorted HCM employees by shared station priority: ${sortedHCMEmployees.map(emp => `${emp.hoTen}(${emp.tramXe})`).join(', ')}`);
    
    // Khởi tạo danh sách nhân viên cho từng tuyến
    const hcm01Employees: Registration[] = [];
    const hcm02Employees: Registration[] = [];
    
    const maxEmployeesPerRoute = 15;
    let currentRoute = 'HCM01'; // Bắt đầu với HCM01
    
    console.log(`PDF Export - Starting distribution with max ${maxEmployeesPerRoute} employees per route`);
    
    // Vòng lặp tuần tự gán nhân viên
    for (let i = 0; i < sortedHCMEmployees.length; i++) {
      const employee = sortedHCMEmployees[i];
      
      if (currentRoute === 'HCM01') {
        if (hcm01Employees.length < maxEmployeesPerRoute) {
          hcm01Employees.push(employee);
          console.log(`PDF Export - Assigned ${employee.hoTen} to HCM01 (${hcm01Employees.length}/${maxEmployeesPerRoute})`);
        } else {
          // HCM01 đã đủ, chuyển sang HCM02
          currentRoute = 'HCM02';
          hcm02Employees.push(employee);
          console.log(`PDF Export - HCM01 full, assigned ${employee.hoTen} to HCM02 (${hcm02Employees.length}/${maxEmployeesPerRoute})`);
        }
      } else if (currentRoute === 'HCM02') {
        if (hcm02Employees.length < maxEmployeesPerRoute) {
          hcm02Employees.push(employee);
          console.log(`PDF Export - Assigned ${employee.hoTen} to HCM02 (${hcm02Employees.length}/${maxEmployeesPerRoute})`);
        } else {
          // Cả hai tuyến đều đủ, nhân viên còn lại sẽ được xử lý bởi overflow logic
          console.log(`PDF Export - Both HCM routes full, employee ${employee.hoTen} will be handled by overflow logic`);
          break;
        }
      }
    }
    
    console.log(`PDF Export - Even distribution result: HCM01=${hcm01Employees.length}, HCM02=${hcm02Employees.length}`);
    console.log(`PDF Export - HCM01 employees:`, hcm01Employees.map(emp => `${emp.hoTen}(${emp.tramXe})`));
    console.log(`PDF Export - HCM02 employees:`, hcm02Employees.map(emp => `${emp.hoTen}(${emp.tramXe})`));
    
    // Xử lý phần dư nhân viên (nếu có) - chuyển sang BH routes
    const remainingEmployees = sortedHCMEmployees.slice(hcm01Employees.length + hcm02Employees.length);
    if (remainingEmployees.length > 0) {
      console.log(`PDF Export - ${remainingEmployees.length} remaining employees will be assigned to BH routes`);
      console.log(`PDF Export - Remaining employees:`, remainingEmployees.map(emp => `${emp.hoTen}(${emp.tramXe})`));
      
      // Gán phần dư vào BH routes dựa trên trạm
      for (const employee of remainingEmployees) {
        const bhRoute = await this.findBHRouteForStation(employee.tramXe);
        console.log(`PDF Export - Assigning overflow employee ${employee.hoTen} from station "${employee.tramXe}" to BH route "${bhRoute}"`);
        
        // Tìm hoặc tạo BH route trong routes gốc
        let bhRouteIndex = routes.findIndex((r: any) => r.routeName === bhRoute);
        if (bhRouteIndex === -1) {
          // Tạo route mới nếu chưa tồn tại
          routes.push({
            routeName: bhRoute,
            registrations: [],
            vehicleType: '16chỗ',
            driverInfo: undefined
          });
          bhRouteIndex = routes.length - 1;
        }
        
        // Đảm bảo registrations array tồn tại
        if (!routes[bhRouteIndex].registrations) {
          routes[bhRouteIndex].registrations = [];
        }
        routes[bhRouteIndex].registrations!.push(employee);
      }
    }
    
    // Cập nhật routes
    const finalRoutes = [...routes];
    
    // Cập nhật HCM01 và HCM02
    const hcm01Index = finalRoutes.findIndex(r => r.routeName === 'HCM01');
    const hcm02Index = finalRoutes.findIndex(r => r.routeName === 'HCM02');
    
    if (hcm01Index >= 0) {
      finalRoutes[hcm01Index].registrations = hcm01Employees;
    }
    if (hcm02Index >= 0) {
      finalRoutes[hcm02Index].registrations = hcm02Employees;
    }
    
    return finalRoutes;
  }

  /**
   * Lấy danh sách tên trạm của các tuyến BH
   */
  private async getBHStationNames(): Promise<string[]> {
    try {
      const routeDetails = this.dataCacheService.getRouteDetails();
      const bhStations = routeDetails
        ?.filter((detail: RouteDetail) => detail.maTuyenXe.startsWith('BH'))
        ?.map((detail: RouteDetail) => detail.tenDiemDon) || [];
      
      return [...new Set(bhStations)]; // Loại bỏ trùng lặp
    } catch (error) {
      console.error('Error getting BH station names:', error);
      return [];
    }
  }

  /**
   * Tìm tuyến BH tốt nhất cho nhân viên
   */
  private findBestBHRouteForEmployee(employee: Registration, routes: RouteInfo[]): string | null {
    const stationName = this.normalizeStationName(employee.tramXe);
    
    // Ưu tiên BH01, BH02, BH03, BH04 theo thứ tự
    const bhRoutes = ['BH01', 'BH02', 'BH03', 'BH04'];
    
    for (const bhRoute of bhRoutes) {
      const routeExists = routes.some(r => r.routeName === bhRoute);
      if (routeExists) {
        return bhRoute;
      }
    }
    
    return 'BH01'; // Fallback
  }

  /**
   * Áp dụng logic ưu tiên gom HCM và BH routes theo tiêu chí mới:
   * - HCM phụ trội chỉ có 2 tuyến (16 chỗ)
   * - Tuyến thứ 3 phát sinh: Phước Tân, Bến Gỗ, Long Bình Tân, Thủ Đức
   * - Tối ưu chi phí: Phước Tân, Bến Gỗ, Long Bình Tân sắp vào tuyến BH
   * - Thủ Đức: nếu chỉ có vài người thì cho đi taxi
   */
  /**
   * Apply HCM grouping priority logic - chỉ xử lý "tự túc" và "ngã 3 hãng dầu", còn lại giữ nguyên tuyến từ database
   */
  private applyHCMGroupingPriority(routeName: string, tramXe: string): string {
    // Kiểm tra nếu là trường hợp "tự túc"
    if (this.isSelfTransportStation(tramXe)) {
      return 'TỰ TÚC';
    }
    
    // Đặc biệt: "Ngã 3 Hãng dầu" luôn thuộc BH04
    if (this.isNga3HangDauStation(tramXe)) {
      return 'BH04';
    }
    
    // Giữ nguyên tuyến từ database mapping
    return routeName;
  }


  /**
   * Sắp xếp nhân viên theo thứ tự trạm trong tuyến từ cache
   */
  private async sortEmployeesByStationOrder(employees: Registration[]): Promise<Registration[]> {
    try {
      if (!this.dataCacheService.isDataLoaded()) {
        console.warn('PDF Export - Data cache not loaded, returning employees without sorting');
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

      console.log(`PDF Export - Sorted ${sortedEmployees.length} employees by station order`);
      return sortedEmployees;
      
    } catch (error) {
      console.error('PDF Export - Error sorting employees by station order:', error);
      return employees;
    }
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
   * BH01, BH02, BH03, BH04
   * THU_DUC_TAXI (taxi cho Thủ Đức)
   * Các tuyến khác theo thứ tự alphabet
   */
  private sortRoutesByPriority(routes: RouteInfo[]): RouteInfo[] {
    // Định nghĩa thứ tự ưu tiên
    const priorityOrder = [
      'HCM01', 'HCM02', // Chỉ 2 tuyến HCM chính
      'BH01', 'BH02', 'BH03', 'BH04',
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
    const groupedByStation = await this.groupRegistrationsByStation(route.registrations || []);
    
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
   * Gom nhóm đăng ký theo trạm xe (loại bỏ trạm "tự túc") và sắp xếp theo thuTu
   */
  private async groupRegistrationsByStation(registrations: Registration[]): Promise<{ [station: string]: Registration[] }> {
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
    
    // Sắp xếp các trạm theo thuTu từ RouteDetail
    const sortedGrouped = await this.sortStationsByThuTu(grouped);
    
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
   */
  private async sortStationsByThuTu(grouped: { [station: string]: Registration[] }): Promise<{ [station: string]: Registration[] }> {
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
        // Store both exact match and normalized match for better matching
        stationOrderMap.get(detail.maTuyenXe)!.set(detail.tenDiemDon, detail.thuTu);
        stationOrderMap.get(detail.maTuyenXe)!.set(this.normalizeStationName(detail.tenDiemDon), detail.thuTu);
      });

      // Get the route code from the first registration (assuming all registrations in this group are from the same route)
      const firstRegistration = Object.values(grouped)[0]?.[0];
      if (!firstRegistration) {
        return grouped;
      }

      const routeCode = firstRegistration.maTuyenXe;
      const routeOrderMap = stationOrderMap.get(routeCode);

      if (!routeOrderMap) {
        console.warn(`No route details found for route ${routeCode}, returning stations without sorting`);
        return grouped;
      }

      // Sort stations by their thuTu order
      const sortedEntries = Object.entries(grouped).sort(([stationA], [stationB]) => {
        // Try exact match first
        let orderA = routeOrderMap.get(stationA);
        let orderB = routeOrderMap.get(stationB);
        
        // If no exact match, try normalized match
        if (orderA === undefined) {
          orderA = routeOrderMap.get(this.normalizeStationName(stationA));
        }
        if (orderB === undefined) {
          orderB = routeOrderMap.get(this.normalizeStationName(stationB));
        }
        
        // Special handling for BV Hòa Hảo - ensure it's always last
        if (this.isBVHoaHaoStation(stationA)) {
          orderA = 9999; // Highest priority to be last
        }
        if (this.isBVHoaHaoStation(stationB)) {
          orderB = 9999; // Highest priority to be last
        }
        
        // Special handling for HCM02: ensure Bà Chiểu comes after Ngã 4 Thủ Đức and RMK
        if (routeCode === 'HCM02') {
          if (this.isBaChieuStation(stationA)) {
            // Bà Chiểu should come after Ngã 4 Thủ Đức (order 3) and RMK (order 4)
            // Find the highest order among stations that should come before Bà Chiểu
            const nga4ThuDucOrder = routeOrderMap.get('Ngã 4 Thủ Đức') || routeOrderMap.get(this.normalizeStationName('Ngã 4 Thủ Đức')) || 3;
            const rmkOrder = routeOrderMap.get('RMK') || routeOrderMap.get(this.normalizeStationName('RMK')) || 4;
            const maxOrderBeforeBaChieu = Math.max(nga4ThuDucOrder, rmkOrder);
            orderA = maxOrderBeforeBaChieu + 1; // Set to be after both stations
          }
          if (this.isBaChieuStation(stationB)) {
            // Bà Chiểu should come after Ngã 4 Thủ Đức (order 3) and RMK (order 4)
            // Find the highest order among stations that should come before Bà Chiểu
            const nga4ThuDucOrder = routeOrderMap.get('Ngã 4 Thủ Đức') || routeOrderMap.get(this.normalizeStationName('Ngã 4 Thủ Đức')) || 3;
            const rmkOrder = routeOrderMap.get('RMK') || routeOrderMap.get(this.normalizeStationName('RMK')) || 4;
            const maxOrderBeforeBaChieu = Math.max(nga4ThuDucOrder, rmkOrder);
            orderB = maxOrderBeforeBaChieu + 1; // Set to be after both stations
          }
        }
        
        // Use found order or default to 999
        orderA = orderA || 999;
        orderB = orderB || 999;
        
        return orderA - orderB;
      });

      // Convert back to object
      const sortedGrouped: { [station: string]: Registration[] } = {};
      sortedEntries.forEach(([station, registrations]) => {
        sortedGrouped[station] = registrations;
      });

      console.log('Sorted stations by thuTu:', sortedEntries.map(([station, _]) => ({
        station,
        order: routeOrderMap.get(station) || routeOrderMap.get(this.normalizeStationName(station)) || 'unknown'
      })));
      
      // Debug: Log all route details for this route
      console.log(`Route details for ${routeCode}:`, routeDetails.filter(d => d.maTuyenXe === routeCode));
      
      // Debug: Check if Ngã 3 Hãng dầu has correct order
      const nga3HangDauDetails = routeDetails.filter(d => 
        d.maTuyenXe === routeCode && 
        (d.tenDiemDon.includes('Ngã 3 Hãng dầu') || d.tenDiemDon.includes('Ngã 3 Hàng dầu'))
      );
      console.log('Ngã 3 Hãng dầu details:', nga3HangDauDetails);

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
  private async generateOvertimeReportHTMLTemplate(route: RouteInfo): Promise<string> {
    const today = new Date();
    const dateStr =
      `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1)
        .toString().padStart(2, '0')} năm ${today.getFullYear()}`;

    // Gom nhóm nhân viên theo trạm xe để merge cell
    const groupedByStation = await this.groupRegistrationsByStation(route.registrations || []);
    
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
  private async generateOvertimeTableRowsWithMergedCells(groupedByStation: { [station: string]: Registration[] }): Promise<string> {
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

    return yPosition;
  }

  /**
   * Áp dụng logic ghép trạm HCM vào trạm Biên Hòa từ DB
   */
  private async applyHCMStationMatchingLogic(
    routes: RouteInfo[], 
    hcmRoutes: RouteInfo[]
  ): Promise<RouteInfo[]> {
    console.log('Applying HCM station matching logic with BH routes from DB...');
    
    // Lấy tất cả nhân viên HCM
    const allHCMEmployees: Registration[] = [];
    hcmRoutes.forEach(route => {
      if (route.registrations) {
        allHCMEmployees.push(...route.registrations);
      }
    });
    
    // Lấy danh sách trạm BH từ DB
    const bhStations = await this.getBHStationNames();
    console.log('BH stations from DB:', bhStations);
    
    // Phân loại nhân viên HCM: có trạm trùng với BH vs không trùng
    const employeesMatchingBH: Registration[] = [];
    const employeesNotMatchingBH: Registration[] = [];
    
    allHCMEmployees.forEach(employee => {
      const stationName = this.normalizeStationName(employee.tramXe || '');
      
      // Kiểm tra xem trạm có khớp với trạm BH không
      const matchingBHStation = bhStations.find(bhStation => 
        this.normalizeStationName(bhStation) === stationName ||
        stationName.includes(this.normalizeStationName(bhStation)) ||
        this.normalizeStationName(bhStation).includes(stationName)
      );
      
      if (matchingBHStation) {
        console.log(`Employee ${employee.hoTen} at station ${employee.tramXe} matches BH station ${matchingBHStation}`);
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
    const combinedHCMEmployees = [...employeesNotMatchingBH, ...employeesMatchingBH];
    
    // Sắp HCM01 trước (tối đa 15 nhân viên)
    let hcm01Employees = combinedHCMEmployees.slice(0, targetEmployeesPerHCMRoute);
    
    // Sắp tiếp cho HCM02 từ nhân viên còn lại (tối đa 15 nhân viên)
    const remainingEmployees = combinedHCMEmployees.slice(targetEmployeesPerHCMRoute);
    let hcm02Employees = remainingEmployees.slice(0, targetEmployeesPerHCMRoute);
    
    // Nhân viên HCM còn dư sau khi sắp cho HCM01 và HCM02
    const hcmOverflowEmployees = remainingEmployees.slice(targetEmployeesPerHCMRoute);
    
    // Chuyển nhân viên có trạm trùng BH sang tuyến BH tương ứng (chỉ những người không được sắp cho HCM)
    for (const employee of employeesMatchingBH) {
      // Chỉ chuyển sang BH nếu nhân viên không được sắp cho HCM01 hoặc HCM02
      const isAssignedToHCM = [...hcm01Employees, ...hcm02Employees].some(emp => 
        emp.hoTen === employee.hoTen && emp.tramXe === employee.tramXe
      );
      
      if (!isAssignedToHCM) {
        const bhRoute = await this.findBHRouteForStation(employee.tramXe || '');
        if (bhRoute) {
          const targetRoute = routes.find(route => route.routeName === bhRoute);
          if (targetRoute) {
            targetRoute.registrations = targetRoute.registrations || [];
            targetRoute.registrations.push(employee);
            console.log(`Moving employee ${employee.hoTen} from station ${employee.tramXe} to BH route ${bhRoute}`);
          }
        }
      }
    }
    
    // Chuyển nhân viên dư thừa sang tuyến Biên Hòa dựa trên tên trạm từ DB
    for (const employee of hcmOverflowEmployees) {
      const bhRoute = await this.findBHRouteForStation(employee.tramXe || '');
      if (bhRoute) {
        const targetRoute = routes.find(route => route.routeName === bhRoute);
        if (targetRoute) {
          targetRoute.registrations = targetRoute.registrations || [];
          targetRoute.registrations.push(employee);
          console.log(`Moving overflow employee ${employee.hoTen} from station ${employee.tramXe} to ${bhRoute}`);
        }
      }
    }
    
    console.log(`Final HCM distribution: HCM01=${hcm01Employees.length}, HCM02=${hcm02Employees.length}`);
    console.log(`Overflow to BH: ${hcmOverflowEmployees.length} employees`);
    
    // Cập nhật routes
    const updatedRoutes = [...routes];
    
    // Cập nhật HCM01 và HCM02
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
