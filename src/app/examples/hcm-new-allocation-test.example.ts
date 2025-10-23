/**
 * Test example cho logic phân bổ HCM mới
 * 
 * Yêu cầu:
 * - Số lượng < 30: Chia đều cho HCM01 và HCM02
 * - Số lượng ≥ 30: Ghép trạm HCM vào trạm Biên Hòa từ DB
 * - Nguyên tắc: Dựa vào trạm nhân viên đăng ký → tìm tuyến xe có trạm giống
 * - Dữ liệu: Phải lấy từ DB, không hardcode
 */

export interface TestEmployee {
  hoTen: string;
  tramXe: string;
  maTuyenXe: string;
  dienThoai: string;
}

export interface TestRouteDetail {
  maTuyenXe: string;
  tenDiemDon: string;
  thuTu: number;
}

// Dữ liệu test: < 30 nhân viên HCM
export const TEST_HCM_LESS_THAN_30: TestEmployee[] = [
  { hoTen: 'Nguyễn Văn A', tramXe: 'Ngã 3 Long Bình Tân', maTuyenXe: 'HCM02', dienThoai: '0901234567' },
  { hoTen: 'Trần Thị B', tramXe: 'Bà Chiểu', maTuyenXe: 'HCM02', dienThoai: '0901234568' },
  { hoTen: 'Lê Văn C', tramXe: 'Chợ Gò Vấp', maTuyenXe: 'HCM02', dienThoai: '0901234569' },
  { hoTen: 'Phạm Thị D', tramXe: 'Ngã 4 Thủ Đức', maTuyenXe: 'HCM01', dienThoai: '0901234570' },
  { hoTen: 'Hoàng Văn E', tramXe: 'RMK', maTuyenXe: 'HCM01', dienThoai: '0901234571' },
  { hoTen: 'Vũ Thị F', tramXe: 'BV Hòa Hảo', maTuyenXe: 'HCM01', dienThoai: '0901234572' },
  { hoTen: 'Đặng Văn G', tramXe: 'Hàng Xanh', maTuyenXe: 'HCM02', dienThoai: '0901234573' },
  { hoTen: 'Bùi Thị H', tramXe: 'Hóc Môn', maTuyenXe: 'HCM02', dienThoai: '0901234574' },
  { hoTen: 'Ngô Văn I', tramXe: 'Đinh Tiên Hoàng', maTuyenXe: 'HCM01', dienThoai: '0901234575' },
  { hoTen: 'Dương Thị K', tramXe: 'Ngã 3 Bến Gỗ', maTuyenXe: 'HCM02', dienThoai: '0901234576' },
  { hoTen: 'Lý Văn L', tramXe: 'Chùa Hoằng Pháp', maTuyenXe: 'HCM02', dienThoai: '0901234577' },
  { hoTen: 'Tôn Thị M', tramXe: 'Ngã 4 Thủ Đức', maTuyenXe: 'HCM01', dienThoai: '0901234578' },
  { hoTen: 'Cao Văn N', tramXe: 'RMK', maTuyenXe: 'HCM01', dienThoai: '0901234579' },
  { hoTen: 'Lưu Thị O', tramXe: 'BV Hòa Hảo', maTuyenXe: 'HCM01', dienThoai: '0901234580' }
];

