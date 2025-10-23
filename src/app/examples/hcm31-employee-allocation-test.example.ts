/**
 * Test example cho logic phân bổ 31 nhân viên HCM01+HCM02
 * 
 * Yêu cầu:
 * - HCM01 và HCM02 tổng 31 nhân viên → phân bổ cho 2 xe 16 chỗ (15 nhân viên mỗi xe)
 * - Số dư 1 nhân viên → sắp vào tuyến Biên Hòa dựa trên tên trạm
 */

export interface TestEmployee {
  hoTen: string;
  tramXe: string;
  maTuyenXe: string;
  dienThoai: string;
  thoiGianLamViec: {
    tu: string;
    den: string;
  };
}

// Dữ liệu test: 31 nhân viên từ HCM01 và HCM02
export const TEST_HCM_31_EMPLOYEES: TestEmployee[] = [
  // HCM01 employees (12 nhân viên)
  { hoTen: 'Mai Thanh Nga', tramXe: 'HCM01', maTuyenXe: 'HCM01', dienThoai: '0377706976', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Phạm Tòng Liêm', tramXe: 'HCM01', maTuyenXe: 'HCM01', dienThoai: '0708797097', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Phạm Thắng', tramXe: 'HCM01', maTuyenXe: 'HCM01', dienThoai: '0907667335', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Khưu Văn Nhơn', tramXe: 'HCM01', maTuyenXe: 'HCM01', dienThoai: '0989988148', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Lê Thành Châu', tramXe: 'Ngã 4 Thủ Đức', maTuyenXe: 'HCM01', dienThoai: '0908262300', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Phạm Anh Tuấn', tramXe: 'Ngã 4 Thủ Đức', maTuyenXe: 'HCM01', dienThoai: '0902262111', thoiGianLamViec: { tu: '15:45', den: '19:15' } },
  { hoTen: 'Huỳnh Văn Thời', tramXe: 'Ngã 4 Thủ Đức', maTuyenXe: 'HCM01', dienThoai: '0907428432', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Lê Ngọc Tạo', tramXe: 'Ngã 4 Thủ Đức', maTuyenXe: 'HCM01', dienThoai: '0933254299', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Ngô Đức Nguyên', tramXe: 'Ngã 4 Thủ Đức', maTuyenXe: 'HCM01', dienThoai: '0909793207', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Trần Văn Công', tramXe: 'RMK', maTuyenXe: 'HCM01', dienThoai: '0329126913', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Cao Ngọc Ấn', tramXe: 'RMK', maTuyenXe: 'HCM01', dienThoai: '0909674753', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Đinh Văn Hưng', tramXe: 'BV Hòa Hảo', maTuyenXe: 'HCM01', dienThoai: '0932771820', thoiGianLamViec: { tu: '15:45', den: '19:00' } },

  // HCM02 employees (19 nhân viên)
  { hoTen: 'Vũ Xuân Thời', tramXe: 'Ngã 3 Long Bình Tân', maTuyenXe: 'HCM02', dienThoai: '0938599189', thoiGianLamViec: { tu: '15:45', den: '19:15' } },
  { hoTen: 'Lê Trọng Hiếu', tramXe: 'Ngã 3 Long Bình Tân', maTuyenXe: 'HCM02', dienThoai: '0918535017', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Lãi Văn Lợi', tramXe: 'Ngã 3 Long Bình Tân', maTuyenXe: 'HCM02', dienThoai: '0368030572', thoiGianLamViec: { tu: '15:45', den: '19:15' } },
  { hoTen: 'Vũ Xuân Thời', tramXe: 'Ngã 3 Long Bình Tân', maTuyenXe: 'HCM02', dienThoai: '0938599189', thoiGianLamViec: { tu: '15:45', den: '19:15' } },
  { hoTen: 'Lê Trọng Hiếu', tramXe: 'Ngã 3 Long Bình Tân', maTuyenXe: 'HCM02', dienThoai: '0918535017', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Nguyễn Hoài Hữu', tramXe: 'Bà Chiểu', maTuyenXe: 'HCM02', dienThoai: '0907891712', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Nguyễn Mạnh Quân', tramXe: 'Bà Chiểu', maTuyenXe: 'HCM02', dienThoai: '0934445411', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Huỳnh Bảo Đại Phúc', tramXe: 'Bà Chiểu', maTuyenXe: 'HCM02', dienThoai: '', thoiGianLamViec: { tu: '15:45', den: '19:15' } },
  { hoTen: 'Ngô Thanh Dũng', tramXe: 'Chợ Gò Vấp', maTuyenXe: 'HCM02', dienThoai: '0976875390', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Trần Đức Quyết', tramXe: 'Chợ Gò Vấp', maTuyenXe: 'HCM02', dienThoai: '0934250304', thoiGianLamViec: { tu: '15:45', den: '19:15' } },
  { hoTen: 'Trần Thanh Hùng', tramXe: 'Chợ Gò Vấp', maTuyenXe: 'HCM02', dienThoai: '0906306580', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Đặng Thanh Phong', tramXe: 'Chợ Gò Vấp', maTuyenXe: 'HCM02', dienThoai: '0933964640', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Huỳnh Ngọc Thanh', tramXe: 'Chợ Gò Vấp', maTuyenXe: 'HCM02', dienThoai: '0903806711', thoiGianLamViec: { tu: '15:45', den: '19:15' } },
  { hoTen: 'Tạ Nguyễn Hoàng Nghĩa', tramXe: 'Hóc Môn (Chùa Hoằng Pháp)', maTuyenXe: 'HCM02', dienThoai: '0775678618', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Khưu Văn Nghĩa', tramXe: 'Ngã 4 Thủ Đức', maTuyenXe: 'HCM02', dienThoai: '0987527248', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Nguyễn Hữu Vi', tramXe: 'Ngã 4 Thủ Đức', maTuyenXe: 'HCM02', dienThoai: '0908802448', thoiGianLamViec: { tu: '15:45', den: '19:00' } },
  { hoTen: 'Trần Trọng Nghĩa', tramXe: 'Đinh Tiên Hoàng-ĐBP', maTuyenXe: 'HCM02', dienThoai: '0909853164', thoiGianLamViec: { tu: '15:45', den: '19:15' } },
  { hoTen: 'Nguyễn Thái Bình(1972)', tramXe: 'Hàng Xanh (Gần Văn Thánh)', maTuyenXe: 'HCM02', dienThoai: '0903601514', thoiGianLamViec: { tu: '15:45', den: '19:15' } },
  { hoTen: 'Nguyễn Chí Trường', tramXe: 'BV Hòa Hảo', maTuyenXe: 'HCM02', dienThoai: '0938629778', thoiGianLamViec: { tu: '15:45', den: '19:00' } }
];

/**
 * Mock logic phân bổ 31 nhân viên HCM
 */
export function mockApplyHCM31EmployeeAllocation(employees: TestEmployee[]): {
  hcm01Employees: TestEmployee[];
  hcm02Employees: TestEmployee[];
  overflowToBH: TestEmployee[];
} {
  console.log('=== TESTING HCM 31 EMPLOYEE ALLOCATION ===');
  console.log(`Total HCM employees: ${employees.length}`);
  
  // Phân loại nhân viên theo trạm ưu tiên HCM02
  const hcm02PriorityEmployees: TestEmployee[] = [];
  const otherHCMEmployees: TestEmployee[] = [];
  
  employees.forEach(employee => {
    if (isHCM02PriorityStation(employee.tramXe)) {
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
  
  // Chuyển nhân viên dư thừa sang tuyến Biên Hòa dựa trên tên trạm
  const overflowToBH = hcm02RemainingOverflow.map(employee => ({
    ...employee,
    maTuyenXe: assignEmployeeToBHRoute(employee.tramXe)
  }));
  
  console.log(`Final HCM distribution: HCM01=${hcm01Employees.length}, HCM02=${hcm02Employees.length}`);
  console.log(`Overflow to BH: ${overflowToBH.length} employees`);
  
  // Log chi tiết phân bổ
  console.log('\n=== HCM01 EMPLOYEES (15) ===');
  hcm01Employees.forEach((emp, index) => {
    console.log(`${index + 1}. ${emp.hoTen} - ${emp.tramXe}`);
  });
  
  console.log('\n=== HCM02 EMPLOYEES (15) ===');
  hcm02Employees.forEach((emp, index) => {
    console.log(`${index + 1}. ${emp.hoTen} - ${emp.tramXe}`);
  });
  
  console.log('\n=== OVERFLOW TO BH (1) ===');
  overflowToBH.forEach((emp, index) => {
    console.log(`${index + 1}. ${emp.hoTen} - ${emp.tramXe} → ${emp.maTuyenXe}`);
  });
  
  return {
    hcm01Employees,
    hcm02Employees,
    overflowToBH
  };
}

/**
 * Kiểm tra xem trạm có phải là trạm ưu tiên cho HCM02 không
 */
function isHCM02PriorityStation(station: string): boolean {
  if (!station) return false;
  
  const stationLower = station.toLowerCase();
  
  const hcm02PriorityStations = [
    'ngã 3 long bình tân', 'nga 3 long binh tan',
    'bà chiểu', 'ba chieu',
    'chợ gò vấp', 'cho go vap',
    'hóc môn', 'hoc mon',
    'chùa hoằng pháp', 'chua hoang phap'
  ];
  
  return hcm02PriorityStations.some(priorityStation =>
    stationLower.includes(priorityStation) || priorityStation.includes(stationLower)
  );
}

/**
 * Chuyển nhân viên dư thừa sang tuyến Biên Hòa dựa trên tên trạm
 */
function assignEmployeeToBHRoute(stationName: string): string {
  const normalizedStation = normalizeStationName(stationName);
  
  // Mapping các trạm HCM sang tuyến BH tương ứng
  const stationToBHMapping: { [key: string]: string } = {
    'ngã 3 bến gỗ': 'BH03',
    'nga 3 ben go': 'BH03',
    'ngã 3 long bình tân': 'BH04',
    'nga 3 long binh tan': 'BH04',
    'bà chiểu': 'BH02',
    'ba chieu': 'BH02',
    'chợ gò vấp': 'BH01',
    'cho go vap': 'BH01',
    'hóc môn': 'BH01',
    'hoc mon': 'BH01',
    'ngã 4 thủ đức': 'BH01',
    'nga 4 thu duc': 'BH01'
  };
  
  // Tìm trạm phù hợp nhất
  for (const [stationKey, bhRoute] of Object.entries(stationToBHMapping)) {
    if (normalizedStation.includes(stationKey) || stationKey.includes(normalizedStation)) {
      console.log(`Assigning employee from station "${stationName}" to BH route "${bhRoute}" based on matching station "${stationKey}"`);
      return bhRoute;
    }
  }
  
  // Nếu không tìm thấy trạm phù hợp, mặc định chuyển sang BH01
  console.log(`No matching BH station found for "${stationName}", defaulting to BH01`);
  return 'BH01';
}

/**
 * Normalize tên trạm để matching tốt hơn
 */
function normalizeStationName(stationName: string): string {
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

// Test execution
export function runHCM31EmployeeAllocationTest(): void {
  console.log('🚀 Running HCM 31 Employee Allocation Test...');
  
  const result = mockApplyHCM31EmployeeAllocation(TEST_HCM_31_EMPLOYEES);
  
  // Verify results
  console.log('\n=== VERIFICATION ===');
  console.log(`✅ HCM01 employees: ${result.hcm01Employees.length} (expected: 15)`);
  console.log(`✅ HCM02 employees: ${result.hcm02Employees.length} (expected: 15)`);
  console.log(`✅ Overflow to BH: ${result.overflowToBH.length} (expected: 1)`);
  console.log(`✅ Total processed: ${result.hcm01Employees.length + result.hcm02Employees.length + result.overflowToBH.length} (expected: 31)`);
  
  if (result.hcm01Employees.length === 15 && 
      result.hcm02Employees.length === 15 && 
      result.overflowToBH.length === 1) {
    console.log('🎉 TEST PASSED: HCM 31 Employee Allocation logic works correctly!');
  } else {
    console.log('❌ TEST FAILED: HCM 31 Employee Allocation logic needs adjustment');
  }
}

