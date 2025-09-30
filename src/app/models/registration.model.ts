export interface Registration {
  id: string;
  maNhanVien: string;
  hoTen: string;
  dienThoai: string;
  phongBan: string;
  ngayDangKy: string;
  loaiCa: string;
  thoiGianBatDau: string;
  thoiGianKetThuc: string;
  maTuyenXe: string;
  tramXe: string;
  noiDungCongViec: string;
  dangKyCom: boolean;
}

export interface Department {
  value: string;
  label: string;
}

export interface WorkShift {
  value: string;
  label: string;
}

export interface Route {
  value: string;
  label: string;
}

export interface RegistrationFormData {
  maNhanVien: string;
  hoTen: string;
  dienThoai: string;
  phongBan: string;
  ngayDangKy: string;
  loaiCa: string;
  thoiGianBatDau: string;
  thoiGianKetThuc: string;
  maTuyenXe: string;
  tramXe: string;
  noiDungCongViec: string;
  dangKyCom: boolean;
}
