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
    
    employees.forEach(employee => {
      const tuyenXe = employee.MaTuyenXe || 'Chưa phân tuyến';
      const tramXe = employee.TramXe || 'Chưa phân trạm';
      
      if (!grouped[tuyenXe]) {
        grouped[tuyenXe] = {};
      }
      
      if (!grouped[tuyenXe][tramXe]) {
        grouped[tuyenXe][tramXe] = [];
      }
      
      grouped[tuyenXe][tramXe].push(employee);
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
}
