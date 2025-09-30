/**
 * Test case cho logic gom nhân viên HCM và BH routes
 * Dựa trên yêu cầu: ưu tiên gom tất cả nhân viên HCM01, HCM02, HCM03 vào HCM01 trước
 * và ưu tiên gom tất cả nhân viên BH01, BH02, BH03 vào BH01 trước
 * Các trạm sau "Hàng xanh" thì tiếp tục gom theo cách hiện tại
 */

export const HCM_GROUPING_TEST_DATA = {
  // Test case 1: Nhân viên HCM01, HCM02, HCM03 tại các trạm trước "Hàng xanh" -> gom vào HCM01
  beforeHangXanh: [
    { name: 'Nguyễn Văn A', route: 'HCM01', station: 'KCN Long Đức', expectedGroup: 'HCM01' },
    { name: 'Trần Thị B', route: 'HCM02', station: 'Ngã 3 Bến Gỗ', expectedGroup: 'HCM01' },
    { name: 'Lê Văn C', route: 'HCM03', station: 'Ngã 3 Long Bình Tân', expectedGroup: 'HCM01' },
    { name: 'Phạm Thị D', route: 'HCM01', station: 'Ngã 4 Thủ Đức', expectedGroup: 'HCM01' },
    { name: 'Hoàng Văn E', route: 'HCM02', station: 'RMK', expectedGroup: 'HCM01' },
    { name: 'Vũ Thị F', route: 'HCM03', station: 'Ngã 3 Cát Lái', expectedGroup: 'HCM01' },
    { name: 'Đặng Văn G', route: 'HCM01', station: 'Hàng xanh', expectedGroup: 'HCM01' },
    { name: 'Bùi Thị H', route: 'HCM02', station: 'Hàng xanh', expectedGroup: 'HCM01' },
    { name: 'Ngô Văn I', route: 'HCM03', station: 'Hàng xanh', expectedGroup: 'HCM01' }
  ],

  // Test case 2: Nhân viên HCM01, HCM02, HCM03 tại các trạm sau "Hàng xanh" -> giữ nguyên tuyến gốc
  afterHangXanh: [
    { name: 'Lý Văn J', route: 'HCM01', station: 'Đinh Tiên Hoàng - Điện Biên Phủ', expectedGroup: 'HCM01' },
    { name: 'Đinh Thị K', route: 'HCM02', station: 'Bà Chiểu', expectedGroup: 'HCM02' },
    { name: 'Vũ Văn L', route: 'HCM03', station: 'Chợ Gò Vấp', expectedGroup: 'HCM03' },
    { name: 'Tôn Thị M', route: 'HCM01', station: 'Bệnh viện Hòa Hảo', expectedGroup: 'HCM01' },
    { name: 'Cao Văn N', route: 'HCM02', station: 'Trường Lý Tự Trọng', expectedGroup: 'HCM02' },
    { name: 'Lương Thị O', route: 'HCM03', station: 'Hóc Môn (Chùa Hoằng Pháp)', expectedGroup: 'HCM03' }
  ],

  // Test case 3: Nhân viên BH01, BH02, BH03 tại các trạm trước "Hàng xanh" -> gom vào BH01
  bhBeforeHangXanh: [
    { name: 'Hồ Văn P', route: 'BH01', station: 'KCN Long Đức', expectedGroup: 'BH01' },
    { name: 'Đỗ Thị Q', route: 'BH02', station: 'Ngã 3 Bến Gỗ', expectedGroup: 'BH01' },
    { name: 'Tạ Văn R', route: 'BH03', station: 'Ngã 3 Long Bình Tân', expectedGroup: 'BH01' },
    { name: 'Lưu Thị S', route: 'BH01', station: 'Ngã 4 Thủ Đức', expectedGroup: 'BH01' },
    { name: 'Vương Văn T', route: 'BH02', station: 'RMK', expectedGroup: 'BH01' },
    { name: 'Đào Thị U', route: 'BH03', station: 'Ngã 3 Cát Lái', expectedGroup: 'BH01' },
    { name: 'Lâm Văn V', route: 'BH01', station: 'Hàng xanh', expectedGroup: 'BH01' },
    { name: 'Bạch Thị W', route: 'BH02', station: 'Hàng xanh', expectedGroup: 'BH01' },
    { name: 'Hà Văn X', route: 'BH03', station: 'Hàng xanh', expectedGroup: 'BH01' }
  ],

  // Test case 4: Nhân viên BH01, BH02, BH03 tại các trạm sau "Hàng xanh" -> giữ nguyên tuyến gốc
  bhAfterHangXanh: [
    { name: 'Nguyễn Văn Y', route: 'BH01', station: 'Đinh Tiên Hoàng - Điện Biên Phủ', expectedGroup: 'BH01' },
    { name: 'Trần Thị Z', route: 'BH02', station: 'Bà Chiểu', expectedGroup: 'BH02' },
    { name: 'Lê Văn AA', route: 'BH03', station: 'Chợ Gò Vấp', expectedGroup: 'BH03' },
    { name: 'Phạm Thị BB', route: 'BH01', station: 'Bệnh viện Hòa Hảo', expectedGroup: 'BH01' },
    { name: 'Hoàng Văn CC', route: 'BH02', station: 'Trường Lý Tự Trọng', expectedGroup: 'BH02' },
    { name: 'Vũ Thị DD', route: 'BH03', station: 'Hóc Môn (Chùa Hoằng Pháp)', expectedGroup: 'BH03' }
  ],

  // Test case 5: Nhân viên các tuyến khác (T1, T2, v.v.) -> không thay đổi
  otherRoutes: [
    { name: 'Đặng Văn EE', route: 'T1', station: 'Công viên Tam Hiệp', expectedGroup: 'T1' },
    { name: 'Bùi Thị FF', route: 'T2', station: 'Ngã 3 Vũng Tàu', expectedGroup: 'T2' },
    { name: 'Ngô Văn GG', route: 'T3', station: 'Vòng xoay Tam Hiệp', expectedGroup: 'T3' }
  ],

  // Test case 6: Các trạm có tên tương tự nhưng không chính xác
  similarStations: [
    { name: 'Lưu Văn S', route: 'HCM01', station: 'Trạm xe Hàng xanh', expectedGroup: 'HCM01' },
    { name: 'Vương Thị T', route: 'HCM02', station: 'Hàng xanh - Bến xe', expectedGroup: 'HCM01' },
    { name: 'Đào Văn U', route: 'HCM03', station: 'KCN Long Đức - Cổng A', expectedGroup: 'HCM01' },
    { name: 'Lâm Văn V', route: 'BH01', station: 'Trạm xe Hàng xanh', expectedGroup: 'BH01' },
    { name: 'Bạch Thị W', route: 'BH02', station: 'Hàng xanh - Bến xe', expectedGroup: 'BH01' },
    { name: 'Hà Văn X', route: 'BH03', station: 'KCN Long Đức - Cổng A', expectedGroup: 'BH01' }
  ]
};

