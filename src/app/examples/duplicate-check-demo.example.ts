/**
 * Demo cho tính năng kiểm tra trùng lặp dữ liệu import
 * 
 * File này chứa dữ liệu mẫu để test tính năng kiểm tra trùng lặp
 * dựa vào tên nhân viên và trạm xe
 */

import { Registration } from '../models/registration.model';

/**
 * Dữ liệu mẫu để test kiểm tra trùng lặp
 * Bao gồm các trường hợp:
 * 1. Dữ liệu hợp lệ (không trùng lặp)
 * 2. Dữ liệu trùng lặp với dữ liệu hiện có
 * 3. Dữ liệu trùng lặp trong cùng file import
 * 4. Dữ liệu trùng lặp một phần (tên giống, trạm khác)
 */
export const DUPLICATE_CHECK_DEMO_DATA: Registration[] = [
  // Dữ liệu hợp lệ - không trùng lặp
  {
    id: '1',
    maNhanVien: 'NV001',
    hoTen: 'Nguyễn Văn An',
    dienThoai: '0901234567',
    phongBan: '',
    ngayDangKy: '2024-01-15',
    loaiCa: 'HC',
    thoiGianBatDau: '08:00',
    thoiGianKetThuc: '17:00',
    maTuyenXe: 'T1',
    tramXe: 'Trạm A - KCN Biên Hòa',
    noiDungCongViec: 'Công việc mẫu 1',
    dangKyCom: true
  },
  {
    id: '2',
    maNhanVien: 'NV002',
    hoTen: 'Trần Thị Bình',
    dienThoai: '0901234568',
    phongBan: '',
    ngayDangKy: '2024-01-15',
    loaiCa: 'C1',
    thoiGianBatDau: '06:00',
    thoiGianKetThuc: '14:00',
    maTuyenXe: 'T2',
    tramXe: 'Trạm B - Ngã 3 Vũng Tàu',
    noiDungCongViec: 'Công việc mẫu 2',
    dangKyCom: false
  },

  // Dữ liệu trùng lặp - cùng tên, cùng trạm, cùng ngày
  {
    id: '3',
    maNhanVien: 'NV003',
    hoTen: 'Lê Văn Cường',
    dienThoai: '0901234569',
    phongBan: '',
    ngayDangKy: '2024-01-15',
    loaiCa: 'HC',
    thoiGianBatDau: '08:00',
    thoiGianKetThuc: '17:00',
    maTuyenXe: 'T1',
    tramXe: 'Trạm A - KCN Biên Hòa',
    noiDungCongViec: 'Công việc mẫu 3',
    dangKyCom: true
  },
  {
    id: '4',
    maNhanVien: 'NV004',
    hoTen: 'Lê Văn Cường', // Trùng tên
    dienThoai: '0901234570',
    phongBan: '',
    ngayDangKy: '2024-01-15', // Trùng ngày
    loaiCa: 'C2',
    thoiGianBatDau: '14:00',
    thoiGianKetThuc: '22:00',
    maTuyenXe: 'T1',
    tramXe: 'Trạm A - KCN Biên Hòa', // Trùng trạm
    noiDungCongViec: 'Công việc mẫu 4',
    dangKyCom: false
  },

  // Dữ liệu trùng lặp - khác ngày (không trùng lặp)
  {
    id: '5',
    maNhanVien: 'NV005',
    hoTen: 'Phạm Thị Dung',
    dienThoai: '0901234571',
    phongBan: '',
    ngayDangKy: '2024-01-16', // Khác ngày
    loaiCa: 'HC',
    thoiGianBatDau: '08:00',
    thoiGianKetThuc: '17:00',
    maTuyenXe: 'T1',
    tramXe: 'Trạm A - KCN Biên Hòa',
    noiDungCongViec: 'Công việc mẫu 5',
    dangKyCom: true
  },
  {
    id: '6',
    maNhanVien: 'NV006',
    hoTen: 'Phạm Thị Dung', // Trùng tên
    dienThoai: '0901234572',
    phongBan: '',
    ngayDangKy: '2024-01-16', // Trùng ngày
    loaiCa: 'C1',
    thoiGianBatDau: '06:00',
    thoiGianKetThuc: '14:00',
    maTuyenXe: 'T1',
    tramXe: 'Trạm A - KCN Biên Hòa', // Trùng trạm
    noiDungCongViec: 'Công việc mẫu 6',
    dangKyCom: false
  },

  // Dữ liệu trùng lặp - khác trạm (không trùng lặp)
  {
    id: '7',
    maNhanVien: 'NV007',
    hoTen: 'Hoàng Văn Em',
    dienThoai: '0901234573',
    phongBan: '',
    ngayDangKy: '2024-01-15',
    loaiCa: 'HC',
    thoiGianBatDau: '08:00',
    thoiGianKetThuc: '17:00',
    maTuyenXe: 'T2',
    tramXe: 'Trạm B - Ngã 3 Vũng Tàu', // Khác trạm
    noiDungCongViec: 'Công việc mẫu 7',
    dangKyCom: true
  },
  {
    id: '8',
    maNhanVien: 'NV008',
    hoTen: 'Hoàng Văn Em', // Trùng tên
    dienThoai: '0901234574',
    phongBan: '',
    ngayDangKy: '2024-01-15', // Trùng ngày
    loaiCa: 'C2',
    thoiGianBatDau: '14:00',
    thoiGianKetThuc: '22:00',
    maTuyenXe: 'T1',
    tramXe: 'Trạm A - KCN Biên Hòa', // Khác trạm
    noiDungCongViec: 'Công việc mẫu 8',
    dangKyCom: false
  },

  // Dữ liệu trùng lặp - case sensitivity test
  {
    id: '9',
    maNhanVien: 'NV009',
    hoTen: 'Võ Thị Phương',
    dienThoai: '0901234575',
    phongBan: '',
    ngayDangKy: '2024-01-15',
    loaiCa: 'HC',
    thoiGianBatDau: '08:00',
    thoiGianKetThuc: '17:00',
    maTuyenXe: 'T1',
    tramXe: 'Trạm A - KCN Biên Hòa',
    noiDungCongViec: 'Công việc mẫu 9',
    dangKyCom: true
  },
  {
    id: '10',
    maNhanVien: 'NV010',
    hoTen: 'võ thị phương', // Trùng tên (khác case)
    dienThoai: '0901234576',
    phongBan: '',
    ngayDangKy: '2024-01-15',
    loaiCa: 'C1',
    thoiGianBatDau: '06:00',
    thoiGianKetThuc: '14:00',
    maTuyenXe: 'T1',
    tramXe: 'trạm a - kcn biên hòa', // Trùng trạm (khác case)
    noiDungCongViec: 'Công việc mẫu 10',
    dangKyCom: false
  },

  // Dữ liệu trùng lặp - có khoảng trắng thừa
  {
    id: '11',
    maNhanVien: 'NV011',
    hoTen: 'Đặng Văn Giang',
    dienThoai: '0901234577',
    phongBan: '',
    ngayDangKy: '2024-01-15',
    loaiCa: 'HC',
    thoiGianBatDau: '08:00',
    thoiGianKetThuc: '17:00',
    maTuyenXe: 'T1',
    tramXe: 'Trạm A - KCN Biên Hòa',
    noiDungCongViec: 'Công việc mẫu 11',
    dangKyCom: true
  },
  {
    id: '12',
    maNhanVien: 'NV012',
    hoTen: '  Đặng Văn Giang  ', // Trùng tên (có khoảng trắng)
    dienThoai: '0901234578',
    phongBan: '',
    ngayDangKy: '2024-01-15',
    loaiCa: 'C2',
    thoiGianBatDau: '14:00',
    thoiGianKetThuc: '22:00',
    maTuyenXe: 'T1',
    tramXe: '  Trạm A - KCN Biên Hòa  ', // Trùng trạm (có khoảng trắng)
    noiDungCongViec: 'Công việc mẫu 12',
    dangKyCom: false
  }
];

