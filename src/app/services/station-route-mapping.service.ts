import { Injectable } from '@angular/core';
import { RouteDetailService } from './route-detail.service';
import { RouteDetail } from '../models/route-detail.model';

@Injectable({
  providedIn: 'root'
})
export class StationRouteMappingService {
  private stationRouteMap: Map<string, string> = new Map();
  private routeDetails: RouteDetail[] = [];
  private isLoaded = false;
  private isLoading = false;

  constructor(private routeDetailService: RouteDetailService) {}

  /**
   * Load dữ liệu từ Firebase collection "chiTietTuyenDuong" 
   * Phải được gọi trước khi sử dụng bất kỳ logic phân bổ nhân viên nào
   */
  async loadStationRouteMapping(): Promise<void> {
    if (this.isLoaded) {
      console.log('StationRouteMappingService - Data already loaded, using cached data');
      return;
    }

    if (this.isLoading) {
      console.log('StationRouteMappingService - Data is being loaded, waiting...');
      // Wait for loading to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isLoading = true;
    console.log('StationRouteMappingService - Loading station-route mapping from Firebase collection "chiTietTuyenDuong"...');

    try {
      // Load tất cả route details từ Firebase
      this.routeDetails = await this.routeDetailService.getRouteDetails().toPromise() || [];
      
      if (this.routeDetails.length > 0) {
        console.log(`StationRouteMappingService - Loaded ${this.routeDetails.length} route details from Firebase`);
        
        // Tạo mapping từ tên trạm đến mã tuyến
        this.routeDetails.forEach(detail => {
          const originalStationName = detail.tenDiemDon;
          const routeCode = detail.maTuyenXe;
          const order = detail.thuTu;
          
          // Lưu mapping với tên gốc (lowercase)
          this.stationRouteMap.set(originalStationName.toLowerCase(), routeCode);
          
          // Lưu mapping với tên đã normalize
          const normalizedStation = this.normalizeStationName(originalStationName);
          this.stationRouteMap.set(normalizedStation, routeCode);
          
          console.log(`StationRouteMappingService - Mapped station "${originalStationName}" (order: ${order}) to route "${routeCode}"`);
        });

        // Log một số mapping quan trọng để kiểm tra
        const importantStations = ['đinh tiên hoàng-đbp', 'bv hòa hảo', 'ngã 3 bến gỗ', 'ngã 3 long bình tân', 'ngã 4 thủ đức', 'ngã 4 vũng tàu'];
        importantStations.forEach(station => {
          const route = this.stationRouteMap.get(station) || this.stationRouteMap.get(this.normalizeStationName(station));
          console.log(`StationRouteMappingService - Important station "${station}" mapped to route: ${route || 'NOT FOUND'}`);
        });
        
        // Log tất cả mappings để debug
        console.log('StationRouteMappingService - All mappings:');
        this.stationRouteMap.forEach((route, station) => {
          console.log(`  "${station}" -> "${route}"`);
        });
        
      } else {
        console.warn('StationRouteMappingService - No route details found in Firebase collection "chiTietTuyenDuong"');
      }
      
      this.isLoaded = true;
      console.log(`StationRouteMappingService - Station-Route mapping loaded: ${this.stationRouteMap.size} entries`);
      
    } catch (error) {
      console.error('StationRouteMappingService - Error loading station-route mapping from Firebase:', error);
      console.error('StationRouteMappingService - This may cause incorrect station assignments. Please check Firebase connection.');
      this.isLoaded = false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Lấy mã tuyến cho một trạm cụ thể
   */
  getRouteForStation(stationName: string): string | null {
    if (!this.isLoaded) {
      console.warn('StationRouteMappingService - Data not loaded yet. Call loadStationRouteMapping() first.');
      return null;
    }

    const normalizedStation = this.normalizeStationName(stationName);
    const route = this.stationRouteMap.get(normalizedStation) || this.stationRouteMap.get(stationName.toLowerCase());
    
    console.log(`StationRouteMappingService - Station "${stationName}" mapped to route: ${route || 'NOT FOUND'}`);
    return route || null;
  }

  /**
   * Kiểm tra xem trạm có thuộc về tuyến cụ thể không
   */
  isStationInRoute(stationName: string, routeCode: string): boolean {
    const stationRoute = this.getRouteForStation(stationName);
    const result = stationRoute === routeCode;
    console.log(`StationRouteMappingService - Station "${stationName}" belongs to route "${routeCode}": ${result}`);
    return result;
  }

  /**
   * Lấy danh sách trạm chính thức của một tuyến từ Firebase
   */
  getOfficialStationsForRoute(routeCode: string): string[] {
    if (!this.isLoaded) {
      console.warn('StationRouteMappingService - Data not loaded yet. Call loadStationRouteMapping() first.');
      return [];
    }

    const officialStations = this.routeDetails
      .filter(detail => detail.maTuyenXe === routeCode)
      .sort((a, b) => (a.thuTu || 0) - (b.thuTu || 0))
      .map(detail => detail.tenDiemDon);

    console.log(`StationRouteMappingService - Official stations for ${routeCode}:`, officialStations);
    return officialStations;
  }

  /**
   * Lấy tất cả trạm thuộc về một tuyến cụ thể, sắp xếp theo thứ tự
   */
  getStationsForRoute(routeCode: string): string[] {
    if (!this.isLoaded) {
      console.warn('StationRouteMappingService - Data not loaded yet. Call loadStationRouteMapping() first.');
      return [];
    }

    return this.routeDetails
      .filter(detail => detail.maTuyenXe === routeCode)
      .sort((a, b) => (a.thuTu || 0) - (b.thuTu || 0))
      .map(detail => detail.tenDiemDon);
  }

  /**
   * Sắp xếp danh sách nhân viên theo thứ tự trạm trong tuyến
   */
  sortEmployeesByStationOrder(employees: any[], routeCode: string): any[] {
    if (!this.isLoaded) {
      console.warn('StationRouteMappingService - Data not loaded yet. Call loadStationRouteMapping() first.');
      return employees;
    }

    // Lấy thứ tự trạm từ Firebase
    const stationOrderMap = new Map<string, number>();
    this.routeDetails
      .filter(detail => detail.maTuyenXe === routeCode)
      .forEach(detail => {
        stationOrderMap.set(detail.tenDiemDon.toLowerCase(), detail.thuTu || 0);
        // Cũng lưu với tên đã normalize
        stationOrderMap.set(this.normalizeStationName(detail.tenDiemDon), detail.thuTu || 0);
      });

    console.log(`StationRouteMappingService - Sorting employees for route ${routeCode} by station order`);
    console.log(`StationRouteMappingService - Station order map:`, Array.from(stationOrderMap.entries()));

    return employees.sort((a, b) => {
      const orderA = stationOrderMap.get(a.tramXe?.toLowerCase()) || 
                    stationOrderMap.get(this.normalizeStationName(a.tramXe)) || 999;
      const orderB = stationOrderMap.get(b.tramXe?.toLowerCase()) || 
                    stationOrderMap.get(this.normalizeStationName(b.tramXe)) || 999;
      
      console.log(`StationRouteMappingService - Employee ${a.hoTen} at station "${a.tramXe}" has order ${orderA}`);
      console.log(`StationRouteMappingService - Employee ${b.hoTen} at station "${b.tramXe}" has order ${orderB}`);
      
      return orderA - orderB;
    });
  }

  /**
   * Lấy tất cả dữ liệu route details
   */
  getAllRouteDetails(): RouteDetail[] {
    if (!this.isLoaded) {
      console.warn('StationRouteMappingService - Data not loaded yet. Call loadStationRouteMapping() first.');
      return [];
    }
    return [...this.routeDetails];
  }

  /**
   * Get the station route mapping map (for internal use by other services)
   */
  getStationRouteMap(): Map<string, string> {
    return this.stationRouteMap;
  }

  /**
   * Normalize tên trạm để matching tốt hơn
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
}
