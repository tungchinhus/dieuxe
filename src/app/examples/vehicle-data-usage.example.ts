import { Injectable } from '@angular/core';
import { VehicleDataService } from '../services/vehicle-data.service';
import { XeDuaDon, LichTrinhXe, ChiTietTuyenDuong, DangKyPhanXe, LoaiXe, LoaiCa, PhongBan } from '../models/vehicle.model';

/**
 * Ví dụ sử dụng VehicleDataService
 * File này chỉ để tham khảo, không cần import vào app
 */
@Injectable()
export class VehicleDataUsageExample {

  constructor(private vehicleDataService: VehicleDataService) {}

  // ==================== VÍ DỤ QUẢN LÝ XE ĐƯA ĐÓN ====================
  
  async themXeMoi() {
    try {
      const xeMoi: Omit<XeDuaDon, 'MaXe' | 'createdAt' | 'updatedAt'> = {
        BienSoXe: '51A-12345',
        TenTaiXe: 'Nguyễn Văn A',
        SoDienThoaiTaiXe: '0901234567',
        LoaiXe: LoaiXe.XE_16_CHO,
        GhiChu: 'Xe mới, tình trạng tốt'
      };

      const maXe = await this.vehicleDataService.themXeDuaDon(xeMoi);
      console.log('Đã thêm xe mới với mã:', maXe);
    } catch (error) {
      console.error('Lỗi khi thêm xe:', error);
    }
  }

  async layDanhSachXe() {
    try {
      const danhSachXe = await this.vehicleDataService.layDanhSachXeDuaDon();
      console.log('Danh sách xe:', danhSachXe);
      return danhSachXe;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách xe:', error);
      return [];
    }
  }

  // ==================== VÍ DỤ QUẢN LÝ LỊCH TRÌNH XE ====================
  
  async taoLichTrinhXe() {
    try {
      const lichTrinhMoi: Omit<LichTrinhXe, 'createdAt' | 'updatedAt'> = {
        MaTuyenXe: 'T001',
        MaXe: 'xe_id_here', // ID của xe từ bước trước
        TenTuyenXe: 'Tuyến Hồ Chí Minh - Đà Nẵng',
        DiemDon: 'Bến xe Miền Đông',
        SoGheToiDa: 16
      };

      const maLichTrinh = await this.vehicleDataService.themLichTrinhXe(lichTrinhMoi);
      console.log('Đã tạo lịch trình xe với mã:', maLichTrinh);
    } catch (error) {
      console.error('Lỗi khi tạo lịch trình xe:', error);
    }
  }

  async themChiTietTuyenDuong() {
    try {
      const chiTiet1: Omit<ChiTietTuyenDuong, 'MaChiTiet' | 'createdAt' | 'updatedAt'> = {
        MaTuyenXe: 'T001',
        TenDiemDon: 'Bến xe Miền Đông',
        ThuTu: 1
      };

      const chiTiet2: Omit<ChiTietTuyenDuong, 'MaChiTiet' | 'createdAt' | 'updatedAt'> = {
        MaTuyenXe: 'T001',
        TenDiemDon: 'Trạm dừng chân Quảng Ngãi',
        ThuTu: 2
      };

      const chiTiet3: Omit<ChiTietTuyenDuong, 'MaChiTiet' | 'createdAt' | 'updatedAt'> = {
        MaTuyenXe: 'T001',
        TenDiemDon: 'Bến xe Đà Nẵng',
        ThuTu: 3
      };

      await this.vehicleDataService.themChiTietTuyenDuong(chiTiet1);
      await this.vehicleDataService.themChiTietTuyenDuong(chiTiet2);
      await this.vehicleDataService.themChiTietTuyenDuong(chiTiet3);

      console.log('Đã thêm chi tiết tuyến đường');
    } catch (error) {
      console.error('Lỗi khi thêm chi tiết tuyến đường:', error);
    }
  }

  // ==================== VÍ DỤ ĐĂNG KÝ PHÂN XE ====================
  