/**
 * Kết quả mong đợi sau khi áp dụng logic gom nhóm
 */
export const EXPECTED_GROUPING_RESULT = {
  // Tất cả nhân viên HCM tại các trạm trước "Hàng xanh" sẽ được gom vào HCM01
  hcm01Group: {
    routeName: 'HCM01',
    employees: [
      // Từ HCM01 gốc
      { name: 'Nguyễn Văn A', originalRoute: 'HCM01', station: 'KCN Long Đức' },
      { name: 'Phạm Thị D', originalRoute: 'HCM01', station: 'Ngã 4 Thủ Đức' },
      { name: 'Đặng Văn G', originalRoute: 'HCM01', station: 'Hàng xanh' },
      { name: 'Lý Văn J', originalRoute: 'HCM01', station: 'Đinh Tiên Hoàng - Điện Biên Phủ' },
      { name: 'Tôn Thị M', originalRoute: 'HCM01', station: 'Bệnh viện Hòa Hảo' },
      { name: 'Lưu Văn S', originalRoute: 'HCM01', station: 'Trạm xe Hàng xanh' },
      
      // Từ HCM02 được gom vào HCM01 (chỉ các trạm trước "Hàng xanh")
      { name: 'Trần Thị B', originalRoute: 'HCM02', station: 'Ngã 3 Bến Gỗ' },
      { name: 'Hoàng Văn E', originalRoute: 'HCM02', station: 'RMK' },
      { name: 'Bùi Thị H', originalRoute: 'HCM02', station: 'Hàng xanh' },
      { name: 'Vương Thị T', originalRoute: 'HCM02', station: 'Hàng xanh - Bến xe' },
      
      // Từ HCM03 được gom vào HCM01 (chỉ các trạm trước "Hàng xanh")
      { name: 'Lê Văn C', originalRoute: 'HCM03', station: 'Ngã 3 Long Bình Tân' },
      { name: 'Vũ Thị F', originalRoute: 'HCM03', station: 'Ngã 3 Cát Lái' },
      { name: 'Ngô Văn I', originalRoute: 'HCM03', station: 'Hàng xanh' },
      { name: 'Đào Văn U', originalRoute: 'HCM03', station: 'KCN Long Đức - Cổng A' }
    ]
  },

  // HCM02 chỉ giữ lại nhân viên tại các trạm sau "Hàng xanh"
  hcm02Group: {
    routeName: 'HCM02',
    employees: [
      { name: 'Đinh Thị K', originalRoute: 'HCM02', station: 'Bà Chiểu' },
      { name: 'Cao Văn N', originalRoute: 'HCM02', station: 'Trường Lý Tự Trọng' }
    ]
  },

  // HCM03 chỉ giữ lại nhân viên tại các trạm sau "Hàng xanh"
  hcm03Group: {
    routeName: 'HCM03',
    employees: [
      { name: 'Vũ Văn L', originalRoute: 'HCM03', station: 'Chợ Gò Vấp' },
      { name: 'Lương Thị O', originalRoute: 'HCM03', station: 'Hóc Môn (Chùa Hoằng Pháp)' }
    ]
  },

  // BH01 sẽ gom tất cả nhân viên BH tại các trạm trước "Hàng xanh"
  bh01Group: {
    routeName: 'BH01',
    employees: [
      // Từ BH01 gốc
      { name: 'Hồ Văn P', originalRoute: 'BH01', station: 'KCN Long Đức' },
      { name: 'Lưu Thị S', originalRoute: 'BH01', station: 'Ngã 4 Thủ Đức' },
      { name: 'Lâm Văn V', originalRoute: 'BH01', station: 'Hàng xanh' },
      { name: 'Nguyễn Văn Y', originalRoute: 'BH01', station: 'Đinh Tiên Hoàng - Điện Biên Phủ' },
      { name: 'Phạm Thị BB', originalRoute: 'BH01', station: 'Bệnh viện Hòa Hảo' },
      { name: 'Lâm Văn V', originalRoute: 'BH01', station: 'Trạm xe Hàng xanh' },
      
      // Từ BH02 được gom vào BH01 (chỉ các trạm trước "Hàng xanh")
      { name: 'Đỗ Thị Q', originalRoute: 'BH02', station: 'Ngã 3 Bến Gỗ' },
      { name: 'Vương Văn T', originalRoute: 'BH02', station: 'RMK' },
      { name: 'Bạch Thị W', originalRoute: 'BH02', station: 'Hàng xanh' },
      { name: 'Bạch Thị W', originalRoute: 'BH02', station: 'Hàng xanh - Bến xe' },
      
      // Từ BH03 được gom vào BH01 (chỉ các trạm trước "Hàng xanh")
      { name: 'Tạ Văn R', originalRoute: 'BH03', station: 'Ngã 3 Long Bình Tân' },
      { name: 'Đào Thị U', originalRoute: 'BH03', station: 'Ngã 3 Cát Lái' },
      { name: 'Hà Văn X', originalRoute: 'BH03', station: 'Hàng xanh' },
      { name: 'Hà Văn X', originalRoute: 'BH03', station: 'KCN Long Đức - Cổng A' }
    ]
  },

  // BH02 chỉ giữ lại nhân viên tại các trạm sau "Hàng xanh"
  bh02Group: {
    routeName: 'BH02',
    employees: [
      { name: 'Trần Thị Z', originalRoute: 'BH02', station: 'Bà Chiểu' },
      { name: 'Hoàng Văn CC', originalRoute: 'BH02', station: 'Trường Lý Tự Trọng' }
    ]
  },

  // BH03 chỉ giữ lại nhân viên tại các trạm sau "Hàng xanh"
  bh03Group: {
    routeName: 'BH03',
    employees: [
      { name: 'Lê Văn AA', originalRoute: 'BH03', station: 'Chợ Gò Vấp' },
      { name: 'Vũ Thị DD', originalRoute: 'BH03', station: 'Hóc Môn (Chùa Hoằng Pháp)' }
    ]
  },

  // Các tuyến khác không thay đổi
  otherGroups: [
    {
      routeName: 'T1',
      employees: [
        { name: 'Đặng Văn EE', originalRoute: 'T1', station: 'Công viên Tam Hiệp' }
      ]
    },
    {
      routeName: 'T2',
      employees: [
        { name: 'Bùi Thị FF', originalRoute: 'T2', station: 'Ngã 3 Vũng Tàu' }
      ]
    },
    {
      routeName: 'T3',
      employees: [
        { name: 'Ngô Văn GG', originalRoute: 'T3', station: 'Vòng xoay Tam Hiệp' }
      ]
    }
  ]
};