/**
 * Kết quả mong đợi khi kiểm tra trùng lặp:
 * 
 * Dữ liệu hợp lệ (không trùng lặp):
 * - NV001: Nguyễn Văn An - Trạm A - 2024-01-15
 * - NV002: Trần Thị Bình - Trạm B - 2024-01-15
 * - NV005: Phạm Thị Dung - Trạm A - 2024-01-16 (khác ngày)
 * - NV007: Hoàng Văn Em - Trạm B - 2024-01-15 (khác trạm)
 * - NV008: Hoàng Văn Em - Trạm A - 2024-01-15 (khác trạm)
 * 
 * Dữ liệu trùng lặp:
 * - NV003 & NV004: Lê Văn Cường - Trạm A - 2024-01-15
 * - NV005 & NV006: Phạm Thị Dung - Trạm A - 2024-01-16
 * - NV009 & NV010: Võ Thị Phương - Trạm A - 2024-01-15 (case insensitive)
 * - NV011 & NV012: Đặng Văn Giang - Trạm A - 2024-01-15 (trim spaces)
 */

/**
 * Hàm test kiểm tra trùng lặp
 * Sử dụng để test logic kiểm tra trùng lặp
 */
export function testDuplicateCheck() {
  console.log('=== TESTING DUPLICATE CHECK ===');
  console.log('Total records:', DUPLICATE_CHECK_DEMO_DATA.length);
  
  // Simulate duplicate check logic
  const duplicates: Registration[] = [];
  const validData: Registration[] = [];
  
  for (let i = 0; i < DUPLICATE_CHECK_DEMO_DATA.length; i++) {
    const current = DUPLICATE_CHECK_DEMO_DATA[i];
    let isDuplicate = false;
    
    // Check against previous records in the same batch
    for (let j = 0; j < validData.length; j++) {
      const previous = validData[j];
      
      if (current.hoTen?.toLowerCase().trim() === previous.hoTen?.toLowerCase().trim() &&
          current.tramXe?.toLowerCase().trim() === previous.tramXe?.toLowerCase().trim() &&
          current.ngayDangKy === previous.ngayDangKy) {
        isDuplicate = true;
        break;
      }
    }
    
    if (isDuplicate) {
      duplicates.push(current);
      console.log(`DUPLICATE: ${current.hoTen} - ${current.tramXe} (${current.ngayDangKy})`);
    } else {
      validData.push(current);
    }
  }
  
  console.log('Valid data:', validData.length);
  console.log('Duplicates:', duplicates.length);
  console.log('=== END TEST ===');
  
  return {
    validData,
    duplicates,
    totalRecords: DUPLICATE_CHECK_DEMO_DATA.length
  };
}