  async dangKyPhanXeChoNhanVien() {
    try {
      const dangKyMoi: Omit<DangKyPhanXe, 'ID' | 'createdAt' | 'updatedAt'> = {
        MaNhanVien: 'NV001',
        HoTen: 'Trần Thị B',
        DienThoai: '0907654321',
        PhongBan: PhongBan.IT,
        NgayDangKy: new Date(),
        ThoiGianBatDau: '08:00',
        ThoiGianKetThuc: '17:00',
        LoaiCa: LoaiCa.CA_SANG,
        NoiDungCongViec: 'Lập trình ứng dụng web',
        DangKyCom: true,
        TramXe: 'Trạm A',
        MaTuyenXe: 'T001'
      };

      // Validate dữ liệu trước khi lưu
      const errors = this.vehicleDataService.validateDangKyPhanXe(dangKyMoi);
      if (errors.length > 0) {
        console.error('Lỗi validation:', errors);
        return;
      }

      // Kiểm tra xem nhân viên đã đăng ký trong ngày chưa
      const daDangKy = await this.vehicleDataService.kiemTraDangKyTrongNgay(
        dangKyMoi.MaNhanVien, 
        dangKyMoi.NgayDangKy
      );

      if (daDangKy) {
        console.log('Nhân viên đã đăng ký trong ngày này');
        return;
      }

      const maDangKy = await this.vehicleDataService.dangKyPhanXe(dangKyMoi);
      console.log('Đã đăng ký phân xe với mã:', maDangKy);
    } catch (error) {
      console.error('Lỗi khi đăng ký phân xe:', error);
    }
  }

  // ==================== VÍ DỤ LẤY THÔNG TIN ĐẦY ĐỦ ====================
  
