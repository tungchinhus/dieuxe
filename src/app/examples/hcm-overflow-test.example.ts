/**
 * Test case cho logic phân bổ HCM mới
 * 
 * Yêu cầu:
 * - < 30 nhân viên HCM: chia đều cho HCM01, HCM02
 * - >= 30 nhân viên HCM: ưu tiên nhân viên không trùng trạm BH, đảm bảo đủ 2 xe 16 chỗ (15 nhân viên)
 * - Phần dư còn lại sắp qua tuyến Biên Hòa
 */

export interface TestEmployee {
  NhanVienID: number;
  HoTen: string;
  TramXe: string;
  MaTuyenXe: string;
  DienThoai: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface TestRouteDetail {
  id: string;
  maTuyenXe: string;
  tenDiemDung: string;
  thuTu: number;
}

export interface TestResult {
  scenario: string;
  totalHCMEmployees: number;
  employeesNotMatchingBH: number;
  employeesMatchingBH: number;
  hcm01Count: number;
  hcm02Count: number;
  bhOverflowCount: number;
  passed: boolean;
}

/**
 * Test scenarios
 */
export const testScenarios = [
  {
    name: "Scenario 1: < 30 nhân viên HCM",
    description: "25 nhân viên HCM, không có trùng trạm BH",
    hcmEmployees: 25,
    matchingBH: 0,
    expectedHCM01: 13,
    expectedHCM02: 12,
    expectedBHOverflow: 0
  },
  {
    name: "Scenario 2: >= 30 nhân viên HCM, đủ nhân viên không trùng trạm BH",
    description: "40 nhân viên HCM, 35 không trùng trạm BH, 5 trùng trạm BH",
    hcmEmployees: 40,
    matchingBH: 5,
    expectedHCM01: 15,
    expectedHCM02: 15,
    expectedBHOverflow: 5
  },
  {
    name: "Scenario 3: >= 30 nhân viên HCM, thiếu nhân viên không trùng trạm BH",
    description: "35 nhân viên HCM, 20 không trùng trạm BH, 15 trùng trạm BH",
    hcmEmployees: 35,
    matchingBH: 15,
    expectedHCM01: 15,
    expectedHCM02: 15,
    expectedBHOverflow: 5
  },
  {
    name: "Scenario 4: >= 30 nhân viên HCM, nhiều nhân viên trùng trạm BH",
    description: "50 nhân viên HCM, 10 không trùng trạm BH, 40 trùng trạm BH",
    hcmEmployees: 50,
    matchingBH: 40,
    expectedHCM01: 15,
    expectedHCM02: 15,
    expectedBHOverflow: 20
  }
];

/**
 * Mock BH stations for testing
 */
export const mockBHStations = [
  "Ngã 3 Bến Gỗ",
  "Ngã 3 Long Bình Tân", 
  "Ngã 4 Thủ Đức",
  "RMK",
  "Ngã 3 Cát Lái",
  "Hàng xanh",
  "Bà Chiểu",
  "Chợ Gò Vấp"
];

/**
 * Mock HCM stations (không trùng với BH)
 */
export const mockHCMStations = [
  "Đinh Tiên Hoàng",
  "BV Hòa Hảo",
  "Trường Lý Tự Trọng",
  "Hóc Môn",
  "Công Viên Tam Hiệp",
  "Cổng 11 (Cây xăng Thành Thái Thịnh)"
];

/**
 * Generate test employees
 */
export function generateTestEmployees(scenario: any): TestEmployee[] {
  const employees: TestEmployee[] = [];
  let employeeId = 1;
  
  // Generate HCM employees not matching BH
  const hcmNotMatchingBH = scenario.hcmEmployees - scenario.matchingBH;
  for (let i = 0; i < hcmNotMatchingBH; i++) {
    employees.push({
      NhanVienID: employeeId++,
      HoTen: `HCM Employee ${i + 1}`,
      TramXe: mockHCMStations[i % mockHCMStations.length],
      MaTuyenXe: 'HCM01', // Will be redistributed
      DienThoai: `090000000${i + 1}`,
      CreatedAt: new Date(),
      UpdatedAt: new Date()
    });
  }
  
  // Generate HCM employees matching BH
  for (let i = 0; i < scenario.matchingBH; i++) {
    employees.push({
      NhanVienID: employeeId++,
      HoTen: `HCM-BH Employee ${i + 1}`,
      TramXe: mockBHStations[i % mockBHStations.length],
      MaTuyenXe: 'HCM02', // Will be redistributed
      DienThoai: `090000000${hcmNotMatchingBH + i + 1}`,
      CreatedAt: new Date(),
      UpdatedAt: new Date()
    });
  }
  
  return employees;
}

/**
 * Mock logic overflow HCM (sao chép từ service)
 */
export function mockApplyHCMOverflowLogic(employees: TestEmployee[]): TestEmployee[] {
  // Lọc nhân viên HCM
  const hcmEmployees = employees.filter(emp => 
    emp.MaTuyenXe === 'HCM01' || emp.MaTuyenXe === 'HCM02' || emp.MaTuyenXe === 'HCM03'
  );
  
  const totalHCMEmployees = hcmEmployees.length;
  console.log('Total HCM employees:', totalHCMEmployees);
  
  // Nếu tổng HCM < 30, chia đều cho HCM01 và HCM02
  if (totalHCMEmployees < 30) {
    console.log('HCM employees < 30, distributing evenly between HCM01 and HCM02');
    return distributeHCMEvenly(employees, hcmEmployees);
  }
  
  console.log('HCM employees >= 30, applying overflow logic...');
  
  // Phân loại nhân viên HCM: không trùng trạm BH vs trùng trạm BH
  const employeesNotMatchingBH: TestEmployee[] = [];
  const employeesMatchingBH: TestEmployee[] = [];
  
  hcmEmployees.forEach(employee => {
    const stationName = normalizeStationName(employee.TramXe || '');
    
    // Kiểm tra xem trạm có khớp với trạm BH không
    const matchingBHStation = mockBHStations.find(bhStation => 
      normalizeStationName(bhStation) === stationName ||
      stationName.includes(normalizeStationName(bhStation)) ||
      normalizeStationName(bhStation).includes(stationName)
    );
    
    if (matchingBHStation) {
      console.log(`Employee ${employee.HoTen} at station ${employee.TramXe} matches BH station ${matchingBHStation}`);
      employeesMatchingBH.push(employee);
    } else {
      employeesNotMatchingBH.push(employee);
    }
  });
  
  console.log(`Employees not matching BH: ${employeesNotMatchingBH.length}, Employees matching BH: ${employeesMatchingBH.length}`);
  
  // Ưu tiên nhân viên không trùng trạm BH cho HCM01 và HCM02
  // Mỗi tuyến cần 15 nhân viên (2 xe 16 chỗ)
  const targetEmployeesPerHCMRoute = 15;
  const totalTargetHCM = targetEmployeesPerHCMRoute * 2; // HCM01 + HCM02
  
  // Lấy nhân viên không trùng trạm BH trước (tối đa 30 người)
  const hcm01Employees = employeesNotMatchingBH.slice(0, targetEmployeesPerHCMRoute);
  const hcm02Employees = employeesNotMatchingBH.slice(targetEmployeesPerHCMRoute, totalTargetHCM);
  
  // Nếu không đủ nhân viên không trùng trạm BH, lấy thêm từ nhân viên trùng trạm BH
  const remainingHCMSlots = totalTargetHCM - (hcm01Employees.length + hcm02Employees.length);
  if (remainingHCMSlots > 0) {
    const additionalEmployees = employeesMatchingBH.slice(0, remainingHCMSlots);
    const halfAdditional = Math.ceil(additionalEmployees.length / 2);
    
    hcm01Employees.push(...additionalEmployees.slice(0, halfAdditional));
    hcm02Employees.push(...additionalEmployees.slice(halfAdditional));
  }
  
  // Phần dư còn lại (nhân viên trùng trạm BH) sắp qua tuyến Biên Hòa
  const remainingEmployees = employeesMatchingBH.slice(remainingHCMSlots);
  console.log(`Remaining employees to be assigned to BH routes: ${remainingEmployees.length}`);
  
  // Cập nhật MaTuyenXe cho các nhân viên
  hcm01Employees.forEach(emp => emp.MaTuyenXe = 'HCM01');
  hcm02Employees.forEach(emp => emp.MaTuyenXe = 'HCM02');
  
  // Chuyển nhân viên dư thừa vào BH routes
  remainingEmployees.forEach(employee => {
    employee.MaTuyenXe = 'BH01'; // Simplified for testing
  });
  
  // Kết hợp lại với nhân viên không phải HCM
  const nonHCMEmployees = employees.filter(emp => 
    emp.MaTuyenXe !== 'HCM01' && emp.MaTuyenXe !== 'HCM02' && emp.MaTuyenXe !== 'HCM03'
  );
  
  const result = [
    ...nonHCMEmployees,
    ...hcm01Employees,
    ...hcm02Employees,
    ...remainingEmployees
  ];
  
  console.log('Final HCM distribution:');
  console.log(`HCM01: ${hcm01Employees.length} employees`);
  console.log(`HCM02: ${hcm02Employees.length} employees`);
  console.log(`BH routes: ${remainingEmployees.length} employees`);
  
  return result;
}

/**
 * Chia đều nhân viên HCM cho HCM01 và HCM02 khi tổng < 30
 */
function distributeHCMEvenly(allEmployees: TestEmployee[], hcmEmployees: TestEmployee[]): TestEmployee[] {
  // Chia đều cho HCM01 và HCM02
  const halfCount = Math.ceil(hcmEmployees.length / 2);
  const hcm01Employees = hcmEmployees.slice(0, halfCount);
  const hcm02Employees = hcmEmployees.slice(halfCount);
  
  // Cập nhật MaTuyenXe
  hcm01Employees.forEach(emp => emp.MaTuyenXe = 'HCM01');
  hcm02Employees.forEach(emp => emp.MaTuyenXe = 'HCM02');
  
  // Kết hợp lại với nhân viên không phải HCM
  const nonHCMEmployees = allEmployees.filter(emp => 
    emp.MaTuyenXe !== 'HCM01' && emp.MaTuyenXe !== 'HCM02' && emp.MaTuyenXe !== 'HCM03'
  );
  
  const result = [
    ...nonHCMEmployees,
    ...hcm01Employees,
    ...hcm02Employees
  ];
  
  console.log('HCM distribution (even):');
  console.log(`HCM01: ${hcm01Employees.length} employees`);
  console.log(`HCM02: ${hcm02Employees.length} employees`);
  
  return result;
}

/**
 * Normalize station name
 */
function normalizeStationName(stationName: string): string {
  if (!stationName) return '';
  return stationName.toLowerCase().trim();
}

/**
 * Run all test scenarios
 */
export function runHCMOverflowTests(): TestResult[] {
  const results: TestResult[] = [];
  
  testScenarios.forEach(scenario => {
    console.log(`\n=== ${scenario.name} ===`);
    console.log(scenario.description);
    
    // Generate test employees
    const testEmployees = generateTestEmployees(scenario);
    
    // Apply overflow logic
    const processedEmployees = mockApplyHCMOverflowLogic(testEmployees);
    
    // Count results
    const hcm01Count = processedEmployees.filter(emp => emp.MaTuyenXe === 'HCM01').length;
    const hcm02Count = processedEmployees.filter(emp => emp.MaTuyenXe === 'HCM02').length;
    const bhOverflowCount = processedEmployees.filter(emp => emp.MaTuyenXe === 'BH01').length;
    
    // Check if test passed
    const passed = hcm01Count === scenario.expectedHCM01 && 
                  hcm02Count === scenario.expectedHCM02 && 
                  bhOverflowCount === scenario.expectedBHOverflow;
    
    const result: TestResult = {
      scenario: scenario.name,
      totalHCMEmployees: scenario.hcmEmployees,
      employeesNotMatchingBH: scenario.hcmEmployees - scenario.matchingBH,
      employeesMatchingBH: scenario.matchingBH,
      hcm01Count,
      hcm02Count,
      bhOverflowCount,
      passed
    };
    
    results.push(result);
    
    console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Expected: HCM01=${scenario.expectedHCM01}, HCM02=${scenario.expectedHCM02}, BH=${scenario.expectedBHOverflow}`);
    console.log(`Actual: HCM01=${hcm01Count}, HCM02=${hcm02Count}, BH=${bhOverflowCount}`);
  });
  
  return results;
}

/**
 * Print test results summary
 */
export function printHCMOverflowTestResults(): void {
  const results = runHCMOverflowTests();
  
  console.log('\n=== TỔNG KẾT KẾT QUẢ TEST LOGIC HCM OVERFLOW ===\n');
  
  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`Test ${index + 1}: ${status}`);
    console.log(`  Scenario: ${result.scenario}`);
    console.log(`  Total HCM: ${result.totalHCMEmployees}`);
    console.log(`  Not matching BH: ${result.employeesNotMatchingBH}`);
    console.log(`  Matching BH: ${result.employeesMatchingBH}`);
    console.log(`  HCM01: ${result.hcm01Count}`);
    console.log(`  HCM02: ${result.hcm02Count}`);
    console.log(`  BH Overflow: ${result.bhOverflowCount}`);
    console.log('');
  });
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`Tổng kết: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('🎉 Tất cả tests đều PASS! Logic HCM overflow đã hoạt động đúng.');
  } else {
    console.log('⚠️  Có tests FAIL. Cần kiểm tra lại logic.');
  }
}

