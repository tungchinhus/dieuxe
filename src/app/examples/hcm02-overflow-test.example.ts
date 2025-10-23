/**
 * Test case để kiểm tra logic HCM02 overflow với dữ liệu thực tế
 * 
 * Kịch bản từ hình ảnh:
 * - HCM02 có 21 nhân viên (vượt quá 15)
 * - Trong đó có nhân viên từ "Ngã 3 Bến Gỗ" và "Ngã 3 Long Bình Tân"
 * - Cần chuyển 6 nhân viên sang BH routes
 * - Đặc biệt: "Ngã 3 Bến Gỗ" → BH03, "Ngã 3 Long Bình Tân" → BH04
 */

import { Registration } from '../models/registration.model';

export class HCM02OverflowTestExample {
  
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
    const hcm02Stations = [
      'Ngã 3 Bến Gỗ',      // 3 nhân viên (STT 2, 3, 4)
      'Ngã 3 Bến Gỗ',      // 
      'Ngã 3 Bến Gỗ',      // 
      'Ngã 3 Long Bình Tân', // 3 nhân viên (STT 5, 6, 7)
      'Ngã 3 Long Bình Tân', // 
      'Ngã 3 Long Bình Tân', // 
      'Ngã 4 Thủ Đức',     // 3 nhân viên (STT 8, 9, 10)
      'Ngã 4 Thủ Đức',     // 
      'Ngã 4 Thủ Đức',     // 
      'RMK',               // 3 nhân viên (STT 11, 12, 13)
      'RMK',               // 
      'RMK',               // 
      'Bà Chiểu',          // 3 nhân viên (STT 14, 15, 16)
      'Bà Chiểu',          // 
      'Bà Chiểu',          // 
      'Chợ Gò Vấp',        // 4 nhân viên (STT 17, 18, 19, 20)
      'Chợ Gò Vấp',        // 
      'Chợ Gò Vấp',        // 
      'Chợ Gò Vấp',        // 
      'Hóc Môn (Chùa Hoằng Pháp)', // 1 nhân viên (STT 21)
      'Hóc Môn (Chùa Hoằng Pháp)'  // 1 nhân viên nữa để đủ 21
    ];
    