  async layThongTinTuyenXe() {
    try {
      const thongTinTuyen = await this.vehicleDataService.layThongTinTuyenXe('T001');
      
      if (thongTinTuyen) {
        console.log('Thông tin tuyến xe:');
        console.log('- Lịch trình:', thongTinTuyen.lichTrinh);
        console.log('- Chi tiết tuyến:', thongTinTuyen.chiTietTuyen);
        console.log('- Xe đưa đón:', thongTinTuyen.xeDuaDon);
      } else {
        console.log('Không tìm thấy thông tin tuyến xe');
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin tuyến xe:', error);
    }
  }

  async layThongTinDangKyPhanXe() {
    try {
      const thongTinDangKy = await this.vehicleDataService.layThongTinDangKyPhanXe('dang_ky_id_here');
      
      if (thongTinDangKy) {
        console.log('Thông tin đăng ký phân xe:');
        console.log('- Thông tin đăng ký:', thongTinDangKy);
        console.log('- Lịch trình xe:', thongTinDangKy.lichTrinhXe);
        console.log('- Chi tiết tuyến:', thongTinDangKy.chiTietTuyen);
        console.log('- Xe đưa đón:', thongTinDangKy.xeDuaDon);
      } else {
        console.log('Không tìm thấy thông tin đăng ký');
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin đăng ký:', error);
    }
  }

  // ==================== VÍ DỤ THỐNG KÊ ====================
  
  async layThongKeDangKy() {
    try {
      const thongKe = await this.vehicleDataService.layThongKeDangKy();
      
      console.log('Thống kê đăng ký:');
      console.log('- Tổng số đăng ký:', thongKe.tongSoDangKy);
      console.log('- Đăng ký theo phòng ban:', thongKe.dangKyTheoPhongBan);
      console.log('- Đăng ký theo loại ca:', thongKe.dangKyTheoLoaiCa);
      console.log('- Đăng ký theo trạm xe:', thongKe.dangKyTheoTramXe);
      console.log('- Đăng ký cơm:', thongKe.dangKyCom);
      console.log('- Không đăng ký cơm:', thongKe.khongDangKyCom);
    } catch (error) {
      console.error('Lỗi khi lấy thống kê:', error);
    }
  }

  async layThongKeTheoKhoangThoiGian() {
    try {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const thongKe = await this.vehicleDataService.layThongKeDangKy(startDate, endDate);
      
      console.log(`Thống kê tháng 1/2024:`, thongKe);
    } catch (error) {
      console.error('Lỗi khi lấy thống kê theo khoảng thời gian:', error);
    }
  }

  // ==================== VÍ DỤ TÌM KIẾM VÀ LỌC ====================
  
  async timDangKyTheoNhanVien() {
    try {
      const dangKyCuaNhanVien = await this.vehicleDataService.layDangKyPhanXeTheoMaNhanVien('NV001');
      console.log('Đăng ký của nhân viên NV001:', dangKyCuaNhanVien);
    } catch (error) {
      console.error('Lỗi khi tìm đăng ký theo nhân viên:', error);
    }
  }

  async layDanhSachXeCoSan() {
    try {
      const xeCoSan = await this.vehicleDataService.layDanhSachXeCoSan('T001');
      console.log('Danh sách xe có sẵn cho tuyến T001:', xeCoSan);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách xe có sẵn:', error);
    }
  }

  // ==================== VÍ DỤ CẬP NHẬT DỮ LIỆU ====================
  
  async capNhatThongTinXe() {
    try {
      const xeId = 'xe_id_here';
      const thongTinCapNhat = {
        TenTaiXe: 'Nguyễn Văn C',
        SoDienThoaiTaiXe: '0909876543',
        GhiChu: 'Cập nhật thông tin tài xế'
      };

      await this.vehicleDataService.capNhatXeDuaDon(xeId, thongTinCapNhat);
      console.log('Đã cập nhật thông tin xe');
    } catch (error) {
      console.error('Lỗi khi cập nhật thông tin xe:', error);
    }
  }

  async capNhatDangKyPhanXe() {
    try {
      const dangKyId = 'dang_ky_id_here';
      const thongTinCapNhat = {
        ThoiGianBatDau: '09:00',
        ThoiGianKetThuc: '18:00',
        DangKyCom: false
      };

      await this.vehicleDataService.capNhatDangKyPhanXe(dangKyId, thongTinCapNhat);
      console.log('Đã cập nhật đăng ký phân xe');
    } catch (error) {
      console.error('Lỗi khi cập nhật đăng ký:', error);
    }
  }

  // ==================== VÍ DỤ XÓA DỮ LIỆU ====================
  
  async xoaDangKyPhanXe() {
    try {
      const dangKyId = 'dang_ky_id_here';
      await this.vehicleDataService.huyDangKyPhanXe(dangKyId);
      console.log('Đã hủy đăng ký phân xe');
    } catch (error) {
      console.error('Lỗi khi hủy đăng ký:', error);
    }
  }

  // ==================== VÍ DỤ LẤY DANH SÁCH ENUM ====================
  
  layDanhSachCacGiaTriEnum() {
    console.log('Danh sách loại xe:', this.vehicleDataService.layDanhSachLoaiXe());
    console.log('Danh sách loại ca:', this.vehicleDataService.layDanhSachLoaiCa());
    console.log('Danh sách phòng ban:', this.vehicleDataService.layDanhSachPhongBan());
  }

  // ==================== VÍ DỤ WORKFLOW HOÀN CHỈNH ====================
  
  async workflowQuanLyXe() {
    try {
      console.log('=== BẮT ĐẦU WORKFLOW QUẢN LÝ XE ===');

      // 1. Thêm xe mới
      console.log('1. Thêm xe mới...');
      await this.themXeMoi();

      // 2. Tạo lịch trình xe
      console.log('2. Tạo lịch trình xe...');
      await this.taoLichTrinhXe();

      // 3. Thêm chi tiết tuyến đường
      console.log('3. Thêm chi tiết tuyến đường...');
      await this.themChiTietTuyenDuong();

      // 4. Đăng ký phân xe cho nhân viên
      console.log('4. Đăng ký phân xe...');
      await this.dangKyPhanXeChoNhanVien();

      // 5. Lấy thông tin đầy đủ
      console.log('5. Lấy thông tin đầy đủ...');
      await this.layThongTinTuyenXe();

      // 6. Lấy thống kê
      console.log('6. Lấy thống kê...');
      await this.layThongKeDangKy();

      console.log('=== HOÀN THÀNH WORKFLOW ===');
    } catch (error) {
      console.error('Lỗi trong workflow:', error);
    }
  }
}
