/**
 * Test case để kiểm tra logic phân bổ HCM01 và HCM02 đúng cách
 * 
 * Kịch bản từ hình ảnh:
 * - HCM01: 13 nhân viên (cần thêm 2 để đủ 15)
 * - HCM02: 21 nhân viên (cần giảm 6 để chỉ còn 15)
 * - Tổng HCM: 34 nhân viên (vượt quá 30, cần chuyển 4 sang BH)
 * 
 * Kết quả mong đợi:
 * - HCM01: 15 nhân viên
 * - HCM02: 15 nhân viên
 * - BH routes: 4 nhân viên (từ overflow)
 */

import { Registration } from '../models/registration.model';

export class HCMAssignmentTestExample {
  
  /**
   * Tạo dữ liệu test dựa trên hình ảnh thực tế
   */
  static createTestDataFromImage(): Registration[] {
    const employees: Registration[] = [];
    
    // HCM01: 13 nhân viên (như trong hình)
    for (let i = 1; i <= 13; i++) {
      employees.push({
        id: `hcm01_${i}`,
        maNhanVien: `NV${i}`,
        hoTen: `HCM01 Employee ${i}`,
        dienThoai: `090000000${i}`,
        phongBan: 'IT',
        ngayDangKy: new Date().toISOString(),
        loaiCa: 'Ca ngày',
        thoiGianBatDau: '08:00',
        thoiGianKetThuc: '17:00',
        maTuyenXe: 'HCM01',
        tramXe: `HCM01 Station ${i}`,
        noiDungCongViec: 'Làm việc',
        dangKyCom: true
      });
    }
    
    // HCM02: 21 nhân viên (như trong hình)
    for (let i = 1; i <= 21; i++) {
      let station = '';
      if (i <= 4) {
        station = 'Ngã 3 Bến Gỗ'; // 4 nhân viên từ trạm này
      } else if (i <= 6) {
        station = 'Ngã 3 Long Bình Tân'; // 2 nhân viên từ trạm này
      } else if (i <= 10) {
        station = 'Ngã 4 Thủ Đức'; // 4 nhân viên từ trạm này
      } else if (i <= 13) {
        station = 'RMK'; // 3 nhân viên từ trạm này
      } else if (i <= 15) {
        station = 'Bà Chiểu'; // 2 nhân viên từ trạm này
      } else if (i <= 18) {
        station = 'Chợ Gò Vấp'; // 3 nhân viên từ trạm này
      } else {
        station = 'Hóc Môn (Chùa Hoằng Pháp)'; // 3 nhân viên từ trạm này
      }
      
      employees.push({
        id: `hcm02_${i}`,
        maNhanVien: `NV${i + 13}`,
        hoTen: `HCM02 Employee ${i}`,
        dienThoai: `090000000${i + 13}`,
        phongBan: 'IT',
        ngayDangKy: new Date().toISOString(),
        loaiCa: 'Ca ngày',
        thoiGianBatDau: '08:00',
        thoiGianKetThuc: '17:00',
        maTuyenXe: 'HCM02',
        tramXe: station,
        noiDungCongViec: 'Làm việc',
        dangKyCom: true
      });
    }
    
    return employees;
  }
  
