/**
 * Ví dụ demo về cách merge cell hoạt động trong PDF export
 * 
 * Dữ liệu mẫu dựa trên phiếu báo làm thêm giờ:
 * - Tuyến HCM01: 10 nhân viên
 * - Tuyến HCM02: 14 nhân viên
 */

export const MERGE_CELL_DEMO_DATA = {
  // Tuyến HCM01 - Ngày 14/09/2025
  hcm01: {
    routeName: 'HCM01',
    driverInfo: {
      name: 'TX Chung',
      phone: '0900000000',
      vehicleNumber: '16C 60F01899'
    },
    registrations: [
      // Trạm BV Hòa Hảo (4 nhân viên) - sẽ được merge cell
      { id: 1, hoTen: 'Đinh Văn Hưng', tramXe: 'BV Hòa Hảo', dienThoai: '0932771820', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 2, hoTen: 'Nguyễn Duy Trung', tramXe: 'BV Hòa Hảo', dienThoai: '0909934456', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 3, hoTen: 'Nguyễn Chí Trường', tramXe: 'BV Hòa Hảo', dienThoai: '0938629778', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 4, hoTen: 'Nguyễn Đình Thanh', tramXe: 'BV Hòa Hảo', dienThoai: '0907244522', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      
      // Trạm Ngã 4 Thủ Đức (5 nhân viên) - sẽ được merge cell
      { id: 5, hoTen: 'Khưu Văn Nhơn', tramXe: 'Ngã 4 Thủ Đức', dienThoai: '0989988148', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 6, hoTen: 'Nguyễn Hữu Vi', tramXe: 'Ngã 4 Thủ Đức', dienThoai: '0908802448', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 7, hoTen: 'Huỳnh Văn Thời', tramXe: 'Ngã 4 Thủ Đức', dienThoai: '0907428432', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 8, hoTen: 'Khưu Văn Nghĩa', tramXe: 'Ngã 4 Thủ Đức', dienThoai: '0987527248', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 9, hoTen: 'Lê Ngọc Tạo', tramXe: 'Ngã 4 Thủ Đức', dienThoai: '0933254299', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      
      // Trạm Ngã 3 Long Bình Tân (1 nhân viên) - không merge
      { id: 10, hoTen: 'Lê Trọng Hiếu', tramXe: 'Ngã 3 Long Bình Tân', dienThoai: '0918535017', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' }
    ]
  },

  // Tuyến HCM02 - Ngày 12/09/2025
  hcm02: {
    routeName: 'HCM02',
    driverInfo: {
      name: 'TX TOÀN',
      phone: '0795996409',
      vehicleNumber: '16C 60B 04889'
    },
    registrations: [
      // Nhân viên không có trạm (8 nhân viên) - không merge
      { id: 1, hoTen: 'Lê Thành Rơi', tramXe: '', dienThoai: '0908008539', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 2, hoTen: 'Nguyễn Thanh Thâu', tramXe: '', dienThoai: '0903367511', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 3, hoTen: 'Lê Minh Phượng', tramXe: '', dienThoai: '0908111034', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 4, hoTen: 'Phạm Anh Tuấn', tramXe: '', dienThoai: '0902262111', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 5, hoTen: 'Phạm Thắng', tramXe: '', dienThoai: '0907667335', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 10, hoTen: 'Ngô Thanh Dũng', tramXe: '', dienThoai: '0976875390', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 11, hoTen: 'Võ Minh Nguyên', tramXe: '', dienThoai: '0909540014', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 12, hoTen: 'Huỳnh Ngọc Thanh', tramXe: '', dienThoai: '0903806711', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 13, hoTen: 'Trần Đức Quyết', tramXe: '', dienThoai: '0934250304', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      
      // Trạm Ngã 4 Thủ Đức (2 nhân viên) - sẽ được merge cell
      { id: 6, hoTen: 'Lê Ngọc Tạo', tramXe: 'Ngã 4 Thủ Đức', dienThoai: '0933254299', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 7, hoTen: 'Nguyễn Mạnh Quân', tramXe: 'Ngã 4 Thủ Đức', dienThoai: '0934445411', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      
      // Trạm Bà Chiểu (2 nhân viên) - sẽ được merge cell
      { id: 8, hoTen: 'Nguyễn Hoài Hữu', tramXe: 'Bà Chiểu', dienThoai: '0907891712', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      { id: 9, hoTen: 'Đặng Thanh Phong', tramXe: 'Bà Chiểu', dienThoai: '0933964640', thoiGianBatDau: '15h45', thoiGianKetThuc: '19h' },
      
      // Trạm Chợ Gò Vấp (1 nhân viên) - không merge
      { id: 14, hoTen: 'Trần Thanh Hùng', tramXe: 'chợ Gò Vấp', dienThoai: '0906306580', thoiGianBatDau: '', thoiGianKetThuc: '' }
    ]
  }
};

/**
 * Kết quả merge cell và thứ tự sắp xếp mong đợi:
 * 
 * THỨ TỰ SẮP XẾP TUYẾN XE:
 * 1. HCM01 (ưu tiên cao nhất)
 * 2. HCM02  
 * 3. HCM03
 * 4. BH01
 * 5. BH02
 * 6. BH03
 * 7. BH04
 * 8. Các tuyến khác (theo alphabet)
 * 
 * TUYẾN HCM01:
 * - BV Hòa Hảo: 4 nhân viên → merge cell rowspan=4
 * - Ngã 4 Thủ Đức: 5 nhân viên → merge cell rowspan=5  
 * - Ngã 3 Long Bình Tân: 1 nhân viên → không merge
 * 
 * TUYẾN HCM02:
 * - Không có trạm: 8 nhân viên → không merge
 * - Ngã 4 Thủ Đức: 2 nhân viên → merge cell rowspan=2
 * - Bà Chiểu: 2 nhân viên → merge cell rowspan=2
 * - Chợ Gò Vấp: 1 nhân viên → không merge
 */

export const EXPECTED_MERGE_RESULT = {
  hcm01: {
    'BV Hòa Hảo': 4,      // rowspan=4
    'Ngã 4 Thủ Đức': 5,   // rowspan=5
    'Ngã 3 Long Bình Tân': 1  // rowspan=1 (không merge)
  },
  hcm02: {
    '': 8,                 // Không merge (8 nhân viên riêng lẻ)
    'Ngã 4 Thủ Đức': 2,   // rowspan=2
    'Bà Chiểu': 2,        // rowspan=2
    'chợ Gò Vấp': 1       // rowspan=1 (không merge)
  }
};

/**
 * Thứ tự sắp xếp tuyến xe trong PDF
 */
export const ROUTE_SORT_ORDER = [
  'HCM01',  // Tuyến Hồ Chí Minh 1 (ưu tiên cao nhất)
  'HCM02',  // Tuyến Hồ Chí Minh 2
  'HCM03',  // Tuyến Hồ Chí Minh 3
  'BH01',   // Tuyến Biên Hòa 1
  'BH02',   // Tuyến Biên Hòa 2
  'BH03',   // Tuyến Biên Hòa 3
  'BH04'    // Tuyến Biên Hòa 4
];

/**
 * Ví dụ về chuẩn hóa tên tuyến
 */
export const ROUTE_NAME_NORMALIZATION = {
  'HCM1': 'HCM01',
  'HCM 1': 'HCM01',
  'TUYẾN HCM01': 'HCM01',
  'HCM01 - TUYẾN HỒ CHÍ MINH 1': 'HCM01',
  'BH1': 'BH01',
  'BH 1': 'BH01',
  'TUYẾN BH01': 'BH01',
  'BH01 - TUYẾN BIÊN HÒA 1': 'BH01'
};