// Dữ liệu test: ≥ 30 nhân viên HCM
export const TEST_HCM_GREATER_THAN_30: TestEmployee[] = [
  ...TEST_HCM_LESS_THAN_30,
  { hoTen: 'Phan Văn P', tramXe: 'Ngã 3 Long Bình Tân', maTuyenXe: 'HCM02', dienThoai: '0901234581' },
  { hoTen: 'Võ Thị Q', tramXe: 'Bà Chiểu', maTuyenXe: 'HCM02', dienThoai: '0901234582' },
  { hoTen: 'Đinh Văn R', tramXe: 'Chợ Gò Vấp', maTuyenXe: 'HCM02', dienThoai: '0901234583' },
  { hoTen: 'Trương Thị S', tramXe: 'Ngã 4 Thủ Đức', maTuyenXe: 'HCM01', dienThoai: '0901234584' },
  { hoTen: 'Lâm Văn T', tramXe: 'RMK', maTuyenXe: 'HCM01', dienThoai: '0901234585' },
  { hoTen: 'Hồ Thị U', tramXe: 'BV Hòa Hảo', maTuyenXe: 'HCM01', dienThoai: '0901234586' },
  { hoTen: 'Nguyễn Văn V', tramXe: 'Hàng Xanh', maTuyenXe: 'HCM02', dienThoai: '0901234587' },
  { hoTen: 'Trần Thị W', tramXe: 'Hóc Môn', maTuyenXe: 'HCM02', dienThoai: '0901234588' },
  { hoTen: 'Lê Văn X', tramXe: 'Đinh Tiên Hoàng', maTuyenXe: 'HCM01', dienThoai: '0901234589' },
  { hoTen: 'Phạm Thị Y', tramXe: 'Ngã 3 Bến Gỗ', maTuyenXe: 'HCM02', dienThoai: '0901234590' },
  { hoTen: 'Hoàng Văn Z', tramXe: 'Chùa Hoằng Pháp', maTuyenXe: 'HCM02', dienThoai: '0901234591' },
  { hoTen: 'Vũ Thị AA', tramXe: 'Ngã 4 Thủ Đức', maTuyenXe: 'HCM01', dienThoai: '0901234592' },
  { hoTen: 'Đặng Văn BB', tramXe: 'RMK', maTuyenXe: 'HCM01', dienThoai: '0901234593' },
  { hoTen: 'Bùi Thị CC', tramXe: 'BV Hòa Hảo', maTuyenXe: 'HCM01', dienThoai: '0901234594' },
  { hoTen: 'Ngô Văn DD', tramXe: 'Ngã 3 Long Bình Tân', maTuyenXe: 'HCM02', dienThoai: '0901234595' },
  { hoTen: 'Dương Thị EE', tramXe: 'Bà Chiểu', maTuyenXe: 'HCM02', dienThoai: '0901234596' },
  { hoTen: 'Lý Văn FF', tramXe: 'Chợ Gò Vấp', maTuyenXe: 'HCM02', dienThoai: '0901234597' },
  { hoTen: 'Tôn Thị GG', tramXe: 'Ngã 4 Thủ Đức', maTuyenXe: 'HCM01', dienThoai: '0901234598' },
  { hoTen: 'Cao Văn HH', tramXe: 'RMK', maTuyenXe: 'HCM01', dienThoai: '0901234599' },
  { hoTen: 'Lưu Thị II', tramXe: 'BV Hòa Hảo', maTuyenXe: 'HCM01', dienThoai: '0901234600' }
];

// Dữ liệu trạm BH từ DB (mock)
export const TEST_BH_ROUTE_DETAILS: TestRouteDetail[] = [
  { maTuyenXe: 'BH01', tenDiemDon: 'Ngã 4 Thủ Đức', thuTu: 1 },
  { maTuyenXe: 'BH01', tenDiemDon: 'RMK', thuTu: 2 },
  { maTuyenXe: 'BH01', tenDiemDon: 'BV Hòa Hảo', thuTu: 3 },
  { maTuyenXe: 'BH01', tenDiemDon: 'Chợ Gò Vấp', thuTu: 4 },
  { maTuyenXe: 'BH01', tenDiemDon: 'Hóc Môn', thuTu: 5 },
  
  { maTuyenXe: 'BH02', tenDiemDon: 'Bà Chiểu', thuTu: 1 },
  { maTuyenXe: 'BH02', tenDiemDon: 'Hàng Xanh', thuTu: 2 },
  { maTuyenXe: 'BH02', tenDiemDon: 'Đinh Tiên Hoàng', thuTu: 3 },
  
  { maTuyenXe: 'BH03', tenDiemDon: 'Ngã 3 Bến Gỗ', thuTu: 1 },
  { maTuyenXe: 'BH03', tenDiemDon: 'Chùa Hoằng Pháp', thuTu: 2 },
  
  { maTuyenXe: 'BH04', tenDiemDon: 'Ngã 3 Long Bình Tân', thuTu: 1 },
  { maTuyenXe: 'BH04', tenDiemDon: 'Ngã 3 Hãng Dầu', thuTu: 2 }
];

/**
 * Mock logic phân bổ HCM mới
 */
export function mockApplyHCMNewLogic(
  employees: TestEmployee[], 
  routeDetails: TestRouteDetail[]
): {
  hcm01Employees: TestEmployee[];
  hcm02Employees: TestEmployee[];
  bhEmployees: TestEmployee[];
  totalProcessed: number;
} {
  console.log('=== TESTING NEW HCM ALLOCATION LOGIC ===');
  console.log(`Total HCM employees: ${employees.length}`);
  
  // Lọc nhân viên HCM
  const hcmEmployees = employees.filter(emp => 
    emp.maTuyenXe === 'HCM01' || emp.maTuyenXe === 'HCM02' || emp.maTuyenXe === 'HCM03'
  );
  
  const totalHCMEmployees = hcmEmployees.length;
  console.log(`HCM employees to process: ${totalHCMEmployees}`);
  
  // Nếu số lượng < 30: Chia đều cho HCM01 và HCM02
  if (totalHCMEmployees < 30) {
    console.log('HCM employees < 30, distributing evenly between HCM01 and HCM02');
    return distributeHCMEvenly(hcmEmployees);
  }
  
  // Nếu số lượng ≥ 30: Ghép trạm HCM vào trạm Biên Hòa từ DB
  console.log('HCM employees >= 30, applying station matching logic with BH routes from DB...');
  return applyHCMStationMatchingLogic(hcmEmployees, routeDetails);
}

