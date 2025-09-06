import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Registration } from '../models/registration.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  constructor() {}

  /**
   * Read Excel file and convert to Registration array
   * @param file - Excel file
   * @returns Promise with array of Registration objects
   */
  async readExcelFile(file: File): Promise<Registration[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Convert to Registration objects
          const registrations = this.convertToRegistrations(jsonData);
          resolve(registrations);
        } catch (error) {
          reject(new Error('Error reading Excel file: ' + error));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Convert Excel data to Registration objects
   * @param data - Raw Excel data
   * @returns Array of Registration objects
   */
  private convertToRegistrations(data: any[]): Registration[] {
    const registrations: Registration[] = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row || row.length === 0) continue;
      
      try {
        const registration: Registration = {
          id: i, // Temporary ID
          maNhanVien: this.getStringValue(row[0]) || `NV${i.toString().padStart(3, '0')}`,
          hoTen: this.getStringValue(row[1]) || '',
          dienThoai: this.getStringValue(row[2]) || '',
          phongBan: this.getStringValue(row[3]) || '',
          ngayDangKy: this.formatDate(this.getStringValue(row[4])) || new Date().toISOString().split('T')[0],
          loaiCa: this.getStringValue(row[5]) || 'HC',
          thoiGianBatDau: this.getStringValue(row[6]) || '08:00',
          thoiGianKetThuc: this.getStringValue(row[7]) || '17:00',
          maTuyenXe: this.getStringValue(row[8]) || '',
          tramXe: this.getStringValue(row[9]) || '',
          noiDungCongViec: this.getStringValue(row[10]) || '',
          dangKyCom: this.getBooleanValue(row[11]) || false
        };
        
        registrations.push(registration);
      } catch (error) {
        console.warn(`Error processing row ${i}:`, error);
        continue;
      }
    }
    
    return registrations;
  }

  /**
   * Get string value from Excel cell
   * @param value - Cell value
   * @returns String value or empty string
   */
  private getStringValue(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  /**
   * Get boolean value from Excel cell
   * @param value - Cell value
   * @returns Boolean value
   */
  private getBooleanValue(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes' || lowerValue === 'có';
    }
    if (typeof value === 'number') return value !== 0;
    return false;
  }

  /**
   * Format date from Excel cell
   * @param value - Date value
   * @returns Formatted date string (YYYY-MM-DD)
   */
  private formatDate(value: any): string {
    if (!value) return '';
    
    try {
      let date: Date;
      
      if (value instanceof Date) {
        date = value;
      } else if (typeof value === 'number') {
        // Excel date serial number
        date = new Date((value - 25569) * 86400 * 1000);
      } else if (typeof value === 'string') {
        date = new Date(value);
      } else {
        return '';
      }
      
      if (isNaN(date.getTime())) return '';
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  }

  /**
   * Generate Excel template for download
   * @returns Blob containing Excel file
   */
  generateExcelTemplate(): Blob {
    const headers = [
      'Mã Nhân Viên',
      'Họ Tên',
      'Điện Thoại',
      'Phòng Ban',
      'Ngày Đăng Ký',
      'Loại Ca',
      'Thời Gian Bắt Đầu',
      'Thời Gian Kết Thúc',
      'Mã Tuyến Xe',
      'Trạm Xe',
      'Nội Dung Công Việc',
      'Đăng Ký Cơm'
    ];

    const sampleData = [
      ['NV001', 'Nguyễn Văn An', '0901234567', 'Phòng Kỹ Thuật', '2024-01-15', 'HC', '08:00', '17:00', 'T1', 'Trạm A', 'Công việc mẫu', 'Có']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách đăng ký');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
}
