import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Registration } from '../models/registration.model';
import { RouteDetail, RouteDetailCreate } from '../models/route-detail.model';
import { FirestoreService } from './firestore.service';
import { NhanVien } from '../models/employee.model';
import { ImportFormatError, parseTime, ParsedRegistrationRow, validateRegistrationSheet } from './excel-import-sanitize';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  private employeeCache: NhanVien[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /** Dòng bị bỏ qua / ô bị để trống ở lần đọc file gần nhất (readExcelFile / readExcelFileHC). Các dòng khác vẫn nhập. */
  lastImportWarnings: string[] = [];

  constructor(private firestoreService: FirestoreService) {}

  /**
   * Get employees with caching
   * @returns Promise with array of employees
   */
  private async getEmployeesWithCache(): Promise<NhanVien[]> {
    const now = Date.now();
    
    // Check if cache is valid
    if (this.employeeCache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      console.log('Using cached employee data');
      return this.employeeCache;
    }
    
    // Fetch fresh data
    console.log('Fetching fresh employee data from database');
    this.employeeCache = await this.firestoreService.getAllNhanVien();
    this.cacheTimestamp = now;
    
    return this.employeeCache;
  }

  /**
   * Detect Excel file type (.xls or .xlsx)
   * @param file - Excel file
   * @returns File type string
   */
  private detectFileType(file: File): 'xls' | 'xlsx' | 'unknown' {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.xls') && !fileName.endsWith('.xlsx')) {
      return 'xls';
    } else if (fileName.endsWith('.xlsx')) {
      return 'xlsx';
    }
    return 'unknown';
  }

  /**
   * Read Excel file and convert to Registration array
   * Supports both .xls (Excel 97-2003) and .xlsx (Excel 2007+) formats
   * @param file - Excel file
   * @returns Promise with array of Registration objects
   */
  async readExcelFile(file: File): Promise<Registration[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const fileType = this.detectFileType(file);
      
      console.log(`Reading Excel file: ${file.name}, Type: ${fileType}, Size: ${file.size} bytes`);
      this.lastImportWarnings = [];
      if (fileType === 'unknown') {
        reject(new ImportFormatError(['Chỉ nhận file Excel .xlsx hoặc .xls.'], file.name));
        return;
      }
      
      reader.onload = async (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          
          // Configure options for reading Excel files
          // These options work for both .xls and .xlsx
          const readOptions: XLSX.ParsingOptions = {
            type: 'array',
            cellDates: true,        // Parse dates as Date objects
            cellNF: false,          // Don't parse number formats
            cellStyles: false,      // Don't parse cell styles (faster)
            sheetStubs: false,      // Skip empty sheets
            dense: false,           // Use sparse array (better for large files)
            raw: false              // Parse cell values (not raw strings)
          };
          
          // For .xls files, add additional options if needed
          if (fileType === 'xls') {
            console.log('Detected Excel 97-2003 format (.xls), using compatibility mode');
            // xlsx library handles .xls automatically, but we can add specific options
            readOptions.cellText = false; // Don't parse text formatting
          }
          
          const workbook = XLSX.read(data, readOptions);
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            reject(new Error('File Excel không có sheet nào hoặc file bị lỗi'));
            return;
          }
          
          console.log(`Found ${workbook.SheetNames.length} sheet(s): ${workbook.SheetNames.join(', ')}`);
          
          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          if (!worksheet) {
            reject(new Error(`Không thể đọc sheet "${firstSheetName}" từ file Excel`));
            return;
          }
          
          // Convert to JSON with options that work for both formats
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',           // Default value for empty cells
            raw: false            // Parse values (convert dates, numbers, etc.)
          });
          
          console.log(`Converted sheet "${firstSheetName}" to JSON: ${jsonData.length} rows`);
          
          // Nhận cột theo tiêu đề; dòng sai mẫu chỉ bị bỏ qua riêng dòng đó. Chỉ từ chối khi không đọc được người nào.
          const validation = validateRegistrationSheet(jsonData as unknown[][]);
          if (!validation.valid) {
            reject(new ImportFormatError(validation.errors.map(e => `Sheet "${firstSheetName}": ${e}`), file.name));
            return;
          }
          this.lastImportWarnings = validation.warnings;
          
          // Convert to Registration objects with database lookup
          const registrations = await this.convertParsedRows(validation.rows);
          resolve(registrations);
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          console.error('Error reading Excel file:', error);
          reject(new Error(`Lỗi khi đọc file Excel (${fileType}): ${errorMessage}`));
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(new Error('Lỗi khi đọc file. Vui lòng kiểm tra file có bị hỏng không.'));
      };
      
      // Read as ArrayBuffer to support both .xls and .xlsx
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Read Excel file for HC collection - only read sheets "T7" and "CN"
   * Supports both .xls (Excel 97-2003) and .xlsx (Excel 2007+) formats
   * @param file - Excel file
   * @returns Promise with array of Registration objects from both sheets
   */
  async readExcelFileHC(file: File): Promise<Registration[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const fileType = this.detectFileType(file);
      
      console.log(`Reading Excel HC file: ${file.name}, Type: ${fileType}, Size: ${file.size} bytes`);
      this.lastImportWarnings = [];
      if (fileType === 'unknown') {
        reject(new ImportFormatError(['Chỉ nhận file Excel .xlsx hoặc .xls.'], file.name));
        return;
      }
      
      reader.onload = async (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          
          // Configure options for reading Excel files
          const readOptions: XLSX.ParsingOptions = {
            type: 'array',
            cellDates: true,
            cellNF: false,
            cellStyles: false,
            sheetStubs: false,
            dense: false,
            raw: false
          };
          
          if (fileType === 'xls') {
            console.log('Detected Excel 97-2003 format (.xls) for HC, using compatibility mode');
            readOptions.cellText = false;
          }
          
          const workbook = XLSX.read(data, readOptions);
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            reject(new Error('File Excel không có sheet nào hoặc file bị lỗi'));
            return;
          }
          
          console.log(`Found ${workbook.SheetNames.length} sheet(s): ${workbook.SheetNames.join(', ')}`);
          
          const allRegistrations: Registration[] = [];
          const sheetNamesToRead = ['T7', 'CN'];

          // Đọc từng sheet T7/CN: dòng sai mẫu chỉ bỏ qua riêng dòng đó; sheet không đọc được người nào thì báo,
          // nhưng sheet còn lại vẫn nhập. Chỉ từ chối cả file khi không sheet nào đọc được.
          const formatErrors: string[] = [];
          const warnings: string[] = [];
          let foundSheet = false;
          for (const sheetName of sheetNamesToRead) {
            const worksheet = workbook.Sheets[sheetName];
            if (!workbook.SheetNames.includes(sheetName) || !worksheet) {
              console.warn(`Sheet "${sheetName}" not found in Excel file. Available sheets: ${workbook.SheetNames.join(', ')}`);
              continue;
            }
            foundSheet = true;
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false }) as unknown[][];
            const validation = validateRegistrationSheet(rows);
            warnings.push(...validation.warnings.map(w => `Sheet "${sheetName}": ${w}`));
            if (!validation.valid) {
              formatErrors.push(...validation.errors.map(e => `Sheet "${sheetName}": ${e}`));
              continue;
            }

            const registrations = await this.convertParsedRows(validation.rows);

            // Update ngày đăng ký based on sheet name
            // T7: today + 1 day
            // CN: today + 2 days
            const registrationDate = this.getRegistrationDateForSheet(sheetName);
            registrations.forEach(reg => {
              reg.ngayDangKy = registrationDate;
            });

            allRegistrations.push(...registrations);
            console.log(`Read ${registrations.length} registrations from sheet "${sheetName}" with registration date: ${registrationDate}`);
          }

          if (foundSheet && allRegistrations.length === 0 && formatErrors.length > 0) {
            reject(new ImportFormatError(formatErrors, file.name));
            return;
          }
          this.lastImportWarnings = [...formatErrors, ...warnings];
          
          if (allRegistrations.length === 0) {
            reject(new Error(`Không tìm thấy sheet T7 hoặc CN trong file Excel. Các sheet có sẵn: ${workbook.SheetNames.join(', ')}`));
          } else {
            console.log(`Total registrations from HC sheets: ${allRegistrations.length}`);
            resolve(allRegistrations);
          }
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          console.error('Error reading Excel HC file:', error);
          reject(new Error(`Lỗi khi đọc file Excel HC (${fileType}): ${errorMessage}`));
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(new Error('Lỗi khi đọc file. Vui lòng kiểm tra file có bị hỏng không.'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Chuyển các dòng đã đọc và làm sạch (validateRegistrationSheet) thành Registration, tra tuyến theo trạm.
   * Giờ trống thì dùng giờ phụ trội mặc định 15:45 – 19:00; "qua đêm" giữ nguyên là OVERNIGHT_END.
   */
  private async convertParsedRows(rows: ParsedRegistrationRow[]): Promise<Registration[]> {
    const registrations: Registration[] = [];
    for (const row of rows) {
      try {
        const thoiGianBatDau = row.tu || '15:45';
        const thoiGianKetThuc = row.den || '19:00';
        const maTuyenXe = await this.extractRouteFromStationWithDatabase(row.tramXe, row.hoTen);
        registrations.push({
          id: `excel_${row.rowIndex}`, // Temporary ID for Excel import
          maNhanVien: row.maNhanVien || this.generateEmployeeId(row.hoTen, row.rowIndex),
          hoTen: row.hoTen,
          dienThoai: row.dienThoai,
          phongBan: '',
          ngayDangKy: this.getTodayVietnamDate(),
          loaiCa: this.extractShiftFromTime(thoiGianBatDau) || 'PT-cc',
          thoiGianBatDau,
          thoiGianKetThuc,
          maTuyenXe,
          tramXe: row.tramXe,
          noiDungCongViec: row.noiDungCongViec,
          dangKyCom: row.dangKyCom
        });
      } catch (error) {
        console.warn(`Error processing row ${row.rowIndex + 1}:`, error);
      }
    }
    console.log(`📊 Đọc file Excel: ${registrations.length} nhân viên, ${this.lastImportWarnings.length} cảnh báo/dòng bỏ qua`);
    return registrations;
  }

  /**
   * Generate employee ID from name
   * @param hoTen - Full name
   * @param rowIndex - Row index for uniqueness
   * @returns Generated employee ID
   */
  private generateEmployeeId(hoTen: string, rowIndex: number): string {
    if (!hoTen) return `NV${rowIndex.toString().padStart(3, '0')}`;
    
    // Extract first name and last name
    const nameParts = hoTen.trim().split(' ');
    if (nameParts.length >= 2) {
      const lastName = nameParts[nameParts.length - 1];
      const firstName = nameParts[0];
      return `${lastName.toUpperCase().substring(0, 3)}${firstName.toUpperCase().substring(0, 2)}${rowIndex.toString().padStart(3, '0')}`;
    }
    
    // Fallback to simple generation
    return `NV${rowIndex.toString().padStart(3, '0')}`;
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
   * Extract date from Excel document title or content
   * @param data - Raw Excel data
   * @returns Formatted date string (YYYY-MM-DD)
   */
  private extractDateFromExcel(data: any[]): string {
    // Look for date pattern in the first few rows
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (row && row.length > 0) {
        const rowString = row.join(' ');
        // Look for date patterns like "Ngày 05 tháng 09 năm 2025"
        const dateMatch = rowString.match(/(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          return `${year}-${month}-${day}`;
        }
        // Look for other date patterns
        const otherDateMatch = rowString.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (otherDateMatch) {
          const day = otherDateMatch[1].padStart(2, '0');
          const month = otherDateMatch[2].padStart(2, '0');
          const year = otherDateMatch[3];
          return `${year}-${month}-${day}`;
        }
      }
    }
    return '';
  }

  /**
   * Extract shift information from time string
   * @param timeString - Time string from Excel
   * @returns Shift code
   */
  private extractShiftFromTime(timeString: string): string {
    if (!timeString) return 'PT-cc';
    
    const time = timeString.toLowerCase();
    if (time.includes('pt-cc') || time.includes('15h45')) {
      return 'PT-cc';
    }
    if (time.includes('ca sáng') || time.includes('08:00')) {
      return 'Ca sáng';
    }
    if (time.includes('ca chiều') || time.includes('14:00')) {
      return 'Ca chiều';
    }
    if (time.includes('ca tối') || time.includes('22:00')) {
      return 'Ca tối';
    }
    
    return 'PT-cc'; // Default for overtime
  }

  /**
   * Extract time from string (format: HH:mm)
   * @param timeString - Time string from Excel
   * @returns Formatted time string (HH:mm)
   */
  private extractTimeFromString(timeString: string): string {
    // Chỉ nhận giờ hợp lệ; số điện thoại hay ghi chú không được hiểu thành giờ (vd. 0918646042 → "42:00").
    return parseTime(timeString);
  }

  /**
   * Extract route from station name using database lookup
   * @param stationName - Station name from Excel
   * @param hoTen - Employee full name
   * @param quanLyNhanVien - Employee manager (optional)
   * @returns Promise with route code
   */
  private async extractRouteFromStationWithDatabase(stationName: string, hoTen: string, quanLyNhanVien?: string): Promise<string> {
    if (!stationName) return '';
    
    try {
      console.log(`Looking up route for: Station="${stationName}", Name="${hoTen}", Manager="${quanLyNhanVien}"`);
      
      // First, try to find employee in database by name and station
      const employees = await this.getEmployeesWithCache();
      
      // Try exact match first (name + station)
      let matchingEmployee = employees.find(emp => 
        emp.HoTen && emp.HoTen.toLowerCase().includes(hoTen.toLowerCase()) &&
        emp.TramXe && emp.TramXe.toLowerCase().includes(stationName.toLowerCase())
      );
      
      if (matchingEmployee && matchingEmployee.MaTuyenXe) {
        console.log(`Found exact match: ${matchingEmployee.HoTen}, Route: ${matchingEmployee.MaTuyenXe}`);
        return matchingEmployee.MaTuyenXe;
      }
      
      // Try fuzzy match by name only (if station doesn't match exactly)
      if (!matchingEmployee) {
        matchingEmployee = employees.find(emp => 
          emp.HoTen && this.isNameMatch(emp.HoTen, hoTen)
        );
        
        if (matchingEmployee && matchingEmployee.MaTuyenXe) {
          console.log(`Found fuzzy name match: ${matchingEmployee.HoTen}, Route: ${matchingEmployee.MaTuyenXe}`);
          return matchingEmployee.MaTuyenXe;
        }
      }
      
      // Try to find by manager if provided
      if (!matchingEmployee && quanLyNhanVien) {
        const managerEmployees = employees.filter(emp => 
          emp.HoTen && this.isNameMatch(emp.HoTen, quanLyNhanVien)
        );
        
        if (managerEmployees.length > 0) {
          // Get the most common route for this manager's team
          const routeCounts: { [key: string]: number } = {};
          managerEmployees.forEach(emp => {
            if (emp.MaTuyenXe) {
              routeCounts[emp.MaTuyenXe] = (routeCounts[emp.MaTuyenXe] || 0) + 1;
            }
          });
          
          const mostCommonRoute = Object.keys(routeCounts).reduce((a, b) => 
            routeCounts[a] > routeCounts[b] ? a : b
          );
          
          console.log(`Using most common route for manager "${quanLyNhanVien}": ${mostCommonRoute}`);
          return mostCommonRoute;
        }
      }
      
      // Try to find by station only
      const stationEmployees = employees.filter(emp => 
        emp.TramXe && emp.TramXe.toLowerCase().includes(stationName.toLowerCase())
      );
      
      if (stationEmployees.length > 0) {
        // Get the most common route for this station
        const routeCounts: { [key: string]: number } = {};
        stationEmployees.forEach(emp => {
          if (emp.MaTuyenXe) {
            routeCounts[emp.MaTuyenXe] = (routeCounts[emp.MaTuyenXe] || 0) + 1;
          }
        });
        
        const mostCommonRoute = Object.keys(routeCounts).reduce((a, b) => 
          routeCounts[a] > routeCounts[b] ? a : b
        );
        
        console.log(`Using most common route for station "${stationName}": ${mostCommonRoute}`);
        return mostCommonRoute;
      }
      
      // Fallback to hardcoded mapping if no database match
      console.log(`No database match found, using hardcoded mapping for station: ${stationName}`);
      return this.extractRouteFromStationHardcoded(stationName);
      
    } catch (error) {
      console.error('Error looking up route from database:', error);
      // Fallback to hardcoded mapping on error
      return this.extractRouteFromStationHardcoded(stationName);
    }
  }

  /**
   * Check if two names match (fuzzy matching)
   * @param name1 - First name
   * @param name2 - Second name
   * @returns True if names match
   */
  private isNameMatch(name1: string, name2: string): boolean {
    if (!name1 || !name2) return false;
    
    const cleanName1 = name1.toLowerCase().trim().replace(/\s+/g, ' ');
    const cleanName2 = name2.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Exact match
    if (cleanName1 === cleanName2) return true;
    
    // Check if one name contains the other
    if (cleanName1.includes(cleanName2) || cleanName2.includes(cleanName1)) return true;
    
    // Check if last names match (split by space and compare last parts)
    const parts1 = cleanName1.split(' ');
    const parts2 = cleanName2.split(' ');
    
    if (parts1.length > 0 && parts2.length > 0) {
      const lastName1 = parts1[parts1.length - 1];
      const lastName2 = parts2[parts2.length - 1];
      
      if (lastName1 === lastName2 && lastName1.length > 2) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Extract route from station name using hardcoded mapping (fallback)
   * @param stationName - Station name from Excel
   * @returns Route code
   */
  private extractRouteFromStationHardcoded(stationName: string): string {
    if (!stationName) return '';
    
    const station = stationName.toLowerCase();
    
    // Map stations to routes based on common patterns
    if (station.includes('tam hiệp') || station.includes('công viên')) {
      return 'T3';
    }
    if (station.includes('thủ đức') || station.includes('ngã 4')) {
      return 'T2';
    }
    if (station.includes('bv 7b') || station.includes('bệnh viện')) {
      return 'T4';
    }
    if (station.includes('huỳnh văn lũy') || station.includes('metro')) {
      return 'T1';
    }
    
    return stationName; // Return original if no mapping found
  }

  /**
   * Extract route from station name (legacy method for backward compatibility)
   * @param stationName - Station name from Excel
   * @returns Route code
   */
  private extractRouteFromStation(stationName: string): string {
    return this.extractRouteFromStationHardcoded(stationName);
  }

  /**
   * Generate Excel template for download
   * @returns Blob containing Excel file
   */
  generateExcelTemplate(): Blob {
    // Create the overtime work report template matching the image structure
    const today = new Date();
    const dayOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][today.getDay()];
    const dateStr = `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;
    
    const templateData = [
      // Unit row
      ['', 'Đơn vị: Xưởng Thiết Bị Điện', '', '', '', '', '', '', '', '', '', '', '', ''],
      // Empty row
      ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      // Title row
      ['', '', '', '', '', '', '', '', '', 'PHIẾU BÁO LÀM THÊM GIỜ', '', '', '', ''],
      // Empty row
      ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      // Date row
      [dayOfWeek, '', '', '', '', '', '', '', '', '', '', '', '', dateStr],
      // Empty row
      ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      // Header row
      ['STT', 'Họ và tên', 'Trạm xe', 'Điện thoại', '', 'Thời gian làm việc', '', '', '', '', '', '', '', ''],
      // Sub-header row for time columns
      ['', '', '', '', '', 'Từ...', 'Đến...', '', '', '', '', '', '', ''],
      // Sample data
      [1, 'Trịnh Tấn Tài', 'Ngã 4 Vũng Tàu (Ajinomoto)', '0934445411', '', '15h45', '19h', '', '', '', '', '', '', ''],
      [2, 'Nguyễn Mạnh Quân', 'Bà Chiểu', '0907891712', '', '15h45', '19h', '', '', '', '', '', '', ''],
      [3, 'Nguyễn Hoài Hữu', 'Bà chiểu', '0832591880', '', '15h45', '19h', '', '', '', '', '', '', ''],
      [4, 'Huỳnh Bảo Đại Phúc', 'bv 7B', '0976016771', '', '15h45', '19h', '', '', '', '', '', '', ''],
      [5, 'Huỳnh Thanh Sơn', 'bv Đồng Nai', '0967888525', '', '15h45', '19h', '', '', '', '', '', '', '']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    // Set column widths
    const colWidths = [
      { wch: 5 },   // STT
      { wch: 20 },  // Họ và tên
      { wch: 30 },  // Trạm xe
      { wch: 12 },  // Điện thoại
      { wch: 10 },  // Empty
      { wch: 10 },  // Từ...
      { wch: 10 },  // Đến...
      { wch: 10 },  // Empty
      { wch: 10 },  // Empty
      { wch: 10 },  // Empty
      { wch: 10 },  // Empty
      { wch: 10 },  // Empty
      { wch: 10 },  // Empty
      { wch: 10 }   // Empty
    ];
    worksheet['!cols'] = colWidths;
    
    // Merge cells for title and headers
    worksheet['!merges'] = [
      { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } }, // Unit row
      { s: { r: 2, c: 9 }, e: { r: 2, c: 13 } }, // Title row
      { s: { r: 6, c: 5 }, e: { r: 6, c: 6 } }, // Time header
      { s: { r: 7, c: 5 }, e: { r: 7, c: 5 } }, // From sub-header
      { s: { r: 7, c: 6 }, e: { r: 7, c: 6 } }  // To sub-header
    ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Phiếu báo làm thêm giờ');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /**
   * Read Excel file and convert to RouteDetail array
   * Supports both .xls (Excel 97-2003) and .xlsx (Excel 2007+) formats
   * @param file - Excel file
   * @returns Promise with array of RouteDetail objects
   */
  async readRouteDetailExcelFile(file: File): Promise<RouteDetailCreate[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const fileType = this.detectFileType(file);
      
      console.log(`Reading RouteDetail Excel file: ${file.name}, Type: ${fileType}, Size: ${file.size} bytes`);
      
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          
          // Configure options for reading Excel files
          const readOptions: XLSX.ParsingOptions = {
            type: 'array',
            cellDates: true,
            cellNF: false,
            cellStyles: false,
            sheetStubs: false,
            dense: false,
            raw: false
          };
          
          if (fileType === 'xls') {
            console.log('Detected Excel 97-2003 format (.xls) for RouteDetail, using compatibility mode');
            readOptions.cellText = false;
          }
          
          const workbook = XLSX.read(data, readOptions);
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            reject(new Error('File Excel không có sheet nào hoặc file bị lỗi'));
            return;
          }
          
          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          if (!worksheet) {
            reject(new Error(`Không thể đọc sheet "${firstSheetName}" từ file Excel`));
            return;
          }
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            raw: false
          });
          
          // Convert to RouteDetail objects
          const routeDetails = this.convertToRouteDetails(jsonData);
          resolve(routeDetails);
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          console.error('Error reading RouteDetail Excel file:', error);
          reject(new Error(`Lỗi khi đọc file Excel (${fileType}): ${errorMessage}`));
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(new Error('Lỗi khi đọc file. Vui lòng kiểm tra file có bị hỏng không.'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Convert Excel data to RouteDetail objects
   * @param data - Raw Excel data
   * @returns Array of RouteDetail objects
   */
  private convertToRouteDetails(data: any[]): RouteDetailCreate[] {
    const routeDetails: RouteDetailCreate[] = [];
    
    // Skip header row (index 0) and process data rows
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row || row.length === 0 || !row[0]) {
        continue;
      }
      
      try {
        const routeDetail: RouteDetailCreate = {
          maTuyenXe: this.getStringValue(row[1]) || '', // Column B - Route Code
          tenDiemDon: this.getStringValue(row[2]) || '', // Column C - Stop Name
          thuTu: this.getNumberValue(row[3]) || 1 // Column D - Order
        };
        
        // Only add if required fields are present
        if (routeDetail.maTuyenXe && routeDetail.tenDiemDon) {
          routeDetails.push(routeDetail);
        }
      } catch (error) {
        console.warn(`Error processing row ${i + 1}:`, error);
        continue;
      }
    }
    
    return routeDetails;
  }

  /**
   * Get number value from Excel cell
   * @param value - Cell value
   * @returns Number value or 0
   */
  private getNumberValue(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Generate Excel template for route details
   * @returns Blob containing Excel file
   */
  generateRouteDetailTemplate(): Blob {
    const templateData = [
      // Title
      ['MẪU NHẬP DỮ LIỆU CHI TIẾT TUYẾN ĐƯỜNG', '', '', ''],
      ['', '', '', ''],
      // Instructions
      ['Hướng dẫn:', '', '', ''],
      ['- Cột A: STT (số thứ tự)', '', '', ''],
      ['- Cột B: Mã Tuyến Xe (bắt buộc)', '', '', ''],
      ['- Cột C: Tên Điểm Dừng (bắt buộc)', '', '', ''],
      ['- Cột D: Thứ Tự (số nguyên, mặc định là 1)', '', '', ''],
      ['- Dòng đầu tiên là tiêu đề, bỏ qua khi nhập dữ liệu', '', '', ''],
      ['', '', '', ''],
      // Header row
      ['STT', 'Mã Tuyến Xe', 'Tên Điểm Dừng', 'Thứ Tự'],
      // Sample data
      ['1', 'HCM_HC_1', 'Bệnh viện Hòa Hảo', '1'],
      ['2', 'HCM_HC_1', 'Điện Biên Phủ - Hai Bà Trưng', '2'],
      ['3', 'HCM_HC_1', 'Đinh Tiên Hoàng - Điện Biên Phủ', '3'],
      ['4', 'HCM_HC_1', 'Hàng xanh', '4'],
      ['5', 'HCM_HC_1', 'RMK', '5'],
      ['6', 'HCM_HC_1', 'Ngã 4 Thủ Đức', '6'],
      ['7', 'BH_HC_1', 'Ngã 3 Long Bình Tân', '1'],
      ['8', 'BH_HC_1', 'Ngã 3 Bến Gỗ', '2'],
      ['9', 'BH_HC_1', 'KCN Long Đức', '3'],
      ['10', 'BH_HC_1', 'Giáo xứ Đại Lộ', '4']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    // Set column widths
    const colWidths = [
      { wch: 8 },   // STT
      { wch: 15 },  // Mã Tuyến Xe
      { wch: 30 },  // Tên Điểm Dừng
      { wch: 10 }   // Thứ Tự
    ];
    worksheet['!cols'] = colWidths;
    
    // Merge cells for title
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Merge title cells
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }  // Merge empty row
    ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chi tiết tuyến đường');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /**
   * Get today's date in Vietnam timezone (YYYY-MM-DD format)
   */
  private getTodayVietnamDate(): string {
    const today = new Date();
    const vietnamDate = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
    return vietnamDate.toISOString().split('T')[0];
  }

  /**
   * Get registration date based on sheet name for HC import
   * T7: today + 1 day
   * CN: today + 2 days
   * @param sheetName - Sheet name (T7 or CN)
   * @returns Registration date in YYYY-MM-DD format
   */
  private getRegistrationDateForSheet(sheetName: string): string {
    const today = new Date();
    const vietnamDate = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
    
    let daysToAdd = 0;
    if (sheetName === 'T7') {
      daysToAdd = 1; // Thứ 7: hôm nay + 1 ngày
    } else if (sheetName === 'CN') {
      daysToAdd = 2; // Chủ nhật: hôm nay + 2 ngày
    }
    
    // Add days
    const registrationDate = new Date(vietnamDate);
    registrationDate.setDate(registrationDate.getDate() + daysToAdd);
    
    // Format as YYYY-MM-DD
    const year = registrationDate.getFullYear();
    const month = String(registrationDate.getMonth() + 1).padStart(2, '0');
    const day = String(registrationDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Test method to demonstrate route lookup functionality
   * @param stationName - Station name to test
   * @param hoTen - Employee name to test
   * @param quanLyNhanVien - Manager name to test (optional)
   * @returns Promise with route lookup result
   */
  async testRouteLookup(stationName: string, hoTen: string, quanLyNhanVien?: string): Promise<{
    stationName: string;
    hoTen: string;
    quanLyNhanVien?: string;
    foundRoute: string;
    lookupMethod: string;
    timestamp: string;
  }> {
    const startTime = Date.now();
    const foundRoute = await this.extractRouteFromStationWithDatabase(stationName, hoTen, quanLyNhanVien);
    const endTime = Date.now();
    
    return {
      stationName,
      hoTen,
      quanLyNhanVien,
      foundRoute,
      lookupMethod: foundRoute ? 'Database lookup' : 'Hardcoded fallback',
      timestamp: new Date().toISOString()
    };
  }
}
