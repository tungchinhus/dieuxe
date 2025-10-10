/**
 * Ví dụ demo về phân loại xe tự động và loại bỏ trạm "tự túc"
 */

export const VEHICLE_ALLOCATION_DEMO = {
  // Tuyến HCM01 - 25 nhân viên (sẽ dùng xe 29 chỗ)
  hcm01: {
    routeName: 'HCM01',
    totalEmployees: 25,
    vehicleAllocation: {
      vehicleType: '29chỗ',
      vehicleCount: 1,
      reason: 'Từ 15-28 người (25 người) - xe 29 chỗ'
    },
    employees: [
      { name: 'Nguyễn Văn A', station: 'BV Hòa Hảo' },
      { name: 'Trần Thị B', station: 'BV Hòa Hảo' },
      { name: 'Lê Văn C', station: 'Ngã 4 Thủ Đức' },
      { name: 'Phạm Thị D', station: 'Ngã 4 Thủ Đức' },
      // ... 21 nhân viên khác
    ]
  },

  // Tuyến HCM02 - 5 nhân viên (sẽ dùng xe taxi 7 chỗ)
  hcm02: {
    routeName: 'HCM02', 
    totalEmployees: 5,
    vehicleAllocation: {
      vehicleType: 'Taxi 7 chỗ',
      vehicleCount: 1,
      reason: 'Dưới 7 người (5 người) - sử dụng xe taxi 7 chỗ'
    },
    employees: [
      { name: 'Hoàng Văn E', station: 'Bà Chiểu' },
      { name: 'Vũ Thị F', station: 'Bà Chiểu' },
      { name: 'Đặng Văn G', station: 'Chợ Gò Vấp' },
      { name: 'Bùi Thị H', station: 'Chợ Gò Vấp' },
      { name: 'Ngô Văn I', station: 'Chợ Gò Vấp' }
    ]
  },

  // Tuyến BH01 - 35 nhân viên (sẽ dùng xe 45 chỗ)
  bh01: {
    routeName: 'BH01',
    totalEmployees: 35,
    vehicleAllocation: {
      vehicleType: '45chỗ',
      vehicleCount: 1,
      reason: 'Từ 29-44 người (35 người) - xe 45 chỗ'
    },
    employees: [
      // ... 35 nhân viên
    ]
  },

  // Tuyến BH02 - 50 nhân viên (sẽ dùng nhiều xe 45 chỗ)
  bh02: {
    routeName: 'BH02',
    totalEmployees: 50,
    vehicleAllocation: {
      vehicleType: '45chỗ',
      vehicleCount: 2,
      reason: 'Trên 44 người (50 người) - nhiều xe 45 chỗ'
    },
    employees: [
      // ... 50 nhân viên
    ]
  }
};

/**
 * Ví dụ về loại bỏ trạm "tự túc"
 */
export const SELF_TRANSPORT_FILTER_DEMO = {
  // Dữ liệu gốc (trước khi lọc)
  originalData: [
    { name: 'Nguyễn Văn A', station: 'BV Hòa Hảo' },
    { name: 'Trần Thị B', station: 'tự túc' },        // Sẽ bị loại bỏ
    { name: 'Lê Văn C', station: 'Ngã 4 Thủ Đức' },
    { name: 'Phạm Thị D', station: 'TỰ TÚC' },        // Sẽ bị loại bỏ
    { name: 'Hoàng Văn E', station: 'tự đi' },         // Sẽ bị loại bỏ
    { name: 'Vũ Thị F', station: 'Bà Chiểu' },
    { name: 'Đặng Văn G', station: 'đi riêng' },      // Sẽ bị loại bỏ
    { name: 'Bùi Thị H', station: 'Chợ Gò Vấp' }
  ],

  // Dữ liệu sau khi lọc
  filteredData: [
    { name: 'Nguyễn Văn A', station: 'BV Hòa Hảo' },
    { name: 'Lê Văn C', station: 'Ngã 4 Thủ Đức' },
    { name: 'Vũ Thị F', station: 'Bà Chiểu' },
    { name: 'Bùi Thị H', station: 'Chợ Gò Vấp' }
  ],

  // Từ khóa được nhận diện là "tự túc"
  selfTransportKeywords: [
    'tự túc', 'tu tuc', 'TỰ TÚC', 'TU TUC',
    'tự đi', 'tu di', 'TỰ ĐI', 'TU DI', 
    'đi riêng', 'di rieng', 'ĐI RIÊNG', 'DI RIENG'
  ]
};

/**
 * Kết quả hiển thị trong PDF
 */
export const PDF_DISPLAY_RESULT = {
  hcm01: {
    routeHeader: 'HCM01',
    vehicleInfo: 'Tổng: 25 người | 29chỗ (1 xe) | Từ 15-28 người (25 người) - xe 29 chỗ',
    employees: [
      { stt: 1, name: 'Nguyễn Văn A', station: 'BV Hòa Hảo (merged)', phone: '0901234567' },
      { stt: 2, name: 'Trần Thị B', station: '', phone: '0901234568' },
      { stt: 3, name: 'Lê Văn C', station: 'Ngã 4 Thủ Đức (merged)', phone: '0901234569' },
      { stt: 4, name: 'Phạm Thị D', station: '', phone: '0901234570' }
    ]
  },
  
  hcm02: {
    routeHeader: 'HCM02',
    vehicleInfo: 'Tổng: 5 người | Taxi (2 xe) | Dưới 7 người (5 người) - sử dụng taxi',
    employees: [
      { stt: 1, name: 'Hoàng Văn E', station: 'Bà Chiểu (merged)', phone: '0901234571' },
      { stt: 2, name: 'Vũ Thị F', station: '', phone: '0901234572' },
      { stt: 3, name: 'Đặng Văn G', station: 'Chợ Gò Vấp', phone: '0901234573' }
    ]
  }
};

/**
 * Quy tắc phân loại xe chi tiết
 */
export const VEHICLE_ALLOCATION_RULES = {
  'taxi-7-cho': {
    condition: 'employeeCount < 7',
    vehicleType: 'Taxi 7 chỗ',
    capacity: 7,
    example: '5 người → 1 xe taxi 7 chỗ (Math.ceil(5/7))'
  },
  
  '16chỗ': {
    condition: '6 <= employeeCount <= 14',
    vehicleType: '16chỗ',
    capacity: 16,
    example: '12 người → 1 xe 16 chỗ (Math.ceil(12/16))'
  },
  
  '29chỗ': {
    condition: '15 <= employeeCount <= 28',
    vehicleType: '29chỗ',
    capacity: 29,
    example: '25 người → 1 xe 29 chỗ (Math.ceil(25/29))'
  },
  
  '45chỗ': {
    condition: '29 <= employeeCount <= 44',
    vehicleType: '45chỗ',
    capacity: 45,
    example: '35 người → 1 xe 45 chỗ (Math.ceil(35/45))'
  },
  
  '45chỗ_multiple': {
    condition: 'employeeCount > 44',
    vehicleType: '45chỗ',
    capacity: 45,
    example: '50 người → 2 xe 45 chỗ (Math.ceil(50/45))'
  }
};
