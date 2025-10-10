// garage.model.ts
export interface NhaXe {
  MaNhaXe: string;
  TenNhaXe: string;
  DiaChi: string;
  SoDienThoai: string;
  Email?: string;
  NguoiDaiDien: string;
  SoDienThoaiNguoiDaiDien: string;
  GhiChu?: string;
  TrangThai: 'hoat_dong' | 'tam_dung' | 'ngung_hoat_dong';
  createdAt?: Date;
  updatedAt?: Date;
}

export enum TrangThaiNhaXe {
  HOAT_DONG = 'hoat_dong',
  TAM_DUNG = 'tam_dung',
  NGUNG_HOAT_DONG = 'ngung_hoat_dong'
}

export interface NhaXeFormData {
  nhaXe?: NhaXe;
}
