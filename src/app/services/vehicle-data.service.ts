import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { XeDuaDon, LichTrinhXe, ChiTietTuyenDuong, DangKyPhanXe, LoaiXe, LoaiCa, PhongBan } from '../models/vehicle.model';

export interface TuyenXeInfo {
  lichTrinh: LichTrinhXe;
  chiTietTuyen: ChiTietTuyenDuong[];
  xeDuaDon?: XeDuaDon;
}

export interface DangKyPhanXeInfo extends DangKyPhanXe {
  lichTrinhXe?: LichTrinhXe;
  chiTietTuyen?: ChiTietTuyenDuong[];
  xeDuaDon?: XeDuaDon;
}

export interface ThongKeDangKy {
  tongSoDangKy: number;
  dangKyTheoPhongBan: { [key: string]: number };
  dangKyTheoLoaiCa: { [key: string]: number };
  dangKyTheoTramXe: { [key: string]: number };
  dangKyCom: number;
  khongDangKyCom: number;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleDataService {

  constructor(private firestoreService: FirestoreService) {}

  // ==================== XE DUA DON ====================
  async themXeDuaDon(xeDuaDon: Omit<XeDuaDon, 'MaXe' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return await this.firestoreService.createXeDuaDon(xeDuaDon);
  }

  async layDanhSachXeDuaDon(): Promise<XeDuaDon[]> {
    return await this.firestoreService.getAllXeDuaDon();
  }

  async layXeDuaDonTheoId(id: string): Promise<XeDuaDon | null> {
    return await this.firestoreService.getXeDuaDonById(id);
  }

  async capNhatXeDuaDon(id: string, data: Partial<Omit<XeDuaDon, 'MaXe' | 'createdAt'>>): Promise<void> {
    return await this.firestoreService.updateXeDuaDon(id, data);
  }

  async xoaXeDuaDon(id: string): Promise<void> {
    return await this.firestoreService.deleteXeDuaDon(id);
  }

  // ==================== LICH TRINH XE ====================
  async themLichTrinhXe(lichTrinhXe: Omit<LichTrinhXe, 'createdAt' | 'updatedAt'>): Promise<string> {
    return await this.firestoreService.createLichTrinhXe(lichTrinhXe);
  }

  async layDanhSachLichTrinhXe(): Promise<LichTrinhXe[]> {
    return await this.firestoreService.getAllLichTrinhXe();
  }

  async layLichTrinhXeTheoMaTuyen(maTuyenXe: string): Promise<LichTrinhXe[]> {
    return await this.firestoreService.getLichTrinhXeByMaTuyen(maTuyenXe);
  }

  async capNhatLichTrinhXe(id: string, data: Partial<Omit<LichTrinhXe, 'MaTuyenXe' | 'createdAt'>>): Promise<void> {
    return await this.firestoreService.updateLichTrinhXe(id, data);
  }

  async xoaLichTrinhXe(id: string): Promise<void> {
    return await this.firestoreService.deleteLichTrinhXe(id);
  }

  // ==================== CHI TIET TUYEN DUONG ====================
  async themChiTietTuyenDuong(chiTiet: Omit<ChiTietTuyenDuong, 'MaChiTiet' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return await this.firestoreService.createChiTietTuyenDuong(chiTiet);
  }

  async layChiTietTuyenDuongTheoMaTuyen(maTuyenXe: string): Promise<ChiTietTuyenDuong[]> {
    return await this.firestoreService.getChiTietTuyenDuongByMaTuyen(maTuyenXe);
  }

  async capNhatChiTietTuyenDuong(id: string, data: Partial<Omit<ChiTietTuyenDuong, 'MaChiTiet' | 'createdAt'>>): Promise<void> {
    return await this.firestoreService.updateChiTietTuyenDuong(id, data);
  }

  async xoaChiTietTuyenDuong(id: string): Promise<void> {
    return await this.firestoreService.deleteChiTietTuyenDuong(id);
  }

  // ==================== DANG KY PHAN XE ====================
  async dangKyPhanXe(dangKy: Omit<DangKyPhanXe, 'ID' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return await this.firestoreService.createDangKyPhanXe(dangKy);
  }

  async layDanhSachDangKyPhanXe(): Promise<DangKyPhanXe[]> {
    return await this.firestoreService.getAllDangKyPhanXe();
  }

  async layDangKyPhanXeTheoMaNhanVien(maNhanVien: string): Promise<DangKyPhanXe[]> {
    return await this.firestoreService.getDangKyPhanXeByMaNhanVien(maNhanVien);
  }

  async layDangKyPhanXeTheoKhoangThoiGian(startDate: Date, endDate: Date): Promise<DangKyPhanXe[]> {
    return await this.firestoreService.getDangKyPhanXeByDateRange(startDate, endDate);
  }

  async capNhatDangKyPhanXe(id: string, data: Partial<Omit<DangKyPhanXe, 'ID' | 'createdAt'>>): Promise<void> {
    return await this.firestoreService.updateDangKyPhanXe(id, data);
  }

  async huyDangKyPhanXe(id: string): Promise<void> {
    return await this.firestoreService.deleteDangKyPhanXe(id);
  }

  // ==================== BUSINESS LOGIC METHODS ====================
  
  /**
   * Lấy thông tin đầy đủ của một tuyến xe bao gồm lịch trình, chi tiết tuyến và xe đưa đón
   */
  async layThongTinTuyenXe(maTuyenXe: string): Promise<TuyenXeInfo | null> {
    try {
      const lichTrinhXe = await this.layLichTrinhXeTheoMaTuyen(maTuyenXe);
      if (lichTrinhXe.length === 0) {
        return null;
      }

      const lichTrinh = lichTrinhXe[0]; // Lấy lịch trình đầu tiên
      const chiTietTuyen = await this.layChiTietTuyenDuongTheoMaTuyen(maTuyenXe);
      
      let xeDuaDon: XeDuaDon | undefined;
      if (lichTrinh.MaXe) {
        xeDuaDon = await this.layXeDuaDonTheoId(lichTrinh.MaXe) ?? undefined;
      }

      return {
        lichTrinh,
        chiTietTuyen,
        xeDuaDon
      };
    } catch (error) {
      console.error('Lỗi khi lấy thông tin tuyến xe:', error);
      return null;
    }
  }

  /**
   * Lấy thông tin đầy đủ của đăng ký phân xe
   */
  async layThongTinDangKyPhanXe(id: string): Promise<DangKyPhanXeInfo | null> {
    try {
      const dangKy = await this.firestoreService.getDangKyPhanXeById(id);
      if (!dangKy) {
        return null;
      }

      const lichTrinhXe = await this.layLichTrinhXeTheoMaTuyen(dangKy.MaTuyenXe);
      const chiTietTuyen = await this.layChiTietTuyenDuongTheoMaTuyen(dangKy.MaTuyenXe);
      
      let xeDuaDon: XeDuaDon | undefined;
      if (lichTrinhXe.length > 0 && lichTrinhXe[0].MaXe) {
        xeDuaDon = await this.layXeDuaDonTheoId(lichTrinhXe[0].MaXe) ?? undefined;
      }

      return {
        ...dangKy,
        lichTrinhXe: lichTrinhXe[0],
        chiTietTuyen,
        xeDuaDon
      };
    } catch (error) {
      console.error('Lỗi khi lấy thông tin đăng ký phân xe:', error);
      return null;
    }
  }

  /**
   * Thống kê đăng ký phân xe
   */
  async layThongKeDangKy(startDate?: Date, endDate?: Date): Promise<ThongKeDangKy> {
    try {
      let danhSachDangKy: DangKyPhanXe[];
      
      if (startDate && endDate) {
        danhSachDangKy = await this.layDangKyPhanXeTheoKhoangThoiGian(startDate, endDate);
      } else {
        danhSachDangKy = await this.layDanhSachDangKyPhanXe();
      }

      const thongKe: ThongKeDangKy = {
        tongSoDangKy: danhSachDangKy.length,
        dangKyTheoPhongBan: {},
        dangKyTheoLoaiCa: {},
        dangKyTheoTramXe: {},
        dangKyCom: 0,
        khongDangKyCom: 0
      };

      danhSachDangKy.forEach(dangKy => {
        // Thống kê theo phòng ban
        thongKe.dangKyTheoPhongBan[dangKy.PhongBan] = 
          (thongKe.dangKyTheoPhongBan[dangKy.PhongBan] || 0) + 1;

        // Thống kê theo loại ca
        thongKe.dangKyTheoLoaiCa[dangKy.LoaiCa] = 
          (thongKe.dangKyTheoLoaiCa[dangKy.LoaiCa] || 0) + 1;

        // Thống kê theo trạm xe
        thongKe.dangKyTheoTramXe[dangKy.TramXe] = 
          (thongKe.dangKyTheoTramXe[dangKy.TramXe] || 0) + 1;

        // Thống kê đăng ký cơm
        if (dangKy.DangKyCom) {
          thongKe.dangKyCom++;
        } else {
          thongKe.khongDangKyCom++;
        }
      });

      return thongKe;
    } catch (error) {
      console.error('Lỗi khi lấy thống kê đăng ký:', error);
      return {
        tongSoDangKy: 0,
        dangKyTheoPhongBan: {},
        dangKyTheoLoaiCa: {},
        dangKyTheoTramXe: {},
        dangKyCom: 0,
        khongDangKyCom: 0
      };
    }
  }

  /**
   * Kiểm tra xem nhân viên đã đăng ký trong ngày chưa
   */
  async kiemTraDangKyTrongNgay(maNhanVien: string, ngay: Date): Promise<boolean> {
    try {
      const startOfDay = new Date(ngay);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(ngay);
      endOfDay.setHours(23, 59, 59, 999);

      const dangKyTrongNgay = await this.layDangKyPhanXeTheoKhoangThoiGian(startOfDay, endOfDay);
      
      return dangKyTrongNgay.some(dangKy => dangKy.MaNhanVien === maNhanVien);
    } catch (error) {
      console.error('Lỗi khi kiểm tra đăng ký trong ngày:', error);
      return false;
    }
  }

  /**
   * Lấy danh sách xe có sẵn cho một tuyến cụ thể
   */
  async layDanhSachXeCoSan(maTuyenXe: string): Promise<XeDuaDon[]> {
    try {
      const lichTrinhXe = await this.layLichTrinhXeTheoMaTuyen(maTuyenXe);
      const danhSachXe = await this.layDanhSachXeDuaDon();
      
      // Lọc ra những xe chưa được sử dụng cho tuyến này
      const xeDaSuDung = lichTrinhXe.map(l => l.MaXe);
      return danhSachXe.filter(xe => !xeDaSuDung.includes(xe.MaXe));
    } catch (error) {
      console.error('Lỗi khi lấy danh sách xe có sẵn:', error);
      return [];
    }
  }

  // ==================== UTILITY METHODS ====================
  
  /**
   * Lấy danh sách các enum values
   */
  layDanhSachLoaiXe(): string[] {
    return Object.values(LoaiXe);
  }

  layDanhSachLoaiCa(): string[] {
    return Object.values(LoaiCa);
  }

  layDanhSachPhongBan(): string[] {
    return Object.values(PhongBan);
  }

  /**
   * Validate dữ liệu trước khi lưu
   */
  validateDangKyPhanXe(dangKy: Partial<DangKyPhanXe>): string[] {
    const errors: string[] = [];

    if (!dangKy.MaNhanVien?.trim()) {
      errors.push('Mã nhân viên không được để trống');
    }

    if (!dangKy.HoTen?.trim()) {
      errors.push('Họ tên không được để trống');
    }

    if (!dangKy.DienThoai?.trim()) {
      errors.push('Số điện thoại không được để trống');
    }

    if (!dangKy.NgayDangKy) {
      errors.push('Ngày đăng ký không được để trống');
    }

    if (!dangKy.ThoiGianBatDau?.trim()) {
      errors.push('Thời gian bắt đầu không được để trống');
    }

    if (!dangKy.ThoiGianKetThuc?.trim()) {
      errors.push('Thời gian kết thúc không được để trống');
    }

    if (!dangKy.LoaiCa?.trim()) {
      errors.push('Loại ca không được để trống');
    }

    if (!dangKy.MaTuyenXe?.trim()) {
      errors.push('Mã tuyến xe không được để trống');
    }

    return errors;
  }
}