/**
 * Chia đều nhân viên HCM cho HCM01 và HCM02
 */
function distributeHCMEvenly(hcmEmployees: TestEmployee[]): {
  hcm01Employees: TestEmployee[];
  hcm02Employees: TestEmployee[];
  bhEmployees: TestEmployee[];
  totalProcessed: number;
} {
  // Phân loại nhân viên theo trạm ưu tiên HCM02
  const hcm02PriorityEmployees: TestEmployee[] = [];
  const otherHCMEmployees: TestEmployee[] = [];
  
  hcmEmployees.forEach(employee => {
    if (isHCM02PriorityStation(employee.tramXe)) {
      hcm02PriorityEmployees.push(employee);
    } else {
      otherHCMEmployees.push(employee);
    }
  });
  
  // Chia đều cho HCM01 và HCM02
  const halfCount = Math.ceil(hcmEmployees.length / 2);
  
  let hcm02Employees = hcm02PriorityEmployees.slice(0, halfCount);
  let hcm01Employees = otherHCMEmployees.slice(0, halfCount);
  
  // Nếu chưa đủ, lấy thêm từ nhóm kia
  if (hcm02Employees.length < halfCount) {
    const needed = halfCount - hcm02Employees.length;
    hcm02Employees.push(...otherHCMEmployees.slice(hcm01Employees.length, hcm01Employees.length + needed));
  }
  
  if (hcm01Employees.length < halfCount) {
    const needed = halfCount - hcm01Employees.length;
    hcm01Employees.push(...hcm02PriorityEmployees.slice(hcm02Employees.length, hcm02Employees.length + needed));
  }
  
  // Cập nhật maTuyenXe
  hcm01Employees.forEach(emp => emp.maTuyenXe = 'HCM01');
  hcm02Employees.forEach(emp => emp.maTuyenXe = 'HCM02');
  
  console.log(`Even distribution: HCM01=${hcm01Employees.length}, HCM02=${hcm02Employees.length}`);
  
  return {
    hcm01Employees,
    hcm02Employees,
    bhEmployees: [],
    totalProcessed: hcm01Employees.length + hcm02Employees.length
  };
}

/**
 * Áp dụng logic ghép trạm HCM vào trạm Biên Hòa từ DB
 */
function applyHCMStationMatchingLogic(
  hcmEmployees: TestEmployee[], 
  routeDetails: TestRouteDetail[]
): {
  hcm01Employees: TestEmployee[];
  hcm02Employees: TestEmployee[];
  bhEmployees: TestEmployee[];
  totalProcessed: number;
} {
  console.log('Applying HCM station matching logic with BH routes from DB...');
  
  // Lấy danh sách trạm BH từ DB
  const bhStations = routeDetails
    .filter(detail => detail.maTuyenXe.startsWith('BH'))
    .map(detail => detail.tenDiemDon);
  
  console.log('BH stations from DB:', bhStations);
  
  // Phân loại nhân viên HCM: có trạm trùng với BH vs không trùng
  const employeesMatchingBH: TestEmployee[] = [];
  const employeesNotMatchingBH: TestEmployee[] = [];
  
  hcmEmployees.forEach(employee => {
    const stationName = normalizeStationName(employee.tramXe);
    
    // Kiểm tra xem trạm có khớp với trạm BH không
    const matchingBHStation = bhStations.find(bhStation => 
      normalizeStationName(bhStation) === stationName ||
      stationName.includes(normalizeStationName(bhStation)) ||
      normalizeStationName(bhStation).includes(stationName)
    );
    
    if (matchingBHStation) {
      console.log(`Employee ${employee.hoTen} at station ${employee.tramXe} matches BH station ${matchingBHStation}`);
      employeesMatchingBH.push(employee);
    } else {
      employeesNotMatchingBH.push(employee);
    }
  });
  
  console.log(`Employees matching BH: ${employeesMatchingBH.length}, Not matching BH: ${employeesNotMatchingBH.length}`);
  
  // Chuyển nhân viên có trạm trùng BH sang tuyến BH tương ứng
  const bhEmployees = employeesMatchingBH.map(employee => {
    const bhRoute = findBHRouteForStation(employee.tramXe, routeDetails);
    return {
      ...employee,
      maTuyenXe: bhRoute
    };
  });
  
  // Phân chia nhân viên không trùng BH cho HCM01 và HCM02
  const targetEmployeesPerHCMRoute = 15;
  
  // Ưu tiên HCM02 cho các trạm đặc biệt
  const hcm02PriorityEmployees: TestEmployee[] = [];
  const otherHCMEmployees: TestEmployee[] = [];
  
  employeesNotMatchingBH.forEach(employee => {
    if (isHCM02PriorityStation(employee.tramXe)) {
      hcm02PriorityEmployees.push(employee);
    } else {
      otherHCMEmployees.push(employee);
    }
  });
  
  // Phân bổ cho HCM02 (tối đa 15 nhân viên)
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
  
  // Chuyển nhân viên dư thừa sang tuyến Biên Hòa dựa trên tên trạm từ DB
  const additionalBHEmployees = hcm02RemainingOverflow.map(employee => {
    const bhRoute = findBHRouteForStation(employee.tramXe, routeDetails);
    return {
      ...employee,
      maTuyenXe: bhRoute
    };
  });
  
  // Cập nhật maTuyenXe cho các nhân viên
  hcm01Employees.forEach(emp => emp.maTuyenXe = 'HCM01');
  hcm02Employees.forEach(emp => emp.maTuyenXe = 'HCM02');
  
  const allBHEmployees = [...bhEmployees, ...additionalBHEmployees];
  
  console.log(`Final HCM distribution: HCM01=${hcm01Employees.length}, HCM02=${hcm02Employees.length}`);
  console.log(`Total BH employees: ${allBHEmployees.length}`);
  
  return {
    hcm01Employees,
    hcm02Employees,
    bhEmployees: allBHEmployees,
    totalProcessed: hcm01Employees.length + hcm02Employees.length + allBHEmployees.length
  };
}

