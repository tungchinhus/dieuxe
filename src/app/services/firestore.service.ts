import { Injectable } from '@angular/core';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  DocumentSnapshot,
  QuerySnapshot,
  CollectionReference,
  DocumentReference,
  Timestamp,
  Firestore
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { XeDuaDon, LichTrinhXe, ChiTietTuyenDuong, DangKyPhanXe } from '../models/vehicle.model';
import { NhanVien, NhanVienFormData } from '../models/employee.model';
import { NhaXe } from '../models/garage.model';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore: Firestore;

  // Collection names
  private readonly COLLECTIONS = {
    XE_DUA_DON: 'xeDuaDon',
    LICH_TRINH_XE: 'lichTrinhXe',
    CHI_TIET_TUYEN_DUONG: 'chiTietTuyenDuong',
    DANG_KY_PHAN_XE: 'dangKyPhanXe',
    NHAN_VIEN: 'nhanVien',
    NHA_XE: 'nhaXe'
  };

  constructor(private firebaseService: FirebaseService) {
    this.firestore = this.firebaseService.getFirestore();
  }

  // ==================== XE DUA DON ====================
  async createXeDuaDon(xeDuaDon: Omit<XeDuaDon, 'MaXe' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const data = {
      ...xeDuaDon,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    };
    
    const docRef = await addDoc(collection(this.firestore, this.COLLECTIONS.XE_DUA_DON), data);
    return docRef.id;
  }

  async getXeDuaDonById(id: string): Promise<XeDuaDon | null> {
    const docRef = doc(this.firestore, this.COLLECTIONS.XE_DUA_DON, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return this.convertFirestoreDocToXeDuaDon(docSnap);
    }
    return null;
  }

  async getAllXeDuaDon(): Promise<XeDuaDon[]> {
    const querySnapshot = await getDocs(collection(this.firestore, this.COLLECTIONS.XE_DUA_DON));
    return querySnapshot.docs.map(doc => this.convertFirestoreDocToXeDuaDon(doc));
  }

  async updateXeDuaDon(id: string, data: Partial<Omit<XeDuaDon, 'MaXe' | 'createdAt'>>): Promise<void> {
    const docRef = doc(this.firestore, this.COLLECTIONS.XE_DUA_DON, id);
    const updateData = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    };
    await updateDoc(docRef, updateData);
  }

  async deleteXeDuaDon(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.COLLECTIONS.XE_DUA_DON, id);
    await deleteDoc(docRef);
  }

  // ==================== LICH TRINH XE ====================
  async createLichTrinhXe(lichTrinhXe: Omit<LichTrinhXe, 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const data = {
      ...lichTrinhXe,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    };
    
    const docRef = await addDoc(collection(this.firestore, this.COLLECTIONS.LICH_TRINH_XE), data);
    return docRef.id;
  }

  async getLichTrinhXeById(id: string): Promise<LichTrinhXe | null> {
    const docRef = doc(this.firestore, this.COLLECTIONS.LICH_TRINH_XE, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return this.convertFirestoreDocToLichTrinhXe(docSnap);
    }
    return null;
  }

  async getAllLichTrinhXe(): Promise<LichTrinhXe[]> {
    const querySnapshot = await getDocs(collection(this.firestore, this.COLLECTIONS.LICH_TRINH_XE));
    return querySnapshot.docs.map(doc => this.convertFirestoreDocToLichTrinhXe(doc));
  }

  async getLichTrinhXeByMaTuyen(maTuyenXe: string): Promise<LichTrinhXe[]> {
    const q = query(
      collection(this.firestore, this.COLLECTIONS.LICH_TRINH_XE),
      where('MaTuyenXe', '==', maTuyenXe)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.convertFirestoreDocToLichTrinhXe(doc));
  }

  async updateLichTrinhXe(id: string, data: Partial<Omit<LichTrinhXe, 'MaTuyenXe' | 'createdAt'>>): Promise<void> {
    const docRef = doc(this.firestore, this.COLLECTIONS.LICH_TRINH_XE, id);
    const updateData = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    };
    await updateDoc(docRef, updateData);
  }

  async deleteLichTrinhXe(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.COLLECTIONS.LICH_TRINH_XE, id);
    await deleteDoc(docRef);
  }

  // ==================== CHI TIET TUYEN DUONG ====================
  async createChiTietTuyenDuong(chiTiet: Omit<ChiTietTuyenDuong, 'MaChiTiet' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const data = {
      ...chiTiet,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    };
    
    const docRef = await addDoc(collection(this.firestore, this.COLLECTIONS.CHI_TIET_TUYEN_DUONG), data);
    return docRef.id;
  }

  async getChiTietTuyenDuongById(id: string): Promise<ChiTietTuyenDuong | null> {
    const docRef = doc(this.firestore, this.COLLECTIONS.CHI_TIET_TUYEN_DUONG, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return this.convertFirestoreDocToChiTietTuyenDuong(docSnap);
    }
    return null;
  }

  async getAllChiTietTuyenDuong(): Promise<ChiTietTuyenDuong[]> {
    const querySnapshot = await getDocs(collection(this.firestore, this.COLLECTIONS.CHI_TIET_TUYEN_DUONG));
    return querySnapshot.docs.map(doc => this.convertFirestoreDocToChiTietTuyenDuong(doc));
  }

  async getChiTietTuyenDuongByMaTuyen(maTuyenXe: string): Promise<ChiTietTuyenDuong[]> {
    const q = query(
      collection(this.firestore, this.COLLECTIONS.CHI_TIET_TUYEN_DUONG),
      where('MaTuyenXe', '==', maTuyenXe),
      orderBy('ThuTu', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.convertFirestoreDocToChiTietTuyenDuong(doc));
  }

  async updateChiTietTuyenDuong(id: string, data: Partial<Omit<ChiTietTuyenDuong, 'MaChiTiet' | 'createdAt'>>): Promise<void> {
    const docRef = doc(this.firestore, this.COLLECTIONS.CHI_TIET_TUYEN_DUONG, id);
    const updateData = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    };
    await updateDoc(docRef, updateData);
  }

  async deleteChiTietTuyenDuong(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.COLLECTIONS.CHI_TIET_TUYEN_DUONG, id);
    await deleteDoc(docRef);
  }

  // ==================== DANG KY PHAN XE ====================
  async createDangKyPhanXe(dangKy: Omit<DangKyPhanXe, 'ID' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const data = {
      ...dangKy,
      NgayDangKy: Timestamp.fromDate(dangKy.NgayDangKy),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    };
    
    const docRef = await addDoc(collection(this.firestore, this.COLLECTIONS.DANG_KY_PHAN_XE), data);
    return docRef.id;
  }

  async getDangKyPhanXeById(id: string): Promise<DangKyPhanXe | null> {
    const docRef = doc(this.firestore, this.COLLECTIONS.DANG_KY_PHAN_XE, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return this.convertFirestoreDocToDangKyPhanXe(docSnap);
    }
    return null;
  }

  async getAllDangKyPhanXe(): Promise<DangKyPhanXe[]> {
    const q = query(
      collection(this.firestore, this.COLLECTIONS.DANG_KY_PHAN_XE),
      orderBy('NgayDangKy', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.convertFirestoreDocToDangKyPhanXe(doc));
  }

  async getDangKyPhanXeByMaNhanVien(maNhanVien: string): Promise<DangKyPhanXe[]> {
    const q = query(
      collection(this.firestore, this.COLLECTIONS.DANG_KY_PHAN_XE),
      where('MaNhanVien', '==', maNhanVien),
      orderBy('NgayDangKy', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.convertFirestoreDocToDangKyPhanXe(doc));
  }

  async getDangKyPhanXeByDateRange(startDate: Date, endDate: Date): Promise<DangKyPhanXe[]> {
    const q = query(
      collection(this.firestore, this.COLLECTIONS.DANG_KY_PHAN_XE),
      where('NgayDangKy', '>=', Timestamp.fromDate(startDate)),
      where('NgayDangKy', '<=', Timestamp.fromDate(endDate)),
      orderBy('NgayDangKy', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.convertFirestoreDocToDangKyPhanXe(doc));
  }

  async updateDangKyPhanXe(id: string, data: Partial<Omit<DangKyPhanXe, 'ID' | 'createdAt'>>): Promise<void> {
    const docRef = doc(this.firestore, this.COLLECTIONS.DANG_KY_PHAN_XE, id);
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    };
    
    if (data.NgayDangKy) {
      updateData.NgayDangKy = Timestamp.fromDate(data.NgayDangKy);
    }
    
    await updateDoc(docRef, updateData);
  }

  async deleteDangKyPhanXe(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.COLLECTIONS.DANG_KY_PHAN_XE, id);
    await deleteDoc(docRef);
  }

  // ==================== NHAN VIEN ====================
  async createNhanVien(nhanVienData: NhanVienFormData): Promise<number> {
    const now = new Date();
    
    // Check for duplicates before creating
    await this.checkDuplicateNhanVien(nhanVienData);
    
    // Generate unique employee code
    const maNhanVien = await this.generateNextMaNhanVien();
    
    const data = {
      ...nhanVienData,
      MaNhanVien: maNhanVien,
      NhanVienID: Date.now(), // Use timestamp as ID
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    };
    
    const docRef = await addDoc(collection(this.firestore, this.COLLECTIONS.NHAN_VIEN), data);
    return Date.now();
  }

  async getNhanVienById(id: number): Promise<NhanVien | null> {
    // For now, we'll search by the generated ID in the data
    const q = query(
      collection(this.firestore, this.COLLECTIONS.NHAN_VIEN),
      where('NhanVienID', '==', id)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return this.convertFirestoreDocToNhanVien(querySnapshot.docs[0]);
    }
    return null;
  }

  async getAllNhanVien(): Promise<NhanVien[]> {
    const querySnapshot = await getDocs(collection(this.firestore, this.COLLECTIONS.NHAN_VIEN));
    return querySnapshot.docs.map(doc => this.convertFirestoreDocToNhanVien(doc));
  }

  async getNhanVienByPhongBan(phongBan: string): Promise<NhanVien[]> {
    const q = query(
      collection(this.firestore, this.COLLECTIONS.NHAN_VIEN),
      where('PhongBan', '==', phongBan)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.convertFirestoreDocToNhanVien(doc));
  }

  async getNhanVienByTrangThai(trangThai: number): Promise<NhanVien[]> {
    const q = query(
      collection(this.firestore, this.COLLECTIONS.NHAN_VIEN),
      where('TrangThai', '==', trangThai)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.convertFirestoreDocToNhanVien(doc));
  }

  async updateNhanVien(id: number, data: Partial<NhanVienFormData>): Promise<void> {
    const q = query(
      collection(this.firestore, this.COLLECTIONS.NHAN_VIEN),
      where('NhanVienID', '==', id)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Check for duplicates before updating (excluding current employee)
      await this.checkDuplicateNhanVienForUpdate(id, data);
      
      const docRef = querySnapshot.docs[0].ref;
      const updateData = {
        ...data,
        updatedAt: Timestamp.fromDate(new Date())
      };
      await updateDoc(docRef, updateData);
    }
  }

  async deleteNhanVien(id: number): Promise<void> {
    const q = query(
      collection(this.firestore, this.COLLECTIONS.NHAN_VIEN),
      where('NhanVienID', '==', id)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docRef = querySnapshot.docs[0].ref;
      await deleteDoc(docRef);
    }
  }

  // ==================== HELPER METHODS ====================
  private convertFirestoreDocToXeDuaDon(doc: DocumentSnapshot): XeDuaDon {
    const data = doc.data();
    return {
      MaXe: doc.id,
      BienSoXe: data?.['BienSoXe'] || '',
      TenTaiXe: data?.['TenTaiXe'] || '',
      SoDienThoaiTaiXe: data?.['SoDienThoaiTaiXe'] || '',
      LoaiXe: data?.['LoaiXe'] || '',
      GhiChu: data?.['GhiChu'] || '',
      createdAt: data?.['createdAt']?.toDate(),
      updatedAt: data?.['updatedAt']?.toDate()
    };
  }

  private convertFirestoreDocToLichTrinhXe(doc: DocumentSnapshot): LichTrinhXe {
    const data = doc.data();
    return {
      MaTuyenXe: data?.['MaTuyenXe'] || '',
      MaXe: data?.['MaXe'] || '',
      TenTuyenXe: data?.['TenTuyenXe'] || '',
      DiemDon: data?.['DiemDon'] || '',
      SoGheToiDa: data?.['SoGheToiDa'] || 0,
      createdAt: data?.['createdAt']?.toDate(),
      updatedAt: data?.['updatedAt']?.toDate()
    };
  }

  private convertFirestoreDocToChiTietTuyenDuong(doc: DocumentSnapshot): ChiTietTuyenDuong {
    const data = doc.data();
    return {
      MaChiTiet: doc.id,
      MaTuyenXe: data?.['MaTuyenXe'] || '',
      TenDiemDon: data?.['TenDiemDon'] || '',
      ThuTu: data?.['ThuTu'] || 0,
      createdAt: data?.['createdAt']?.toDate(),
      updatedAt: data?.['updatedAt']?.toDate()
    };
  }

  private convertFirestoreDocToDangKyPhanXe(doc: DocumentSnapshot): DangKyPhanXe {
    const data = doc.data();
    return {
      ID: doc.id,
      MaNhanVien: data?.['MaNhanVien'] || '',
      HoTen: data?.['HoTen'] || '',
      DienThoai: data?.['DienThoai'] || '',
      PhongBan: data?.['PhongBan'] || '',
      NgayDangKy: data?.['NgayDangKy']?.toDate() || new Date(),
      ThoiGianBatDau: data?.['ThoiGianBatDau'] || '',
      ThoiGianKetThuc: data?.['ThoiGianKetThuc'] || '',
      LoaiCa: data?.['LoaiCa'] || '',
      NoiDungCongViec: data?.['NoiDungCongViec'] || '',
      DangKyCom: data?.['DangKyCom'] || false,
      TramXe: data?.['TramXe'] || '',
      MaTuyenXe: data?.['MaTuyenXe'] || '',
      createdAt: data?.['createdAt']?.toDate(),
      updatedAt: data?.['updatedAt']?.toDate()
    };
  }

  private convertFirestoreDocToNhanVien(doc: DocumentSnapshot): NhanVien {
    const data = doc.data();
    return {
      NhanVienID: data?.['NhanVienID'] || Date.now(),
      MaNhanVien: data?.['MaNhanVien'] || '',
      MaTuyenXe: data?.['MaTuyenXe'] || '',
      TramXe: data?.['TramXe'] || '',
      HoTen: data?.['HoTen'] || '',
      DienThoai: data?.['DienThoai'] || '',
      CreatedAt: data?.['createdAt']?.toDate() || new Date(),
      UpdatedAt: data?.['updatedAt']?.toDate() || new Date()
    };
  }

  /**
   * Check for duplicate employee before creating
   * @param nhanVienData - Employee data to check
   * @throws Error if duplicate found
   */
  private async checkDuplicateNhanVien(nhanVienData: NhanVienFormData): Promise<void> {
    const { HoTen, DienThoai, MaTuyenXe, TramXe } = nhanVienData;
    
    if (!HoTen && !DienThoai) {
      return; // No data to check
    }
    
    try {
      const allNhanVien = await this.getAllNhanVien();
      
      // Check for duplicate by phone number (phone must be unique)
      if (DienThoai) {
        const duplicateByPhone = allNhanVien.find(nv => 
          nv.DienThoai && nv.DienThoai.replace(/\s+/g, '') === DienThoai.replace(/\s+/g, '')
        );
        
        if (duplicateByPhone) {
          throw new Error(`Đã tồn tại nhân viên với số điện thoại "${DienThoai}"`);
        }
      }

      // Check for complete duplicate: name + route + station all match
      if (HoTen && MaTuyenXe && TramXe) {
        const completeDuplicate = allNhanVien.find(nv =>
          nv.HoTen && nv.MaTuyenXe && nv.TramXe &&
          nv.HoTen.toLowerCase().trim() === HoTen.toLowerCase().trim() &&
          nv.MaTuyenXe.toLowerCase().trim() === MaTuyenXe.toLowerCase().trim() &&
          nv.TramXe.toLowerCase().trim() === TramXe.toLowerCase().trim()
        );

        if (completeDuplicate) {
          throw new Error(`Đã tồn tại nhân viên với tên "${HoTen}" tại tuyến "${MaTuyenXe}" và trạm "${TramXe}"`);
        }
      }
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('Đã tồn tại nhân viên')) {
        throw error; // Re-throw duplicate errors
      }
      console.error('Error checking duplicate nhan vien:', error);
      // Don't throw error for database issues, just log them
    }
  }

  /**
   * Check for duplicate employee before updating (excluding current employee)
   * @param currentId - Current employee ID to exclude from check
   * @param updateData - Employee data to check
   * @throws Error if duplicate found
   */
  private async checkDuplicateNhanVienForUpdate(currentId: number, updateData: Partial<NhanVienFormData>): Promise<void> {
    const { HoTen, DienThoai, MaTuyenXe, TramXe } = updateData;
    
    if (!HoTen && !DienThoai) {
      return; // No data to check
    }
    
    try {
      const allNhanVien = await this.getAllNhanVien();
      
      // Check for duplicate by phone number (excluding current employee)
      if (DienThoai) {
        const duplicateByPhone = allNhanVien.find(nv => 
          nv.NhanVienID !== currentId &&
          nv.DienThoai && nv.DienThoai.replace(/\s+/g, '') === DienThoai.replace(/\s+/g, '')
        );
        
        if (duplicateByPhone) {
          throw new Error(`Đã tồn tại nhân viên với số điện thoại "${DienThoai}"`);
        }
      }

      // Check for complete duplicate: name + route + station all match (excluding current employee)
      if (HoTen && MaTuyenXe && TramXe) {
        const completeDuplicate = allNhanVien.find(nv =>
          nv.NhanVienID !== currentId &&
          nv.HoTen && nv.MaTuyenXe && nv.TramXe &&
          nv.HoTen.toLowerCase().trim() === HoTen.toLowerCase().trim() &&
          nv.MaTuyenXe.toLowerCase().trim() === MaTuyenXe.toLowerCase().trim() &&
          nv.TramXe.toLowerCase().trim() === TramXe.toLowerCase().trim()
        );

        if (completeDuplicate) {
          throw new Error(`Đã tồn tại nhân viên với tên "${HoTen}" tại tuyến "${MaTuyenXe}" và trạm "${TramXe}"`);
        }
      }
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('Đã tồn tại nhân viên')) {
        throw error; // Re-throw duplicate errors
      }
      console.error('Error checking duplicate nhan vien for update:', error);
      // Don't throw error for database issues, just log them
    }
  }

  /**
   * Generate next available MaNhanVien using timestamp
   * @returns Promise with next MaNhanVien string
   */
  private async generateNextMaNhanVien(): Promise<string> {
    try {
      // Use timestamp-based approach to avoid permission issues
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000);
      return `NV${timestamp.toString().slice(-6)}${randomSuffix.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating next MaNhanVien:', error);
      // Fallback to simple timestamp
      return `NV${Date.now().toString().slice(-6)}`;
    }
  }

  // ==================== NHA XE ====================
  async createNhaXe(nhaXe: Omit<NhaXe, 'MaNhaXe' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const data = {
      ...nhaXe,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    };

    const docRef = await addDoc(collection(this.firestore, this.COLLECTIONS.NHA_XE), data);
    return docRef.id;
  }

  async getAllNhaXe(): Promise<NhaXe[]> {
    try {
      const q = query(
        collection(this.firestore, this.COLLECTIONS.NHA_XE),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const nhaXeList: NhaXe[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        nhaXeList.push({
          MaNhaXe: doc.id,
          TenNhaXe: data['TenNhaXe'] || '',
          DiaChi: data['DiaChi'] || '',
          SoDienThoai: data['SoDienThoai'] || '',
          Email: data['Email'] || '',
          NguoiDaiDien: data['NguoiDaiDien'] || '',
          SoDienThoaiNguoiDaiDien: data['SoDienThoaiNguoiDaiDien'] || '',
          GhiChu: data['GhiChu'] || '',
          TrangThai: data['TrangThai'] || 'hoat_dong',
          createdAt: data['createdAt']?.toDate(),
          updatedAt: data['updatedAt']?.toDate()
        });
      });

      return nhaXeList;
    } catch (error) {
      console.error('Error getting all nha xe:', error);
      throw error;
    }
  }

  async getNhaXeById(maNhaXe: string): Promise<NhaXe | null> {
    try {
      const docRef = doc(this.firestore, this.COLLECTIONS.NHA_XE, maNhaXe);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          MaNhaXe: docSnap.id,
          TenNhaXe: data['TenNhaXe'] || '',
          DiaChi: data['DiaChi'] || '',
          SoDienThoai: data['SoDienThoai'] || '',
          Email: data['Email'] || '',
          NguoiDaiDien: data['NguoiDaiDien'] || '',
          SoDienThoaiNguoiDaiDien: data['SoDienThoaiNguoiDaiDien'] || '',
          GhiChu: data['GhiChu'] || '',
          TrangThai: data['TrangThai'] || 'hoat_dong',
          createdAt: data['createdAt']?.toDate(),
          updatedAt: data['updatedAt']?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting nha xe by ID:', error);
      throw error;
    }
  }

  async updateNhaXe(maNhaXe: string, updateData: Partial<Omit<NhaXe, 'MaNhaXe' | 'createdAt'>>): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.COLLECTIONS.NHA_XE, maNhaXe);
      const data = {
        ...updateData,
        updatedAt: Timestamp.fromDate(new Date())
      };

      await updateDoc(docRef, data);
    } catch (error) {
      console.error('Error updating nha xe:', error);
      throw error;
    }
  }

  async deleteNhaXe(maNhaXe: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.COLLECTIONS.NHA_XE, maNhaXe);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting nha xe:', error);
      throw error;
    }
  }
}
