export interface XeDuaDon {
  MaXe: string;
  BienSoXe: string;
  TenTaiXe: string;
  SoDienThoaiTaiXe: string;
  LoaiXe: string;
  MaNhaXe?: string; // Thêm trường liên kết với nhà xe
  GhiChu?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LichTrinhXe {
  MaTuyenXe: string;
  MaXe: string;
  TenTuyenXe: string;
  DiemDon: string;
  SoGheToiDa: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChiTietTuyenDuong {
  MaChiTiet: string;
  MaTuyenXe: string;
  TenDiemDon: string;
  ThuTu: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DangKyPhanXe {
  ID?: string;
  MaNhanVien: string;
  HoTen: string;
  DienThoai: string;
  PhongBan: string;
  NgayDangKy: Date;
  ThoiGianBatDau: string;
  ThoiGianKetThuc: string;
  LoaiCa: string;
  NoiDungCongViec: string;
  DangKyCom: boolean;
  TramXe: string;
  MaTuyenXe: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Enums cho các giá trị cố định
export enum LoaiXe {
  XE_4_CHO = 'Xe 4 chỗ',
  XE_7_CHO = 'Xe 7 chỗ',
  XE_16_CHO = 'Xe 16 chỗ',
  XE_29_CHO = 'Xe 29 chỗ',
  XE_45_CHO = 'Xe 45 chỗ',
  XE_TAXI_7_CHO = 'Xe taxi 7 chỗ'
}

export enum LoaiCa {
  CA_SANG = 'Ca sáng',
  CA_CHIEU = 'Ca chiều',
  CA_TOI = 'Ca tối',
  CA_DEM = 'Ca đêm'
}

export enum PhongBan {
  IT = 'IT',
  HR = 'Nhân sự',
  FINANCE = 'Tài chính',
  MARKETING = 'Marketing',
  SALES = 'Kinh doanh',
  OPERATIONS = 'Vận hành'
}

// Station Assignment Models for PDF Export
export interface StationAssignment {
  stationId: string;
  stationName: string;
  routeCode: string;
  routeName: string;
  assignedDriver: DriverInfo;
  assignedVehicle: VehicleInfo;
  employeeCount: number;
  assignedAt: Date;
}

export interface DriverInfo {
  driverId: string;
  driverName: string;
  phoneNumber: string;
  licenseNumber?: string;
}

export interface VehicleInfo {
  vehicleId: string;
  licensePlate: string;
  vehicleType: string;
  capacity: number;
  garageId?: string;
  garageName?: string;
}

export interface PDFExportData {
  exportDate: Date;
  stationAssignments: StationAssignment[];
  totalEmployees: number;
  totalVehicles: number;
  totalStations: number;
}