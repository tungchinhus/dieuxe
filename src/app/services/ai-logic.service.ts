import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase.config';

@Injectable({
  providedIn: 'root'
})
export class AiLogicService {
  private functions = functions;

  constructor() { }

  /**
   * Gọi AI để phân tích dữ liệu xe
   * @param vehicleData Dữ liệu xe cần phân tích
   * @returns Observable với kết quả phân tích
   */
  analyzeVehicleData(vehicleData: any): Observable<any> {
    const analyzeVehicle = httpsCallable(this.functions, 'analyzeVehicleData');
    return from(analyzeVehicle(vehicleData));
  }

  /**
   * Gọi AI để tối ưu hóa tuyến đường
   * @param routeData Dữ liệu tuyến đường
   * @returns Observable với đề xuất tối ưu hóa
   */
  optimizeRoute(routeData: any): Observable<any> {
    const optimizeRoute = httpsCallable(this.functions, 'optimizeRoute');
    return from(optimizeRoute(routeData));
  }

  /**
   * Gọi AI để dự đoán nhu cầu vận chuyển
   * @param historicalData Dữ liệu lịch sử
   * @returns Observable với dự đoán
   */
  predictDemand(historicalData: any): Observable<any> {
    const predictDemand = httpsCallable(this.functions, 'predictDemand');
    return from(predictDemand(historicalData));
  }

  /**
   * Gọi AI để phân tích hiệu suất nhân viên
   * @param employeeData Dữ liệu nhân viên
   * @returns Observable với phân tích hiệu suất
   */
  analyzeEmployeePerformance(employeeData: any): Observable<any> {
    const analyzePerformance = httpsCallable(this.functions, 'analyzeEmployeePerformance');
    return from(analyzePerformance(employeeData));
  }

  /**
   * Gọi AI để tạo báo cáo thông minh
   * @param reportData Dữ liệu báo cáo
   * @returns Observable với báo cáo được tạo
   */
  generateSmartReport(reportData: any): Observable<any> {
    const generateReport = httpsCallable(this.functions, 'generateSmartReport');
    return from(generateReport(reportData));
  }

  /**
   * Gọi AI để đề xuất cải thiện hệ thống
   * @param systemData Dữ liệu hệ thống
   * @returns Observable với đề xuất cải thiện
   */
  getSystemImprovements(systemData: any): Observable<any> {
    const getImprovements = httpsCallable(this.functions, 'getSystemImprovements');
    return from(getImprovements(systemData));
  }
}