    for (let i = 1; i <= 21; i++) {
      const station = hcm02Stations[i - 1];
      
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
   * Kiểm tra kết quả phân bổ HCM02 overflow
   */
  static validateHCM02Overflow(employees: Registration[]): void {
    console.log('=== HCM02 Overflow Test Results ===');
    
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
    
    // Kiểm tra BH03
    const bh03Count = routeCounts['BH03'] || 0;
    console.log(`BH03: ${bh03Count} employees (expected: 3 from Ngã 3 Bến Gỗ)`);
    
    // Kiểm tra BH04
    const bh04Count = routeCounts['BH04'] || 0;
    console.log(`BH04: ${bh04Count} employees (expected: 3 from Ngã 3 Long Bình Tân)`);
    
    // Kiểm tra nhân viên từ "Ngã 3 Bến Gỗ" được chuyển sang BH03
    const nga3BenGoInBH03 = employees.filter(emp => 
      emp.maTuyenXe === 'BH03' && emp.tramXe === 'Ngã 3 Bến Gỗ'
    );
    console.log(`Ngã 3 Bến Gỗ in BH03: ${nga3BenGoInBH03.length} employees (expected: 3)`);
    
    // Kiểm tra nhân viên từ "Ngã 3 Long Bình Tân" được chuyển sang BH04
    const nga3LongBinhTanInBH04 = employees.filter(emp => 
      emp.maTuyenXe === 'BH04' && emp.tramXe === 'Ngã 3 Long Bình Tân'
    );
    console.log(`Ngã 3 Long Bình Tân in BH04: ${nga3LongBinhTanInBH04.length} employees (expected: 3)`);
    
    // Tổng kết
    const totalEmployees = employees.length;
    const totalHCM = hcm01Count + hcm02Count;
    const totalBH = bh03Count + bh04Count;
    
    console.log(`Total employees: ${totalEmployees} (expected: 34)`);
    console.log(`Total HCM: ${totalHCM} (expected: 30)`);
    console.log(`Total BH: ${totalBH} (expected: 6)`);
    
    // Validation
    const isValid = 
      hcm01Count === 15 &&
      hcm02Count === 15 &&
      nga3BenGoInBH03.length === 3 &&
      nga3LongBinhTanInBH04.length === 3 &&
      totalEmployees === 34;
    
    console.log(`Test ${isValid ? 'PASSED' : 'FAILED'}`);
    
    if (!isValid) {
      console.log('Issues found:');
      if (hcm01Count !== 15) console.log(`- HCM01 has ${hcm01Count} employees, expected 15`);
      if (hcm02Count !== 15) console.log(`- HCM02 has ${hcm02Count} employees, expected 15`);
      if (nga3BenGoInBH03.length !== 3) console.log(`- Ngã 3 Bến Gỗ in BH03 has ${nga3BenGoInBH03.length} employees, expected 3`);
      if (nga3LongBinhTanInBH04.length !== 3) console.log(`- Ngã 3 Long Bình Tân in BH04 has ${nga3LongBinhTanInBH04.length} employees, expected 3`);
      if (totalEmployees !== 34) console.log(`- Total employees ${totalEmployees}, expected 34`);
    }
  }
  
  /**
   * Simulate HCM02 overflow logic
   */
  static simulateHCM02OverflowLogic(employees: Registration[]): Registration[] {
    console.log('=== Simulating HCM02 Overflow Logic ===');
    
    // Tìm nhân viên HCM02
    const hcm02Employees = employees.filter(emp => emp.maTuyenXe === 'HCM02');
    console.log(`HCM02 employees: ${hcm02Employees.length}`);
    
    // Kiểm tra overflow
    const targetEmployeesPerHCMRoute = 15;
    if (hcm02Employees.length > targetEmployeesPerHCMRoute) {
      const overflowCount = hcm02Employees.length - targetEmployeesPerHCMRoute;
      console.log(`HCM02 overflow: ${overflowCount} employees need to be reassigned`);
      
      // Phân loại nhân viên theo trạm ưu tiên HCM02
      const hcm02PriorityEmployees: Registration[] = [];
      const otherHCMEmployees: Registration[] = [];
      
      hcm02Employees.forEach(employee => {
        if (this.isHCM02PriorityStation(employee.tramXe)) {
          hcm02PriorityEmployees.push(employee);
        } else {
          otherHCMEmployees.push(employee);
        }
      });
      
      console.log(`HCM02 priority employees: ${hcm02PriorityEmployees.length}`);
      console.log(`Other HCM employees: ${otherHCMEmployees.length}`);
      
      // Phân bổ cho HCM02 (tối đa 15 nhân viên)
      let hcm02FinalEmployees = hcm02PriorityEmployees.slice(0, targetEmployeesPerHCMRoute);
      
      // Nếu HCM02 chưa đủ, lấy thêm từ nhân viên khác
      const remainingHCM02Slots = targetEmployeesPerHCMRoute - hcm02FinalEmployees.length;
      if (remainingHCM02Slots > 0) {
        const additionalForHCM02 = otherHCMEmployees.slice(0, remainingHCM02Slots);
        hcm02FinalEmployees.push(...additionalForHCM02);
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
      
      // Đặc biệt: Ưu tiên chuyển Ngã 3 Bến Gỗ và Ngã 3 Long Bình Tân sang BH03/BH04
      const stationsToMoveToBH = ['ngã 3 bến gỗ', 'nga 3 ben go', 'ngã 3 long bình tân', 'nga 3 long binh tan'];
      
      hcm02RemainingOverflow.forEach(employee => {
        const stationLower = employee.tramXe.toLowerCase();
        const shouldMoveToBH = stationsToMoveToBH.some(station =>
          stationLower.includes(station) || station.includes(stationLower)
        );
        
        if (shouldMoveToBH) {
          console.log(`Moving employee ${employee.hoTen} from station ${employee.tramXe} to BH route due to HCM02 overflow`);
          
          // Phân biệt cụ thể: Ngã 3 Bến Gỗ → BH03, Ngã 3 Long Bình Tân → BH04
          if (stationLower.includes('ngã 3 bến gỗ') || stationLower.includes('nga 3 ben go')) {
            employee.maTuyenXe = 'BH03';
            console.log(`Assigned ${employee.hoTen} to BH03`);
          } else if (stationLower.includes('ngã 3 long bình tân') || stationLower.includes('nga 3 long binh tan')) {
            employee.maTuyenXe = 'BH04';
            console.log(`Assigned ${employee.hoTen} to BH04`);
          } else {
            employee.maTuyenXe = 'BH01'; // Fallback
            console.log(`Assigned ${employee.hoTen} to BH01 (fallback)`);
          }
        }
      });
      
      // Thêm các nhân viên khác không phải từ trạm đặc biệt
      const otherOverflowEmployees = hcm02RemainingOverflow.filter(employee => {
        const stationLower = employee.tramXe.toLowerCase();
        return !stationsToMoveToBH.some(station =>
          stationLower.includes(station) || station.includes(stationLower)
        );
      });
      
      otherOverflowEmployees.forEach(employee => {
        employee.maTuyenXe = 'BH01'; // Fallback
        console.log(`Assigned ${employee.hoTen} to BH01 (other overflow)`);
      });
      
      // Đảm bảo không vượt quá 15 nhân viên mỗi tuyến
      if (hcm01Employees.length > targetEmployeesPerHCMRoute) {
        const hcm01Overflow = hcm01Employees.slice(targetEmployeesPerHCMRoute);
        hcm01Employees = hcm01Employees.slice(0, targetEmployeesPerHCMRoute);
        hcm01Overflow.forEach(emp => emp.maTuyenXe = 'BH01');
        console.log(`Moved ${hcm01Overflow.length} HCM01 overflow employees to BH01`);
      }
      
      if (hcm02FinalEmployees.length > targetEmployeesPerHCMRoute) {
        const hcm02Overflow = hcm02FinalEmployees.slice(targetEmployeesPerHCMRoute);
        hcm02FinalEmployees = hcm02FinalEmployees.slice(0, targetEmployeesPerHCMRoute);
        hcm02Overflow.forEach(emp => emp.maTuyenXe = 'BH01');
        console.log(`Moved ${hcm02Overflow.length} HCM02 overflow employees to BH01`);
      }
      
      console.log(`Final HCM distribution: HCM01=${hcm01Employees.length}, HCM02=${hcm02FinalEmployees.length}`);
      
      // Cập nhật MaTuyenXe
      hcm01Employees.forEach(emp => emp.maTuyenXe = 'HCM01');
      hcm02FinalEmployees.forEach(emp => emp.maTuyenXe = 'HCM02');
      
      // Kết hợp lại với nhân viên không phải HCM
      const nonHCMEmployees = employees.filter(emp => 
        emp.maTuyenXe !== 'HCM01' && emp.maTuyenXe !== 'HCM02'
      );
      
      return [
        ...nonHCMEmployees,
        ...hcm01Employees,
        ...hcm02FinalEmployees,
        ...hcm02RemainingOverflow,
        ...otherOverflowEmployees
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
      'hóc môn', 'hoc mon', 'hóc môn (chùa hoằng pháp)', 'hoc mon (chua hoang phap)', 'chùa hoằng pháp', 'chua hoang phap',
      'ngã 3 bến gỗ', 'nga 3 ben go' // Thêm Ngã 3 Bến Gỗ vào danh sách ưu tiên
    ];
    
    return hcm02PriorityStations.some(priorityStation => 
      stationLower.includes(priorityStation) || priorityStation.includes(stationLower)
    );
  }
  
  /**
   * Chạy test
   */
  static runTest(): void {
    console.log('Running HCM02 Overflow Test...');
    
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
    console.log('\n=== Applying HCM02 Overflow Logic ===');
    const result = this.simulateHCM02OverflowLogic(testData);
    
    // Validate results
    console.log('\n=== Final Results ===');
    this.validateHCM02Overflow(result);
  }
}

// Export để có thể sử dụng trong các test khác
export default HCM02OverflowTestExample;