/**
 * Tìm tuyến BH phù hợp cho trạm từ DB
 */
function findBHRouteForStation(stationName: string, routeDetails: TestRouteDetail[]): string {
  const normalizedStation = normalizeStationName(stationName);
  
  // Tìm trạm BH phù hợp nhất từ DB
  for (const detail of routeDetails) {
    if (detail.maTuyenXe.startsWith('BH')) {
      const normalizedBHStation = normalizeStationName(detail.tenDiemDon);
      
      // Kiểm tra khớp chính xác hoặc chứa nhau
      if (normalizedStation === normalizedBHStation ||
          normalizedStation.includes(normalizedBHStation) ||
          normalizedBHStation.includes(normalizedStation)) {
        
        console.log(`Found matching BH route "${detail.maTuyenXe}" for station "${stationName}" based on DB station "${detail.tenDiemDon}"`);
        return detail.maTuyenXe;
      }
    }
  }
  
  // Nếu không tìm thấy trạm phù hợp, mặc định chuyển sang BH01
  console.log(`No matching BH station found for "${stationName}" in DB, defaulting to BH01`);
  return 'BH01';
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
export function runNewHCMAllocationTest(): void {
  console.log('🚀 Running New HCM Allocation Logic Test...');
  
  console.log('\n=== TEST 1: HCM < 30 employees ===');
  const result1 = mockApplyHCMNewLogic(TEST_HCM_LESS_THAN_30, TEST_BH_ROUTE_DETAILS);
  console.log(`✅ HCM01: ${result1.hcm01Employees.length}, HCM02: ${result1.hcm02Employees.length}, BH: ${result1.bhEmployees.length}`);
  console.log(`✅ Total processed: ${result1.totalProcessed} (expected: ${TEST_HCM_LESS_THAN_30.length})`);
  
  console.log('\n=== TEST 2: HCM ≥ 30 employees ===');
  const result2 = mockApplyHCMNewLogic(TEST_HCM_GREATER_THAN_30, TEST_BH_ROUTE_DETAILS);
  console.log(`✅ HCM01: ${result2.hcm01Employees.length}, HCM02: ${result2.hcm02Employees.length}, BH: ${result2.bhEmployees.length}`);
  console.log(`✅ Total processed: ${result2.totalProcessed} (expected: ${TEST_HCM_GREATER_THAN_30.length})`);
  
  // Verify results
  if (result1.totalProcessed === TEST_HCM_LESS_THAN_30.length && 
      result2.totalProcessed === TEST_HCM_GREATER_THAN_30.length) {
    console.log('\n🎉 ALL TESTS PASSED: New HCM Allocation logic works correctly!');
  } else {
    console.log('\n❌ TESTS FAILED: New HCM Allocation logic needs adjustment');
  }
}

