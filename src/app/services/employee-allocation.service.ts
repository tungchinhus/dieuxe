import { Injectable } from '@angular/core';
import { NhanVien } from '../models/employee.model';
import { RouteDetail } from '../models/route-detail.model';

export interface EmployeeAllocation {
  tuyenXe: string;
  tramXe: string;
  nhanVien: NhanVien[];
  soLuong: number;
  loaiXe: '45_chỗ' | '29_chỗ' | '16_chỗ';
  soXeCan: number;
}

export interface AllocationResult {
  allocations: EmployeeAllocation[];
  tongSoNhanVien: number;
  tongSoXe: number;
  chiTietTuyenDuong: { [key: string]: RouteDetail[] };
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeAllocationService {

  constructor() { }

  /**
   * Phân bổ nhân viên theo trạm và tuyến đường
   */
  allocateEmployees(employees: NhanVien[], routeDetails: RouteDetail[]): AllocationResult {
    // Nhóm nhân viên theo tuyến đường và trạm
    const groupedEmployees = this.groupEmployeesByRouteAndStation(employees);
    
    // Tạo chi tiết tuyến đường theo maTuyenXe
    const chiTietTuyenDuong = this.groupRouteDetailsByRoute(routeDetails);
    
    // Phân bổ theo quy tắc xe
    const allocations = this.allocateByVehicleRules(groupedEmployees);
    
    // Tính tổng
    const tongSoNhanVien = employees.length;
    const tongSoXe = allocations.reduce((total, allocation) => total + allocation.soXeCan, 0);
    
    return {
      allocations,
      tongSoNhanVien,
      tongSoXe,
      chiTietTuyenDuong
    };
  }

  /**
   * Nhóm nhân viên theo tuyến đường và trạm
   */
  private groupEmployeesByRouteAndStation(employees: NhanVien[]): { [key: string]: { [key: string]: NhanVien[] } } {
    const grouped: { [key: string]: { [key: string]: NhanVien[] } } = {};
    const stationNameMap = new Map<string, string>(); // Map từ normalized name đến original name
    
    employees.forEach(employee => {
      const originalTuyenXe = employee.MaTuyenXe || 'Chưa phân tuyến';
      const tramXe = employee.TramXe || 'Chưa phân trạm';
      
      // Áp dụng logic ưu tiên gom HCM routes vào HCM01
      const tuyenXe = this.applyHCMGroupingPriority(originalTuyenXe, tramXe);
      
      if (!grouped[tuyenXe]) {
        grouped[tuyenXe] = {};
      }
      
      // Normalize tên trạm để không phân biệt chữ hoa thường khi so sánh
      const normalizedTramXe = this.normalizeStationName(tramXe);
      
      // Lưu mapping từ normalized name đến original name (chỉ lưu lần đầu)
      if (!stationNameMap.has(normalizedTramXe)) {
        stationNameMap.set(normalizedTramXe, tramXe);
      }
      
      // Sử dụng original name làm key để hiển thị đúng
      const displayStationName = stationNameMap.get(normalizedTramXe)!;
      
      if (!grouped[tuyenXe][displayStationName]) {
        grouped[tuyenXe][displayStationName] = [];
      }
      
      grouped[tuyenXe][displayStationName].push(employee);
    });
    
    return grouped;
  }

  /**
   * Nhóm chi tiết tuyến đường theo maTuyenXe
   */
  private groupRouteDetailsByRoute(routeDetails: RouteDetail[]): { [key: string]: RouteDetail[] } {
    const grouped: { [key: string]: RouteDetail[] } = {};
    
    routeDetails.forEach(route => {
      const tuyenXe = route.maTuyenXe;
      if (!grouped[tuyenXe]) {
        grouped[tuyenXe] = [];
      }
      grouped[tuyenXe].push(route);
    });
    
    // Sắp xếp theo thứ tự
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.thuTu - b.thuTu);
    });
    
    return grouped;
  }

  /**
   * Phân bổ theo quy tắc xe
   */
  private allocateByVehicleRules(groupedEmployees: { [key: string]: { [key: string]: NhanVien[] } }): EmployeeAllocation[] {
    const allocations: EmployeeAllocation[] = [];
    
    Object.keys(groupedEmployees).forEach(tuyenXe => {
      const stations = groupedEmployees[tuyenXe];
      
      Object.keys(stations).forEach(tramXe => {
        const nhanVien = stations[tramXe];
        const soLuong = nhanVien.length;
        
        if (soLuong > 0) {
          const vehicleInfo = this.calculateVehicleNeeded(soLuong);
          
          allocations.push({
            tuyenXe,
            tramXe,
            nhanVien,
            soLuong,
            loaiXe: vehicleInfo.loaiXe,
            soXeCan: vehicleInfo.soXeCan
          });
        }
      });
    });
    
    return allocations;
  }

  /**
   * Tính toán loại xe và số xe cần thiết
   */
  private calculateVehicleNeeded(soLuong: number): { loaiXe: '45_chỗ' | '29_chỗ' | '16_chỗ', soXeCan: number } {
    if (soLuong >= 30 && soLuong <= 44) {
      return { loaiXe: '45_chỗ', soXeCan: 1 };
    } else if (soLuong >= 17 && soLuong <= 29) {
      return { loaiXe: '29_chỗ', soXeCan: 1 };
    } else if (soLuong >= 11 && soLuong <= 16) {
      return { loaiXe: '16_chỗ', soXeCan: 1 };
    } else if (soLuong > 44) {
      // Nếu nhiều hơn 44 người, chia thành nhiều xe 45 chỗ
      const soXe45Cho = Math.ceil(soLuong / 44);
      return { loaiXe: '45_chỗ', soXeCan: soXe45Cho };
    } else if (soLuong > 29) {
      // Nếu nhiều hơn 29 người, chia thành nhiều xe 29 chỗ
      const soXe29Cho = Math.ceil(soLuong / 28);
      return { loaiXe: '29_chỗ', soXeCan: soXe29Cho };
    } else if (soLuong > 16) {
      // Nếu nhiều hơn 16 người, chia thành nhiều xe 16 chỗ
      const soXe16Cho = Math.ceil(soLuong / 15);
      return { loaiXe: '16_chỗ', soXeCan: soXe16Cho };
    } else {
      // Ít hơn 11 người, dùng xe 16 chỗ
      return { loaiXe: '16_chỗ', soXeCan: 1 };
    }
  }

  /**
   * Tạo dữ liệu cho PDF
   */
  generatePdfData(allocationResult: AllocationResult): any {
    const { allocations, tongSoNhanVien, tongSoXe, chiTietTuyenDuong } = allocationResult;
    
    // Nhóm theo tuyến đường
    const groupedByRoute: { [key: string]: EmployeeAllocation[] } = {};
    allocations.forEach(allocation => {
      if (!groupedByRoute[allocation.tuyenXe]) {
        groupedByRoute[allocation.tuyenXe] = [];
      }
      groupedByRoute[allocation.tuyenXe].push(allocation);
    });
    
    return {
      title: 'BÁO CÁO PHÂN BỔ NHÂN VIÊN THEO TUYẾN ĐƯỜNG VÀ TRẠM',
      generatedDate: new Date().toLocaleDateString('vi-VN'),
      summary: {
        tongSoNhanVien,
        tongSoXe,
        tongSoTuyenDuong: Object.keys(groupedByRoute).length
      },
      routes: Object.keys(groupedByRoute).map(tuyenXe => ({
        tuyenXe,
        stations: groupedByRoute[tuyenXe],
        routeDetails: chiTietTuyenDuong[tuyenXe] || [],
        tongNhanVienTuyen: groupedByRoute[tuyenXe].reduce((sum, station) => sum + station.soLuong, 0),
        tongXeTuyen: groupedByRoute[tuyenXe].reduce((sum, station) => sum + station.soXeCan, 0)
      }))
    };
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