/**
 * Danh sách các trạm từ KCN Long Đức đến Hàng xanh (theo thứ tự)
 * Đây là danh sách được sử dụng trong logic kiểm tra
 */
export const STATIONS_BEFORE_HANG_XANH = [
  'kcn long đức',
  'ngã 3 bến gỗ', 
  'ngã 3 long bình tân',
  'ngã 4 thủ đức',
  'rmk',
  'ngã 3 cát lái',
  'hàng xanh'
];

/**
 * Hàm test logic gom nhóm (để sử dụng trong unit test)
 */
export function testHCMGroupingLogic() {
  console.log('=== TESTING HCM GROUPING LOGIC ===');
  
  // Test 1: Các trạm trước "Hàng xanh"
  console.log('\n--- Test 1: Trạm trước "Hàng xanh" ---');
  HCM_GROUPING_TEST_DATA.beforeHangXanh.forEach(testCase => {
    const isBeforeHangXanh = STATIONS_BEFORE_HANG_XANH.some(stationName => 
      testCase.station.toLowerCase().includes(stationName) || 
      stationName.includes(testCase.station.toLowerCase())
    );
    const expectedGroup = isBeforeHangXanh ? 'HCM01' : testCase.route;
    const passed = expectedGroup === testCase.expectedGroup;
    
    console.log(`${testCase.name} (${testCase.route}, ${testCase.station}): ${passed ? 'PASS' : 'FAIL'} - Expected: ${testCase.expectedGroup}, Got: ${expectedGroup}`);
  });

  // Test 2: Các trạm sau "Hàng xanh"
  console.log('\n--- Test 2: Trạm sau "Hàng xanh" ---');
  HCM_GROUPING_TEST_DATA.afterHangXanh.forEach(testCase => {
    const isBeforeHangXanh = STATIONS_BEFORE_HANG_XANH.some(stationName => 
      testCase.station.toLowerCase().includes(stationName) || 
      stationName.includes(testCase.station.toLowerCase())
    );
    const expectedGroup = isBeforeHangXanh ? 'HCM01' : testCase.route;
    const passed = expectedGroup === testCase.expectedGroup;
    
    console.log(`${testCase.name} (${testCase.route}, ${testCase.station}): ${passed ? 'PASS' : 'FAIL'} - Expected: ${testCase.expectedGroup}, Got: ${expectedGroup}`);
  });

  // Test 3: Các tuyến BH trước "Hàng xanh"
  console.log('\n--- Test 3: Tuyến BH trước "Hàng xanh" ---');
  HCM_GROUPING_TEST_DATA.bhBeforeHangXanh.forEach(testCase => {
    const isBeforeHangXanh = STATIONS_BEFORE_HANG_XANH.some(stationName => 
      testCase.station.toLowerCase().includes(stationName) || 
      stationName.includes(testCase.station.toLowerCase())
    );
    const expectedGroup = isBeforeHangXanh ? 'BH01' : testCase.route;
    const passed = expectedGroup === testCase.expectedGroup;
    
    console.log(`${testCase.name} (${testCase.route}, ${testCase.station}): ${passed ? 'PASS' : 'FAIL'} - Expected: ${testCase.expectedGroup}, Got: ${expectedGroup}`);
  });

  // Test 4: Các tuyến BH sau "Hàng xanh"
  console.log('\n--- Test 4: Tuyến BH sau "Hàng xanh" ---');
  HCM_GROUPING_TEST_DATA.bhAfterHangXanh.forEach(testCase => {
    const isBeforeHangXanh = STATIONS_BEFORE_HANG_XANH.some(stationName => 
      testCase.station.toLowerCase().includes(stationName) || 
      stationName.includes(testCase.station.toLowerCase())
    );
    const expectedGroup = isBeforeHangXanh ? 'BH01' : testCase.route;
    const passed = expectedGroup === testCase.expectedGroup;
    
    console.log(`${testCase.name} (${testCase.route}, ${testCase.station}): ${passed ? 'PASS' : 'FAIL'} - Expected: ${testCase.expectedGroup}, Got: ${expectedGroup}`);
  });

  // Test 5: Các tuyến khác
  console.log('\n--- Test 5: Các tuyến khác ---');
  HCM_GROUPING_TEST_DATA.otherRoutes.forEach(testCase => {
    const isHCMRoute = ['HCM01', 'HCM02', 'HCM03'].includes(testCase.route);
    const isBHRoute = ['BH01', 'BH02', 'BH03'].includes(testCase.route);
    const expectedGroup = isHCMRoute ? 'HCM01' : (isBHRoute ? 'BH01' : testCase.route); // Giả sử tất cả HCM/BH đều ở trạm trước Hàng xanh
    const passed = expectedGroup === testCase.expectedGroup;
    
    console.log(`${testCase.name} (${testCase.route}, ${testCase.station}): ${passed ? 'PASS' : 'FAIL'} - Expected: ${testCase.expectedGroup}, Got: ${expectedGroup}`);
  });

  console.log('\n=== TEST COMPLETED ===');
}
