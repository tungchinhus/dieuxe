export interface RouteDetail {
  id?: string; // Firebase document ID
  maChiTiet: number;
  maTuyenXe: string;
  tenDiemDon: string;
  thuTu: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RouteDetailCreate {
  maTuyenXe: string;
  tenDiemDon: string;
  thuTu: number;
}

export interface RouteDetailUpdate {
  maTuyenXe?: string;
  tenDiemDon?: string;
  thuTu?: number;
}
