// pdf-export.service.ts
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Registration } from '../models/registration.model';
import { FirestoreService } from './firestore.service';
import { RouteDetailService } from './route-detail.service';
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
    private routeDetailService: RouteDetailService
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
      const maTuyenXe = registration.maTuyenXe || 'Chưa phân tuyến';
      
      // Áp dụng logic ưu tiên gom HCM routes và xử lý "tự túc"
      const finalRouteName = this.applyHCMGroupingPriority(maTuyenXe, registration.tramXe);
      
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
   * Áp dụng logic overflow cho HCM dựa trên số lượng nhân viên:
   * - < 30 nhân viên: chia đều cho HCM01, HCM02
   * - >= 30 nhân viên: ưu tiên nhân viên không trùng trạm BH, đảm bảo đủ 2 xe 16 chỗ (15 nhân viên)
   * - Phần dư còn lại sắp qua tuyến Biên Hòa
   * - Đặc biệt: Ngã 3 Long Bình Tân và Bà Chiểu ưu tiên vào HCM02
   */
  private async applyHCMOverflowLogic(routes: RouteInfo[]): Promise<RouteInfo[]> {
    // Tính tổng nhân viên HCM
    const hcmRoutes = routes.filter(route => 
      route.routeName === 'HCM01' || route.routeName === 'HCM02' || route.routeName === 'HCM03'
    );
    
    const totalHCMEmployees = hcmRoutes.reduce((sum, route) => 
      sum + (route.registrations?.length || 0), 0
    );
    
    console.log('Total HCM employees:', totalHCMEmployees);
    
    // Nếu tổng HCM < 30, chia đều cho HCM01 và HCM02
    if (totalHCMEmployees < 30) {
      console.log('HCM employees < 30, distributing evenly between HCM01 and HCM02');
      return this.distributeHCMEvenly(routes, hcmRoutes);
    }
    
    console.log('HCM employees >= 30, applying overflow logic...');
    
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
    
    // Xóa HCM03 nếu có
    const hcm03Index = updatedRoutes.findIndex(r => r.routeName === 'HCM03');
    if (hcm03Index >= 0) {
      updatedRoutes[hcm03Index].registrations = [];
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
   * Chia đều nhân viên HCM cho HCM01 và HCM02 khi tổng < 30
   */
  private distributeHCMEvenly(routes: RouteInfo[], hcmRoutes: RouteInfo[]): RouteInfo[] {
    // Lấy tất cả nhân viên HCM
    const allHCMEmployees: Registration[] = [];
    hcmRoutes.forEach(route => {
      if (route.registrations) {
        allHCMEmployees.push(...route.registrations);
      }
    });
    
    // Tách nhân viên ưu tiên cho HCM02
    const hcm02PriorityEmployees = allHCMEmployees.filter(emp => 
      this.isHCM02PriorityStation(emp.tramXe)
    );
    
    const otherHCMEmployees = allHCMEmployees.filter(emp => 
      !this.isHCM02PriorityStation(emp.tramXe)
    );
    
    // Chia đều phần còn lại
    const halfCount = Math.ceil(otherHCMEmployees.length / 2);
    const hcm01Employees = otherHCMEmployees.slice(0, halfCount);
    const hcm02Employees = [
      ...hcm02PriorityEmployees,
      ...otherHCMEmployees.slice(halfCount)
    ];
    
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
    
    // Xóa HCM03 nếu có
    const hcm03Index = updatedRoutes.findIndex(r => r.routeName === 'HCM03');
    if (hcm03Index >= 0) {
      updatedRoutes[hcm03Index].registrations = [];
    }
    
    console.log('HCM distribution (even with HCM02 priority):');
    console.log(`HCM01: ${hcm01Employees.length} employees`);
    console.log(`HCM02: ${hcm02Employees.length} employees (${hcm02PriorityEmployees.length} priority)`);
    
    return updatedRoutes;
  }

  /**
   * Lấy danh sách tên trạm của các tuyến BH
   */
  private async getBHStationNames(): Promise<string[]> {
    try {
      const routeDetails = await this.routeDetailService.getRouteDetails().toPromise();
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
  private applyHCMGroupingPriority(routeName: string, tramXe: string): string {
    // Kiểm tra nếu là trường hợp "tự túc"
    if (this.isSelfTransportStation(tramXe)) {
      return 'TỰ TÚC';
    }
    
    // Đặc biệt: "Ngã 3 Hãng dầu" luôn thuộc BH04, không phân biệt tuyến gốc
    if (this.isNga3HangDauStation(tramXe)) {
      return 'BH04';
    }
    
    // Đặc biệt: Ngã 3 Long Bình Tân và Bà Chiểu ưu tiên vào HCM02
    if (this.isHCM02PriorityStation(tramXe)) {
      return 'HCM02';
    }
    
    // Kiểm tra nếu là tuyến HCM - chỉ có 2 tuyến chính
    if (routeName === 'HCM01' || routeName === 'HCM02') {
      // Giữ nguyên 2 tuyến HCM chính
      return routeName;
    }
    
    // Xử lý tuyến HCM03 phát sinh - chuyển các trạm vào BH có cùng tên trạm
    if (routeName === 'HCM03') {
      // Thủ Đức -> taxi nếu ít người
      if (this.isThuDucStation(tramXe)) {
        return 'THU_DUC_TAXI';
      }
      
      // Các trạm khác (Phước Tân, Bến Gỗ, Long Bình Tân) -> sắp vào BH có cùng tên trạm
      // Tìm tuyến BH phù hợp dựa trên tên trạm
      const matchingBHRoute = this.findMatchingBHRouteForStation(tramXe);
      if (matchingBHRoute) {
        return matchingBHRoute;
      }
      
      // Fallback: gom vào BH01 nếu không tìm thấy tuyến phù hợp
      return 'BH01';
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
   * Tìm tuyến BH phù hợp cho trạm từ HCM03
   */
  private findMatchingBHRouteForStation(tramXe: string): string | null {
    if (!tramXe) return null;
    
    const station = tramXe.toLowerCase();
    
    // Mapping các trạm HCM03 với tuyến BH phù hợp
    const stationToBHRouteMap: { [key: string]: string } = {
      'phước tân': 'BH01',
      'phuoc tan': 'BH01',
      'bến gỗ': 'BH01', 
      'ben go': 'BH01',
      'ngã 3 bến gỗ': 'BH01',
      'nga 3 ben go': 'BH01',
      'long bình tân': 'BH02',
      'long binh tan': 'BH02',
      'ngã 3 long bình tân': 'BH02',
      'nga 3 long binh tan': 'BH02'
    };
    
    // Tìm tuyến BH phù hợp
    for (const [stationName, bhRoute] of Object.entries(stationToBHRouteMap)) {
      if (station.includes(stationName) || stationName.includes(station)) {
        return bhRoute;
      }
    }
    
    return null;
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
      // Get route details to determine station order
      const routeDetails = await this.routeDetailService.getRouteDetails().toPromise();
      
      if (!routeDetails || routeDetails.length === 0) {
        console.warn('No route details found, returning stations without sorting');
        return grouped;
      }

      // Create a map of station names to their order for each route
      const stationOrderMap = new Map<string, Map<string, number>>();
      
      routeDetails.forEach(detail => {
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

    // phương án cũ không dùng nữa (đã chuyển sang HTML)
    return yPosition + 200;
  }

}

