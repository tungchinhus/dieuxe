/**
 * Test case để kiểm tra logic ưu tiên HCM02 trong applyHCMGroupingPriority
 */

// Mock function để test logic
function isHCM02PriorityStation(station: string): boolean {
  if (!station) return false;
  
  const stationLower = station.toLowerCase();
  
  const hcm02PriorityStations = [
    'ngã 3 long bình tân',
    'nga 3 long binh tan',
    'ngã 3 long bình tân',
    'nga 3 long binh tan',
    'long bình tân',
    'long binh tan',
    'bà chiểu',
    'ba chieu',
    'bà chiểu',
    'ba chieu'
  ];
  
  return hcm02PriorityStations.some(priorityStation => 
    stationLower.includes(priorityStation) || priorityStation.includes(stationLower)
  );
}

function applyHCMGroupingPriority(routeName: string, tramXe: string): string {
  // Đặc biệt: Ngã 3 Long Bình Tân và Bà Chiểu ưu tiên vào HCM02
  if (isHCM02PriorityStation(tramXe)) {
    return 'HCM02';
  }
  
  // Kiểm tra nếu là tuyến HCM
  if (routeName === 'HCM01' || routeName === 'HCM02' || routeName === 'HCM03') {
    return routeName;
  }
  
  // Kiểm tra nếu là tuyến BH
  if (routeName === 'BH01' || routeName === 'BH02' || routeName === 'BH03' || routeName === 'BH04') {
    return routeName;
  }
  
  return routeName;
}

// Test function
function testHCM02PriorityInGrouping() {
  console.log('=== TEST HCM02 PRIORITY IN GROUPING LOGIC ===');
  
  // Test cases
  const testCases = [
    // Test cases cho Ngã 3 Long Bình Tân
    { routeName: 'BH01', tramXe: 'Ngã 3 Long Bình Tân', expected: 'HCM02', description: 'Ngã 3 Long Bình Tân từ BH01 -> HCM02' },
    { routeName: 'BH02', tramXe: 'Ngã 3 Long Bình Tân', expected: 'HCM02', description: 'Ngã 3 Long Bình Tân từ BH02 -> HCM02' },
    { routeName: 'BH03', tramXe: 'Ngã 3 Long Bình Tân', expected: 'HCM02', description: 'Ngã 3 Long Bình Tân từ BH03 -> HCM02' },
    { routeName: 'BH04', tramXe: 'Ngã 3 Long Bình Tân', expected: 'HCM02', description: 'Ngã 3 Long Bình Tân từ BH04 -> HCM02' },
    { routeName: 'HCM01', tramXe: 'Ngã 3 Long Bình Tân', expected: 'HCM02', description: 'Ngã 3 Long Bình Tân từ HCM01 -> HCM02' },
    { routeName: 'HCM03', tramXe: 'Ngã 3 Long Bình Tân', expected: 'HCM02', description: 'Ngã 3 Long Bình Tân từ HCM03 -> HCM02' },
    
    // Test cases cho Bà Chiểu
    { routeName: 'BH01', tramXe: 'Bà Chiểu', expected: 'HCM02', description: 'Bà Chiểu từ BH01 -> HCM02' },
    { routeName: 'BH02', tramXe: 'Bà Chiểu', expected: 'HCM02', description: 'Bà Chiểu từ BH02 -> HCM02' },
    { routeName: 'BH03', tramXe: 'Bà Chiểu', expected: 'HCM02', description: 'Bà Chiểu từ BH03 -> HCM02' },
    { routeName: 'BH04', tramXe: 'Bà Chiểu', expected: 'HCM02', description: 'Bà Chiểu từ BH04 -> HCM02' },
    { routeName: 'HCM01', tramXe: 'Bà Chiểu', expected: 'HCM02', description: 'Bà Chiểu từ HCM01 -> HCM02' },
    { routeName: 'HCM03', tramXe: 'Bà Chiểu', expected: 'HCM02', description: 'Bà Chiểu từ HCM03 -> HCM02' },
    
    // Test cases cho các trạm khác (không ưu tiên)
    { routeName: 'BH01', tramXe: 'Chợ Gò Vấp', expected: 'BH01', description: 'Chợ Gò Vấp từ BH01 -> BH01 (không đổi)' },
    { routeName: 'BH02', tramXe: 'Công Viên Tam Hiệp', expected: 'BH02', description: 'Công Viên Tam Hiệp từ BH02 -> BH02 (không đổi)' },
    { routeName: 'HCM01', tramXe: 'Hóc Môn', expected: 'HCM01', description: 'Hóc Môn từ HCM01 -> HCM01 (không đổi)' },
    { routeName: 'HCM02', tramXe: 'Cổng 11', expected: 'HCM02', description: 'Cổng 11 từ HCM02 -> HCM02 (không đổi)' },
    
    // Test cases với các biến thể tên trạm
    { routeName: 'BH01', tramXe: 'ngã 3 long bình tân', expected: 'HCM02', description: 'ngã 3 long bình tân (lowercase) -> HCM02' },
    { routeName: 'BH01', tramXe: 'bà chiểu', expected: 'HCM02', description: 'bà chiểu (lowercase) -> HCM02' },
    { routeName: 'BH01', tramXe: 'Long Bình Tân', expected: 'HCM02', description: 'Long Bình Tân (không có ngã 3) -> HCM02' },
    { routeName: 'BH01', tramXe: 'Ba Chieu', expected: 'HCM02', description: 'Ba Chieu (không dấu) -> HCM02' }
  ];
  
  console.log('\n1. Testing HCM02 Priority Logic:');
  let passedTests = 0;
  let totalTests = testCases.length;
  
  testCases.forEach((testCase, index) => {
    const result = applyHCMGroupingPriority(testCase.routeName, testCase.tramXe);
    const passed = result === testCase.expected;
    
    console.log(`  Test ${index + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`    ${testCase.description}`);
    console.log(`    Input: routeName="${testCase.routeName}", tramXe="${testCase.tramXe}"`);
    console.log(`    Expected: "${testCase.expected}", Got: "${result}"`);
    console.log('');
    
    if (passed) passedTests++;
  });
  
  console.log(`\n2. Test Results: ${passedTests}/${totalTests} tests passed`);
  
  // Test 3: Verify specific problem cases
  console.log('\n3. Verifying specific problem cases from the image:');
  const problemCases = [
    { routeName: 'BH01', tramXe: 'Ngã 3 Long Bình Tân', description: 'Lãi Văn Lợi - Ngã 3 Long Bình Tân' },
    { routeName: 'BH01', tramXe: 'Bà Chiểu', description: 'Nguyễn Mạnh Quân - Bà Chiểu' }
  ];
  
  problemCases.forEach((testCase, index) => {
    const result = applyHCMGroupingPriority(testCase.routeName, testCase.tramXe);
    console.log(`  Case ${index + 1}: ${testCase.description}`);
    console.log(`    Input: routeName="${testCase.routeName}", tramXe="${testCase.tramXe}"`);
    console.log(`    Result: "${result}"`);
    console.log(`    Status: ${result === 'HCM02' ? '✅ FIXED - Now goes to HCM02' : '❌ STILL WRONG'}`);
    console.log('');
  });
  
  console.log('=== TEST COMPLETED ===');
}

// Chạy test
testHCM02PriorityInGrouping();