  /**
   * Kiểm tra kết quả phân bổ HCM
   */
  static validateHCMAssignment(employees: Registration[]): void {
    console.log('=== HCM Assignment Test Results ===');
    
    // Đếm nhân viên theo tuyến
    const routeCounts = employees.reduce((counts, emp) => {
      counts[emp.maTuyenXe] = (counts[emp.maTuyenXe] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    console.log('Route distribution:', routeCounts);
    
    // Kiểm tra HCM01
    const hcm01Count = routeCounts['HCM01'] || 0;
    console.log(`HCM01: ${hcm01Count} employees (expected: 15)`);
    
    // Kiểm tra HCM02
    const hcm02Count = routeCounts['HCM02'] || 0;
    console.log(`HCM02: ${hcm02Count} employees (expected: 15)`);
    
    // Kiểm tra BH routes
    const bh01Count = routeCounts['BH01'] || 0;
    const bh02Count = routeCounts['BH02'] || 0;
    const bh03Count = routeCounts['BH03'] || 0;
    const bh04Count = routeCounts['BH04'] || 0;
    const totalBHCount = bh01Count + bh02Count + bh03Count + bh04Count;
    
    console.log(`BH01: ${bh01Count} employees`);
    console.log(`BH02: ${bh02Count} employees`);
    console.log(`BH03: ${bh03Count} employees`);
    console.log(`BH04: ${bh04Count} employees`);
    console.log(`Total BH: ${totalBHCount} employees (expected: 4)`);
    
    // Kiểm tra nhân viên từ "Ngã 3 Bến Gỗ" được chuyển sang BH03
    const nga3BenGoInBH03 = employees.filter(emp => 
      emp.maTuyenXe === 'BH03' && emp.tramXe === 'Ngã 3 Bến Gỗ'
    );
    console.log(`Ngã 3 Bến Gỗ in BH03: ${nga3BenGoInBH03.length} employees`);
    
    // Kiểm tra nhân viên từ "Ngã 3 Long Bình Tân" được chuyển sang BH04
    const nga3LongBinhTanInBH04 = employees.filter(emp => 
      emp.maTuyenXe === 'BH04' && emp.tramXe === 'Ngã 3 Long Bình Tân'
    );
    console.log(`Ngã 3 Long Bình Tân in BH04: ${nga3LongBinhTanInBH04.length} employees`);
    
    // Tổng kết
    const totalEmployees = employees.length;
    const totalHCM = hcm01Count + hcm02Count;
    
    console.log(`Total employees: ${totalEmployees} (expected: 34)`);
    console.log(`Total HCM: ${totalHCM} (expected: 30)`);
    console.log(`Total BH: ${totalBHCount} (expected: 4)`);
    
    // Validation
    const isValid = 
      hcm01Count === 15 &&
      hcm02Count === 15 &&
      totalBHCount === 4 &&
      totalEmployees === 34;
    
    console.log(`Test ${isValid ? 'PASSED' : 'FAILED'}`);
    
    if (!isValid) {
      console.log('Issues found:');
      if (hcm01Count !== 15) console.log(`- HCM01 has ${hcm01Count} employees, expected 15`);
      if (hcm02Count !== 15) console.log(`- HCM02 has ${hcm02Count} employees, expected 15`);
      if (totalBHCount !== 4) console.log(`- Total BH has ${totalBHCount} employees, expected 4`);
      if (totalEmployees !== 34) console.log(`- Total employees ${totalEmployees}, expected 34`);
    }
  }
  
  /**
   * Simulate overflow logic
   */
  static simulateOverflowLogic(employees: Registration[]): Registration[] {
    console.log('=== Simulating Overflow Logic ===');
    
    // Tìm nhân viên HCM
    const hcmEmployees = employees.filter(emp => 
      emp.maTuyenXe === 'HCM01' || emp.maTuyenXe === 'HCM02'
    );
    
    console.log(`Total HCM employees: ${hcmEmployees.length}`);
    
    // Kiểm tra overflow
    const maxHCMCapacity = 30; // 2 xe x 15 chỗ
    if (hcmEmployees.length > maxHCMCapacity) {
      const overflowCount = hcmEmployees.length - maxHCMCapacity;
      console.log(`HCM overflow: ${overflowCount} employees need to be reassigned`);
      
      // Phân loại nhân viên theo trạm ưu tiên HCM02
      const hcm02PriorityEmployees: Registration[] = [];
      const otherHCMEmployees: Registration[] = [];
      
      hcmEmployees.forEach(employee => {
        if (this.isHCM02PriorityStation(employee.tramXe)) {
          hcm02PriorityEmployees.push(employee);
        } else {
          otherHCMEmployees.push(employee);
        }
      });
      
      console.log(`HCM02 priority employees: ${hcm02PriorityEmployees.length}`);
      console.log(`Other HCM employees: ${otherHCMEmployees.length}`);
      
      // Phân bổ cho HCM02 (tối đa 15 nhân viên)
      const targetEmployeesPerHCMRoute = 15;
      let hcm02Employees = hcm02PriorityEmployees.slice(0, targetEmployeesPerHCMRoute);
      
      // Nếu HCM02 chưa đủ, lấy thêm từ nhân viên khác
      const remainingHCM02Slots = targetEmployeesPerHCMRoute - hcm02Employees.length;
      if (remainingHCM02Slots > 0) {
        const additionalForHCM02 = otherHCMEmployees.slice(0, remainingHCM02Slots);
        hcm02Employees.push(...additionalForHCM02);
      }
      
      // Phân bổ cho HCM01 (tối đa 15 nhân viên)
      const remainingForHCM01 = otherHCMEmployees.slice(remainingHCM02Slots);
      let hcm01Employees = remainingForHCM01.slice(0, targetEmployeesPerHCMRoute);
      
      // Nếu HCM01 chưa đủ, lấy thêm từ nhân viên HCM02 dư thừa
      const remainingHCM01Slots = targetEmployeesPerHCMRoute - hcm01Employees.length;
      if (remainingHCM01Slots > 0) {
        const hcm02Overflow = hcm02PriorityEmployees.slice(targetEmployeesPerHCMRoute);
        const additionalForHCM01 = hcm02Overflow.slice(0, remainingHCM01Slots);
        hcm01Employees.push(...additionalForHCM01);
      }
      
      // Nhân viên HCM02 dư thừa còn lại chuyển sang BH
      const hcm02RemainingOverflow = hcm02PriorityEmployees.slice(targetEmployeesPerHCMRoute + remainingHCM01Slots);
      
      // Đảm bảo không vượt quá 15 nhân viên mỗi tuyến
      if (hcm01Employees.length > targetEmployeesPerHCMRoute) {
        const hcm01Overflow = hcm01Employees.slice(targetEmployeesPerHCMRoute);
        hcm01Employees = hcm01Employees.slice(0, targetEmployeesPerHCMRoute);
        hcm02RemainingOverflow.push(...hcm01Overflow);
      }
      
      if (hcm02Employees.length > targetEmployeesPerHCMRoute) {
        const hcm02Overflow = hcm02Employees.slice(targetEmployeesPerHCMRoute);
        hcm02Employees = hcm02Employees.slice(0, targetEmployeesPerHCMRoute);
        hcm02RemainingOverflow.push(...hcm02Overflow);
      }
      
      console.log(`Final HCM distribution: HCM01=${hcm01Employees.length}, HCM02=${hcm02Employees.length}`);
      console.log(`Employees to move to BH: ${hcm02RemainingOverflow.length}`);
      
      // Cập nhật MaTuyenXe
      hcm01Employees.forEach(emp => emp.maTuyenXe = 'HCM01');
      hcm02Employees.forEach(emp => emp.maTuyenXe = 'HCM02');
      
      // Chuyển nhân viên dư thừa sang BH routes
      hcm02RemainingOverflow.forEach((employee, index) => {
        if (employee.tramXe === 'Ngã 3 Bến Gỗ') {
          employee.maTuyenXe = 'BH03';
        } else if (employee.tramXe === 'Ngã 3 Long Bình Tân') {
          employee.maTuyenXe = 'BH04';
        } else {
          employee.maTuyenXe = 'BH01'; // Fallback
        }
        console.log(`Moved ${employee.hoTen} from ${employee.tramXe} to ${employee.maTuyenXe}`);
      });
      
      // Kết hợp lại với nhân viên không phải HCM
      const nonHCMEmployees = employees.filter(emp => 
        emp.maTuyenXe !== 'HCM01' && emp.maTuyenXe !== 'HCM02'
      );
      
      return [
        ...nonHCMEmployees,
        ...hcm01Employees,
        ...hcm02Employees,
        ...hcm02RemainingOverflow
      ];
    }
    
    return employees;
  }
  
  /**
   * Kiểm tra xem trạm có phải là trạm ưu tiên cho HCM02 không
   */
  private static isHCM02PriorityStation(station: string): boolean {
    if (!station) return false;
    
    const stationLower = station.toLowerCase();
    
    const hcm02PriorityStations = [
      'ngã 3 long bình tân', 'nga 3 long binh tan',
      'bà chiểu', 'ba chieu',
      'chợ gò vấp', 'cho go vap', 'gò vấp', 'go vap',
      'hóc môn', 'hoc mon', 'hóc môn (chùa hoằng pháp)', 'hoc mon (chua hoang phap)', 'chùa hoằng pháp', 'chua hoang phap'
    ];
    
    return hcm02PriorityStations.some(priorityStation => 
      stationLower.includes(priorityStation) || priorityStation.includes(stationLower)
    );
  }
  
  /**
   * Chạy test
   */
  static runTest(): void {
    console.log('Running HCM Assignment Test...');
    
    const testData = this.createTestDataFromImage();
    console.log(`Created ${testData.length} test employees`);
    
    // Log initial distribution
    console.log('\n=== Initial Distribution ===');
    const initialRouteCounts = testData.reduce((counts, emp) => {
      counts[emp.maTuyenXe] = (counts[emp.maTuyenXe] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    console.log('Initial route distribution:', initialRouteCounts);
    
    // Apply overflow logic
    console.log('\n=== Applying Overflow Logic ===');
    const result = this.simulateOverflowLogic(testData);
    
    // Validate results
    console.log('\n=== Final Results ===');
    this.validateHCMAssignment(result);
  }
}

// Export để có thể sử dụng trong các test khác
export default HCMAssignmentTestExample;
