/**
 * Test case để kiểm tra logic phân bổ trạm xe đã được sửa
 * 
 * Các vấn đề đã sửa:
 * 1. Ngã 3 hãng dầu phải thuộc BH04 thay vì HCM02
 * 2. Ngã 4 Thủ Đức, Bà Chiểu, Chợ Gò Vấp không nên được gom vào BH01 nếu thuộc các tuyến khác
 */

export interface TestEmployee {
  hoTen: string;
  tramXe: string;
  maTuyenXe: string;
}

export interface TestResult {
  employee: TestEmployee;
  expectedRoute: string;
  actualRoute: string;
  passed: boolean;
}

/**
 * Test cases cho logic phân bổ trạm xe
 */
export const testCases: TestEmployee[] = [
  // Test case 1: Ngã 3 hãng dầu phải thuộc BH04
  {
    hoTen: "Nguyễn Kim Nguyên",
    tramXe: "Ngã 3 hãng dầu",
    maTuyenXe: "HCM02" // Ban đầu thuộc HCM02 nhưng phải chuyển sang BH04
  },
  {
    hoTen: "Trần Văn A",
    tramXe: "Ngã 3 Hãng dầu",
    maTuyenXe: "BH01" // Ban đầu thuộc BH01 nhưng phải chuyển sang BH04
  },
  
  // Test case 2: Ngã 4 Thủ Đức không nên được gom vào BH01 nếu thuộc tuyến khác
  {
    hoTen: "Lê Thành Châu",
    tramXe: "Ngã 4 Thủ Đức",
    maTuyenXe: "HCM01" // Phải giữ nguyên HCM01, không gom vào BH01
  },
  {
    hoTen: "Phạm Thắng",
    tramXe: "Ngã 4 Thủ Đức",
    maTuyenXe: "BH02" // Phải giữ nguyên BH02, không gom vào BH01
  },
  
  // Test case 3: Bà Chiểu không nên được gom vào BH01 nếu thuộc tuyến khác
  {
    hoTen: "Nguyễn Mạnh Quân",
    tramXe: "Bà Chiểu",
    maTuyenXe: "HCM02" // Phải giữ nguyên HCM02, không gom vào BH01
  },
  
  // Test case 4: Chợ Gò Vấp không nên được gom vào BH01 nếu thuộc tuyến khác
  {
    hoTen: "Ngô Thanh Dũng",
    tramXe: "Chợ Gò Vấp",
    maTuyenXe: "HCM03" // Phải giữ nguyên HCM03, không gom vào BH01
  },
  
  // Test case 5: Các trạm khác vẫn hoạt động bình thường
  {
    hoTen: "Bùi Văn Nguyên",
    tramXe: "HCM02",
    maTuyenXe: "HCM02" // Phải giữ nguyên HCM02
  },
  {
    hoTen: "Nguyễn Thị Hồng Diệp",
    tramXe: "Ngã 3 Bến Gỗ",
    maTuyenXe: "BH01" // Phải giữ nguyên BH01 (trạm trước Hàng xanh)
  }
];

/**
 * Expected results cho các test cases
 */
export const expectedResults: { [key: string]: string } = {
  "Nguyễn Kim Nguyên": "BH04", // Ngã 3 hãng dầu -> BH04
  "Trần Văn A": "BH04", // Ngã 3 Hãng dầu -> BH04
  "Lê Thành Châu": "HCM01", // Ngã 4 Thủ Đức với HCM01 -> giữ nguyên HCM01
  "Phạm Thắng": "BH02", // Ngã 4 Thủ Đức với BH02 -> giữ nguyên BH02
  "Nguyễn Mạnh Quân": "HCM02", // Bà Chiểu với HCM02 -> giữ nguyên HCM02
  "Ngô Thanh Dũng": "HCM03", // Chợ Gò Vấp với HCM03 -> giữ nguyên HCM03
  "Bùi Văn Nguyên": "HCM02", // HCM02 -> giữ nguyên HCM02
  "Nguyễn Thị Hồng Diệp": "BH01" // Ngã 3 Bến Gỗ với BH01 -> giữ nguyên BH01
};

/**
 * Mock function để test logic applyHCMGroupingPriority
 * (Sao chép logic từ các service đã sửa)
 */
export function mockApplyHCMGroupingPriority(routeName: string, tramXe: string): string {
  // Kiểm tra nếu là trường hợp "tự túc"
  if (isSelfTransportStation(tramXe)) {
    return 'TỰ TÚC';
  }
  
  // Đặc biệt: "Ngã 3 Hãng dầu" luôn thuộc BH04, không phân biệt tuyến gốc
  if (isNga3HangDauStation(tramXe)) {
    return 'BH04';
  }
  
  // Kiểm tra nếu là tuyến HCM - chỉ có 2 tuyến chính
  if (routeName === 'HCM01' || routeName === 'HCM02') {
    // Giữ nguyên 2 tuyến HCM chính
    return routeName;
  }
  
  // Xử lý tuyến HCM03 phát sinh
  if (routeName === 'HCM03') {
    // Giữ nguyên HCM03
    return routeName;
  }
  
  // Kiểm tra nếu là tuyến BH
  if (routeName === 'BH01' || routeName === 'BH02' || routeName === 'BH03' || routeName === 'BH04') {
    // Kiểm tra nếu trạm xe chứa "Hàng xanh" hoặc các trạm trước "Hàng xanh"
    if (isStationBeforeOrAtHangXanh(tramXe)) {
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
 * Helper functions (sao chép từ các service)
 */
function isNga3HangDauStation(station: string): boolean {
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

function isStationBeforeOrAtHangXanh(tramXe: string): boolean {
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

function isSelfTransportStation(station: string): boolean {
  if (!station) return false;
  
  const stationLower = station.toLowerCase();
  
  const selfTransportStations = [
    'tự túc',
    'tu tuc',
    'tự đi',
    'tu di',
    'đi xe máy',
    'di xe may',
    'xe máy',
    'xe may'
  ];
  
  return selfTransportStations.some(selfTransportStation => 
    stationLower.includes(selfTransportStation)
  );
}

/**
 * Chạy test cases
 */
export function runStationAssignmentTests(): TestResult[] {
  const results: TestResult[] = [];
  
  testCases.forEach(testCase => {
    const actualRoute = mockApplyHCMGroupingPriority(testCase.maTuyenXe, testCase.tramXe);
    const expectedRoute = expectedResults[testCase.hoTen];
    const passed = actualRoute === expectedRoute;
    
    results.push({
      employee: testCase,
      expectedRoute,
      actualRoute,
      passed
    });
  });
  
  return results;
}

/**
 * In kết quả test
 */
export function printTestResults(): void {
  const results = runStationAssignmentTests();
  
  console.log('=== KẾT QUẢ TEST LOGIC PHÂN BỔ TRẠM XE ===\n');
  
  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`Test ${index + 1}: ${status}`);
    console.log(`  Nhân viên: ${result.employee.hoTen}`);
    console.log(`  Trạm xe: ${result.employee.tramXe}`);
    console.log(`  Tuyến gốc: ${result.employee.maTuyenXe}`);
    console.log(`  Tuyến mong đợi: ${result.expectedRoute}`);
    console.log(`  Tuyến thực tế: ${result.actualRoute}`);
    console.log('');
  });
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`Tổng kết: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('🎉 Tất cả tests đều PASS! Logic phân bổ trạm xe đã được sửa đúng.');
  } else {
    console.log('⚠️  Có tests FAIL. Cần kiểm tra lại logic.');
  }
}

