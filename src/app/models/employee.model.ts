export interface NhanVien {
  NhanVienID: number;
  MaNhanVien?: string;
  MaTuyenXe?: string;
  TramXe?: string;
  HoTen?: string;
  DienThoai?: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface NhanVienFormData {
  MaTuyenXe: string;
  TramXe: string;
  HoTen: string;
  DienThoai: string;
}

