import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SidenavService } from '../../services/sidenav.service';
import { RegistrationFormDialogComponent } from './registration-form-dialog/registration-form-dialog.component';
import { DuplicateDataDialogComponent } from './duplicate-data-dialog/duplicate-data-dialog.component';
import { ImportErrorDialogComponent } from './import-error-dialog.component';
import { Registration } from '../../models/registration.model';
import { ExcelService } from '../../services/excel.service';
import { VersionService } from '../../services/version.service';
import { VehicleDataService } from '../../services/vehicle-data.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { FirestoreService } from '../../services/firestore.service';
import { StationAssignmentPdfExportService } from '../../services/station-assignment-pdf-export.service';
import { RouteDetailService } from '../../services/route-detail.service';
import { DataCacheService } from '../../services/data-cache.service';
import { StationAssignmentDialogComponent } from '../quan-ly-xe-dua-don/station-assignment-dialog/station-assignment-dialog.component';
import { RouteVehicleAssignmentDialogComponent } from '../quan-ly-xe-dua-don/route-vehicle-assignment-dialog/route-vehicle-assignment-dialog.component';
import { AuthService } from '../../services/auth.service';
import { DangKyPhanXe, LoaiCa, PhongBan, DriverInfo, StationAssignment, PDFExportData } from '../../models/vehicle.model';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dangkyxe',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatToolbarModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCheckboxModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSidenavModule,
    MatListModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule
  ],
  templateUrl: './dangkyxe.component.html',
  styleUrl: './dangkyxe.component.css'
})
export class DangKyXeComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  // Table data
  dataSource = new MatTableDataSource<Registration>([]);
  displayedColumns: string[] = [
    'select',
    'maNhanVien', 
    'hoTen', 
    'dienThoai', 
    'ngayDangKy', 
    'thoiGianBatDau', 
    'tramXe',
    'actions'
  ];
  
  selectedRegistrations = new Set<string>();
  buildInfo = '';
  isCollapsed = false;
  
  // Loading states
  isImportingExcel = false;
  isExportingPDF = false;
  isExportingExcel = false;
  isExportingEmployeeStationPDF = false;
  
  // Time filter properties
  startDate: Date | null = null;
  endDate: Date | null = null;
  
  // Single date picker for display/export near search
  displayDate: Date | null = null;
  
  // Whether to use HC dataset
  useHC: boolean = false;

  constructor(
    private sidenavService: SidenavService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private excelService: ExcelService,
    private versionService: VersionService,
    private vehicleDataService: VehicleDataService,
    private pdfExportService: PdfExportService,
    private excelExportService: ExcelExportService,
    private firestoreService: FirestoreService,
    private stationAssignmentPdfExportService: StationAssignmentPdfExportService,
    private routeDetailService: RouteDetailService,
    private dataCacheService: DataCacheService,
    // private pdfExportEmployeeStationService: PdfExportEmployeeStationService,
    private authService: AuthService
  ) {}

  toggleSidenav(): void {
    this.isCollapsed = !this.isCollapsed;
    this.sidenavService.toggle();
  }

  async ngOnInit(): Promise<void> {
    console.log('Component initialized successfully!');
    
    // Set default date filter to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.startDate = today;
    this.endDate = today;
    
    // Load data cache first
    try {
      await this.dataCacheService.loadAllData();
      console.log('Data cache loaded successfully');
    } catch (error) {
      console.error('Error loading data cache:', error);
    }
    
    this.loadDataFromFirebase(); // Load data from Firebase instead of mock data
    this.buildInfo = this.versionService.getBuildInfo();
    this.updateDisplayedColumns();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  // When user picks a display date, sync it to the existing date filter and search
  onDisplayDateChange(): void {
    if (this.displayDate) {
      const selected = new Date(this.displayDate);
      selected.setHours(0, 0, 0, 0);
      this.startDate = selected;
      this.endDate = selected;
      this.searchByDate();
    } else {
      this.clearDateSearch();
    }
  }

  // When toggling HC data, reload for the current selected date (or today)
  onHCCheckboxChange(): void {
    // Do not load data here. Only switch dataset flag.
    // Data will be reloaded when the date is changed via calendar.
  }

  /**
   * Apply filter to the data source for quick search
   * @param filterValue - The search term
   */
  applyFilter(filterValue: string = ''): void {
    // Remove extra spaces and convert to lowercase
    const searchTerm = filterValue.trim().toLowerCase();
    
    // Set up custom filter predicate for searching in hoTen and tramXe
    this.dataSource.filterPredicate = (data: Registration, filter: string) => {
      // Text search
      const textMatch = !filter || 
        (data.hoTen?.toLowerCase().includes(filter) || false) ||
        (data.tramXe?.toLowerCase().includes(filter) || false) ||
        (data.maNhanVien?.toLowerCase().includes(filter) || false) ||
        (data.dienThoai?.toLowerCase().includes(filter) || false);
      
      // Time filter
      const timeMatch = this.isDateInRange(data.ngayDangKy);
      
      return textMatch && timeMatch;
    };
    
    // Apply the filter
    this.dataSource.filter = searchTerm;
    
    // Reset to first page when filtering
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /**
   * Clear search filter and reset to show all data
   * @param searchInput - Reference to the search input element
   */
  clearSearch(searchInput: HTMLInputElement): void {
    searchInput.value = '';
    this.applyFilter('');
  }

  /**
   * Get date in Vietnam timezone as YYYY-MM-DD string
   */
  private getVietnamDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Convert Firebase Timestamp to Vietnam date string (YYYY-MM-DD)
   * Firebase Timestamps are in UTC, so we need to convert to Vietnam timezone
   */
  private getVietnamDateStringFromTimestamp(timestamp: any): string {
    if (!timestamp) return '';
    
    // Convert to Date object (in local timezone)
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    // Format in Vietnam timezone (UTC+7)
    const vietnamDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const year = vietnamDate.getFullYear();
    const month = String(vietnamDate.getMonth() + 1).padStart(2, '0');
    const day = String(vietnamDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Check if date is within the selected range
   */
  private isDateInRange(dateString: string): boolean {
    if (!this.startDate && !this.endDate) {
      return true; // No date filter applied
    }
    
    if (!dateString) {
      return false; // No date in data
    }
    
    // Convert dateString (YYYY-MM-DD) to a comparable format
    const targetDateStr = dateString.substring(0, 10); // Ensure we only use the date part
    
    if (this.startDate && this.endDate) {
      // Both dates selected - check if date is within range
      const startStr = this.getVietnamDateString(this.startDate);
      const endStr = this.getVietnamDateString(this.endDate);
      return targetDateStr >= startStr && targetDateStr <= endStr;
    } else if (this.startDate) {
      // Only start date selected
      const startStr = this.getVietnamDateString(this.startDate);
      return targetDateStr >= startStr;
    } else if (this.endDate) {
      // Only end date selected
      const endStr = this.getVietnamDateString(this.endDate);
      return targetDateStr <= endStr;
    }
    
    return true;
  }

  /**
   * Clear all filters
   */
  clearAllFilters(): void {
    this.startDate = null;
    this.endDate = null;
    // Also clear text search if there's an input element
    const searchInput = document.querySelector('input[placeholder*="Tìm kiếm nhanh"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
    }
    this.applyFilter('');
  }

  /**
   * Get the number of filtered results
   * @returns Number of filtered results
   */
  getFilteredCount(): number {
    return this.dataSource.filteredData.length;
  }

  /**
   * Get the total number of records
   * @returns Total number of records
   */
  getTotalCount(): number {
    return this.dataSource.data.length;
  }

  /**
   * Search by date range for super_admin
   * If no dates are provided, search all records
   */
  async searchByDate(): Promise<void> {
    // If no dates are provided, show all records for today (default behavior)
    if (!this.startDate && !this.endDate) {
      await this.loadDataFromFirebase();
      this.snackBar.open('Hiển thị tất cả bản ghi', 'Đóng', { duration: 2000 });
      return;
    }

    try {
      // Show loading
      const loadingSnackBar = this.snackBar.open('Đang tìm kiếm dữ liệu...', '', { duration: 0 });
      
      // Load all data from Firebase (PT or HC)
      const dangKyList = this.useHC
        ? await this.vehicleDataService.layDanhSachDangKyPhanXeHC()
        : await this.vehicleDataService.layDanhSachDangKyPhanXe();
      
      if (!dangKyList || dangKyList.length === 0) {
        this.dataSource.data = [];
        loadingSnackBar.dismiss();
        this.snackBar.open('Không tìm thấy dữ liệu nào', 'Đóng', { duration: 2000 });
        return;
      }

      // Filter by NgayDangKy. If startDate == endDate -> match exactly that day.
      const startStr = this.startDate ? this.getVietnamDateString(this.startDate) : null;
      const endStr = this.endDate ? this.getVietnamDateString(this.endDate) : null;

      const filteredRegistrations = dangKyList.filter(dangKy => {
        if (!dangKy.NgayDangKy) return false;
        const regStr = this.getVietnamDateStringFromTimestamp(dangKy.NgayDangKy);

        if (startStr && endStr && startStr === endStr) {
          // Exact day filter
          return regStr === startStr;
        }

        if (startStr && !endStr) {
          return regStr >= startStr;
        }
        if (!startStr && endStr) {
          return regStr <= endStr;
        }
        if (startStr && endStr) {
          return regStr >= startStr && regStr <= endStr;
        }
        return true;
      });

      // Convert to Registration format
      const registrations: Registration[] = filteredRegistrations.map((dangKy, index) => ({
        id: dangKy.ID || `temp_${index}`,
        maNhanVien: dangKy.MaNhanVien || '',
        hoTen: dangKy.HoTen || '',
        dienThoai: dangKy.DienThoai || '',
        phongBan: '',
        ngayDangKy: this.getVietnamDateStringFromTimestamp(dangKy.NgayDangKy),
        loaiCa: dangKy.LoaiCa || '',
        thoiGianBatDau: dangKy.ThoiGianBatDau || '',
        thoiGianKetThuc: dangKy.ThoiGianKetThuc || '',
        maTuyenXe: dangKy.MaTuyenXe || '',
        tramXe: dangKy.TramXe || '',
        noiDungCongViec: dangKy.NoiDungCongViec || '',
        dangKyCom: dangKy.DangKyCom || false
      }));

      // Update data source
      this.dataSource.data = registrations;
      
      // Dismiss loading
      loadingSnackBar.dismiss();
      
      const count = registrations.length;
      const message = (startStr && endStr && startStr === endStr)
        ? `Tìm thấy ${count} bản ghi cho ngày ${startStr}`
        : `Tìm thấy ${count} bản ghi trong khoảng thời gian đã chọn`;
      this.snackBar.open(message, 'Đóng', { duration: 3000 });
      
    } catch (error) {
      console.error('Error searching by date:', error);
      this.snackBar.open('Có lỗi xảy ra khi tìm kiếm dữ liệu', 'Đóng', { duration: 3000 });
    }
  }

  /**
   * Clear date search and reset to today
   */
  async clearDateSearch(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.startDate = today;
    this.endDate = today;
    await this.loadDataFromFirebase();
    this.snackBar.open('Đã đặt lại bộ lọc về ngày hôm nay', 'Đóng', { duration: 2000 });
  }

  private loadMockData(): void {
    const mockData: Registration[] = this.generateMockData(25);
    this.dataSource.data = mockData;
  }

  private generateMockData(count: number): Registration[] {
    const data: Registration[] = [];
    const departments = ['Phòng Kỹ Thuật', 'Phòng Nhân Sự', 'Phòng Kinh Doanh', 'Phòng Tài Chính', 'Phòng Hành Chính'];
    const workShifts = [
      { value: 'HC', label: 'Hành chính (08:00 - 17:00)' },
      { value: 'C1', label: 'Ca 1 (06:00 - 14:00)' },
      { value: 'C2', label: 'Ca 2 (14:00 - 22:00)' },
      { value: 'C3', label: 'Ca 3 (22:00 - 06:00)' }
    ];
    const routes = [
      'Tuyến 1 - KCN Biên Hòa 2',
      'Tuyến 2 - Ngã 3 Vũng Tàu', 
      'Tuyến 3 - Vòng xoay Tam Hiệp',
      'Tuyến 4 - KCN Long Bình'
    ];
    const names = [
      'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Văn Cường', 'Phạm Thị Dung', 'Hoàng Văn Em',
      'Võ Thị Phương', 'Đặng Văn Giang', 'Bùi Thị Hoa', 'Phan Văn Inh', 'Ngô Thị Kim',
      'Lý Văn Long', 'Đinh Thị Mai', 'Vũ Văn Nam', 'Tôn Thị Oanh', 'Cao Văn Phúc',
      'Lương Thị Quỳnh', 'Hồ Văn Rồng', 'Đỗ Thị Sương', 'Tạ Văn Tùng', 'Lưu Thị Uyên',
      'Vương Văn Việt', 'Đào Thị Xuân', 'Lâm Văn Yên', 'Bạch Thị Zin', 'Hà Văn Anh'
    ];

    for (let i = 1; i <= count; i++) {
      const workShift = workShifts[Math.floor(Math.random() * workShifts.length)];
      const timeMatch = workShift.label.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
      
      data.push({
        id: `test_${i}`,
        maNhanVien: `NV${i.toString().padStart(3, '0')}`,
        hoTen: names[Math.floor(Math.random() * names.length)],
        dienThoai: `090${Math.floor(Math.random() * 9000000) + 1000000}`,
        phongBan: departments[Math.floor(Math.random() * departments.length)],
        ngayDangKy: `2024-01-${(Math.floor(Math.random() * 28) + 1).toString().padStart(2, '0')}`,
        loaiCa: workShift.value,
        thoiGianBatDau: timeMatch ? timeMatch[1] : '08:00',
        thoiGianKetThuc: timeMatch ? timeMatch[2] : '17:00',
        maTuyenXe: routes[Math.floor(Math.random() * routes.length)],
        tramXe: `Trạm ${String.fromCharCode(65 + Math.floor(Math.random() * 4))}`,
        noiDungCongViec: 'Công việc mẫu',
        dangKyCom: Math.random() > 0.5
      });
    }

    return data;
  }

  // Dialog methods
  openAddRegistrationDialog(): void {
    const dialogRef = this.dialog.open(RegistrationFormDialogComponent, {
      width: '800px',
      data: {
        departments: this.getDepartments(),
        workShifts: this.getWorkShifts(),
        routes: this.getRoutes()
      }
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        // Check for duplicate before adding
        const duplicateData = await this.checkDuplicateNameAndStationForAdd(result.hoTen, result.tramXe, result.ngayDangKy);
        
        if (duplicateData.length > 0) {
          // Show duplicate popup instead of snackbar
          this.showDuplicateDialogForAdd(result, duplicateData);
          return;
        }

        const newRegistration: Registration = {
          id: this.dataSource.data.length + 1,
          ...result,
          phongBan: '', // Remove phongBan field
          maTuyenXe: result.maTuyenXe // Keep as is since it's now the route code
        };
        
        // Convert to DangKyPhanXe and save to Firebase
        const dangKyPhanXe: Omit<DangKyPhanXe, 'ID' | 'createdAt' | 'updatedAt'> = {
          MaNhanVien: newRegistration.maNhanVien,
          HoTen: newRegistration.hoTen,
          DienThoai: newRegistration.dienThoai,
          PhongBan: '',
          NgayDangKy: this.createVietnamDate(newRegistration.ngayDangKy),
          ThoiGianBatDau: newRegistration.thoiGianBatDau,
          ThoiGianKetThuc: newRegistration.thoiGianKetThuc,
          LoaiCa: this.mapLoaiCa(newRegistration.loaiCa),
          NoiDungCongViec: newRegistration.noiDungCongViec || '',
          DangKyCom: newRegistration.dangKyCom,
          TramXe: newRegistration.tramXe || '',
          MaTuyenXe: newRegistration.maTuyenXe || ''
        };

        // Save to Firebase
        if (this.useHC) {
          await this.vehicleDataService.dangKyPhanXeHC(dangKyPhanXe);
        } else {
          await this.vehicleDataService.dangKyPhanXe(dangKyPhanXe);
        }
        
        // Refresh data from Firebase
        await this.loadDataFromFirebase();
        this.snackBar.open('Đăng ký mới đã được thêm thành công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    });
  }

  // Data methods
  getDepartments() {
    return [
      { value: 'KT', label: 'Phòng Kỹ Thuật' },
      { value: 'NS', label: 'Phòng Nhân Sự' },
      { value: 'KD', label: 'Phòng Kinh Doanh' },
      { value: 'TC', label: 'Phòng Tài Chính' },
      { value: 'HC', label: 'Phòng Hành Chính' }
    ];
  }

  getWorkShifts() {
    return [
      { value: 'HC', label: 'Hành chính (08:00 - 17:00)' },
      { value: 'C1', label: 'Ca 1 (06:00 - 14:00)' },
      { value: 'C2', label: 'Ca 2 (14:00 - 22:00)' },
      { value: 'C3', label: 'Ca 3 (22:00 - 06:00)' }
    ];
  }

  getRoutes() {
    return [
      { value: 'T1', label: 'Tuyến 1 - KCN Biên Hòa 2' },
      { value: 'T2', label: 'Tuyến 2 - Ngã 3 Vũng Tàu' },
      { value: 'T3', label: 'Tuyến 3 - Vòng xoay Tam Hiệp' },
      { value: 'T4', label: 'Tuyến 4 - KCN Long Bình' }
    ];
  }

  // File upload methods
  openFileUploadDialog(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.multiple = true; // Allow multiple file selection
    input.onchange = (event: any) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        this.handleMultipleFileUpload(Array.from(files));
      }
    };
    input.click();
  }

  // File upload for HC collection
  openFileUploadDialogHC(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.multiple = true; // Allow multiple file selection
    input.onchange = (event: any) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        this.handleMultipleFileUploadHC(Array.from(files));
      }
    };
    input.click();
  }

  private async handleFileUploadHC(file: File): Promise<void> {
    try {
      console.log('HC File selected:', file.name);
      
      // Set loading state
      this.isImportingExcel = true;

      // Read and process Excel file (only T7 and CN sheets)
      const registrations = await this.excelService.readExcelFileHC(file);
      console.log('HC Excel data processed:', registrations);

      if (registrations.length > 0) {
        // Check for duplicates
        const duplicateCheck = await this.checkDuplicatesInImportDataHC(registrations);
        
        if (duplicateCheck.duplicates.length > 0) {
          // Show duplicate notification dialog
          const dialogRef = this.dialog.open(DuplicateDataDialogComponent, {
            width: '600px',
            data: {
              duplicates: duplicateCheck.duplicates,
              validData: duplicateCheck.validData,
              duplicateDetails: duplicateCheck.duplicateDetails,
              totalRecords: registrations.length,
              allDuplicates: duplicateCheck.allDuplicates
            }
          });

          // Auto-save valid data while showing dialog
          if (duplicateCheck.validData.length > 0) {
            const result = await this.saveRegistrationsToFirebaseHC(duplicateCheck.validData);
            
            // Note: HC data is saved to separate collection, so we don't refresh the main table
            // The main table shows PT data only
            
            // Show detailed import results if there are any failures
            if (result.failedData.length > 0) {
              const errorDialogRef = this.dialog.open(ImportErrorDialogComponent, {
                width: '1000px',
                data: {
                  totalProcessed: duplicateCheck.validData.length,
                  savedCount: result.savedCount,
                  failedData: result.failedData
                }
              });
            }
          }

          dialogRef.afterClosed().subscribe(async (result) => {
            // Dialog closed - no additional notification needed
            // The dialog already shows all the necessary information
          });
        } else {
          // No duplicates, save all data
          const result = await this.saveRegistrationsToFirebaseHC(registrations);
          
          if (result.savedCount > 0) {
            // Show success message
            const snackBarRef = this.snackBar.open(
              `Đã import và lưu ${result.savedCount}/${registrations.length} đăng ký HC vào hệ thống!`, 
              '', 
              {
                duration: 8000,
                horizontalPosition: 'right',
                verticalPosition: 'top'
              }
            );
          } else {
            this.snackBar.open('Không có dữ liệu hợp lệ để lưu vào Firebase HC!', 'Đóng', {
              duration: 3000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            });
          }
          
          // Show detailed import results if there are any failures
          if (result.failedData.length > 0) {
            const errorDialogRef = this.dialog.open(ImportErrorDialogComponent, {
              width: '1000px',
              data: {
                totalProcessed: registrations.length,
                savedCount: result.savedCount,
                failedData: result.failedData
              }
            });
          }
        }
      } else {
        this.snackBar.open('Không tìm thấy dữ liệu hợp lệ trong file Excel HC!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }

    } catch (error) {
      console.error('HC import error:', error);
      this.snackBar.open(`Lỗi khi xử lý file Excel HC: ${error}`, 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } finally {
      // Reset loading state
      this.isImportingExcel = false;
    }
  }

  private async saveRegistrationsToFirebaseHC(registrations: Registration[], allowOverwrite: boolean = false): Promise<{savedCount: number, failedData: Array<{registration: Registration, reason: string}>}> {
    let savedCount = 0;
    const failedData: Array<{registration: Registration, reason: string}> = [];
    
    console.log(`[HC Import] Starting to save ${registrations.length} registrations to Firebase HC collection`);

    for (const reg of registrations) {
      try {
        console.log(`[HC Import] Processing registration: ${reg.hoTen} - ${reg.tramXe} - ${reg.ngayDangKy}`);
        
        const dangKyPhanXe: Omit<DangKyPhanXe, 'ID' | 'createdAt' | 'updatedAt'> = {
          MaNhanVien: reg.maNhanVien,
          HoTen: reg.hoTen,
          DienThoai: reg.dienThoai,
          PhongBan: '',
          NgayDangKy: this.createVietnamDate(reg.ngayDangKy),
          ThoiGianBatDau: reg.thoiGianBatDau,
          ThoiGianKetThuc: reg.thoiGianKetThuc,
          LoaiCa: this.mapLoaiCa(reg.loaiCa),
          NoiDungCongViec: reg.noiDungCongViec || '',
          DangKyCom: reg.dangKyCom,
          TramXe: reg.tramXe || '',
          MaTuyenXe: ''
        };

        console.log(`[HC Import] Converted data:`, dangKyPhanXe);

        const errors = this.vehicleDataService.validateDangKyPhanXe(dangKyPhanXe);
        if (errors.length > 0) {
          console.warn(`[HC Import] Validation errors for ${reg.hoTen}:`, errors);
          failedData.push({ registration: reg, reason: `Lỗi validation: ${errors.join(', ')}` });
          continue;
        }

        const isDuplicate = await this.checkDuplicateNameAndStationHC(reg.hoTen, reg.tramXe, reg.ngayDangKy);
        if (isDuplicate && !allowOverwrite) {
          console.warn(`[HC Import] Duplicate found: ${reg.hoTen} at ${reg.tramXe} for ${reg.ngayDangKy}`);
          failedData.push({ registration: reg, reason: `Trùng lặp: đã đăng ký tại trạm ${reg.tramXe} cho ngày ${reg.ngayDangKy}` });
          continue;
        }

        const docId = await this.vehicleDataService.dangKyPhanXeHC(dangKyPhanXe);
        console.log(`[HC Import] Successfully saved ${reg.hoTen} with document ID: ${docId}`);
        savedCount++;
      } catch (error: any) {
        console.error(`[HC Import] Error saving ${reg.hoTen}:`, error);
        const errorMessage = error?.message || String(error);
        failedData.push({ 
          registration: reg, 
          reason: `Lỗi khi lưu vào Firebase HC: ${errorMessage}` 
        });
        continue;
      }
    }

    console.log(`[HC Import] Completed: ${savedCount} saved, ${failedData.length} failed`);
    return { savedCount, failedData };
  }

  private async checkDuplicateNameAndStationHC(hoTen: string, tramXe: string, ngayDangKy: string): Promise<boolean> {
    try {
      const today = new Date();
      const todayString = this.getVietnamDateString(today);
      if (ngayDangKy !== todayString) {
        return false;
      }
      const allRegistrations = await this.vehicleDataService.layDanhSachDangKyPhanXeHC();
      return allRegistrations.some(reg => 
        reg.HoTen?.toLowerCase().trim() === hoTen?.toLowerCase().trim() && 
        reg.TramXe?.toLowerCase().trim() === tramXe?.toLowerCase().trim() && 
        this.getVietnamDateStringFromTimestamp(reg.NgayDangKy) === ngayDangKy
      );
    } catch (error) {
      console.error('Error checking duplicates HC:', error);
      return false;
    }
  }

  private async checkDuplicatesInImportDataHC(registrations: Registration[]): Promise<{
    duplicates: Registration[];
    validData: Registration[];
    duplicateDetails: string[];
    allDuplicates: boolean;
  }> {
    const today = new Date();
    const todayString = this.getVietnamDateString(today);
    const allRegistrations = await this.vehicleDataService.layDanhSachDangKyPhanXeHC();

    const duplicates: Registration[] = [];
    const validData: Registration[] = [];
    const duplicateDetails: string[] = [];

    for (const reg of registrations) {
      if (reg.ngayDangKy !== todayString) {
        validData.push(reg);
        continue;
      }
      const dup = allRegistrations.find(item =>
        item.HoTen?.toLowerCase().trim() === reg.hoTen?.toLowerCase().trim() &&
        item.TramXe?.toLowerCase().trim() === reg.tramXe?.toLowerCase().trim() &&
        this.getVietnamDateStringFromTimestamp(item.NgayDangKy) === reg.ngayDangKy
      );
      if (dup) {
        duplicates.push(reg);
        duplicateDetails.push(`${reg.hoTen} - ${reg.tramXe} (${reg.ngayDangKy})`);
      } else {
        validData.push(reg);
      }
    }

    return {
      duplicates,
      validData,
      duplicateDetails,
      allDuplicates: validData.length === 0 && duplicates.length > 0
    };
  }

  // Direct upload to Google Drive - one click upload (DISABLED - Google Drive services removed)
  async uploadToGoogleDrive(file: File): Promise<void> {
    this.snackBar.open('Google Drive upload đã bị vô hiệu hóa. Vui lòng sử dụng tính năng export PDF.', 'Đóng', {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  // Simulate upload process
  private async simulateUploadProcess(file: File): Promise<void> {
    return new Promise((resolve) => {
      // Simulate upload time based on file size
      const uploadTime = Math.min(3000, Math.max(1000, file.size / 1000));
      
      setTimeout(() => {
        console.log('File uploaded successfully:', {
          name: file.name,
          size: file.size,
          type: file.type,
          folderId: '12l5dc4YppVBQXkgx96WVuyXXzcf8DEP6'
        });
        resolve();
      }, uploadTime);
    });
  }

  // Upload file to Google Drive API
  private async uploadFileToGoogleDriveAPI(file: File): Promise<any> {
    try {
      // For now, we'll use a simple approach
      // In a real implementation, you would need proper OAuth2 authentication
      
      // Create file metadata
      const metadata = {
        name: file.name,
        parents: ['12l5dc4YppVBQXkgx96WVuyXXzcf8DEP6']
      };

      // Create form data
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', file);

      // For demonstration, we'll simulate a successful upload
      // In reality, you would make an actual API call here
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            fileId: 'simulated-file-id',
            fileName: file.name,
            message: 'File uploaded successfully'
          });
        }, 2000);
      });

    } catch (error) {
      console.error('API upload failed:', error);
      return {
        success: false,
        error: error
      };
    }
  }

  // Show upload instructions based on result (DISABLED - Google Drive services removed)
  private showUploadInstructions(uploadResult: any): void {
    this.snackBar.open('Google Drive upload đã bị vô hiệu hóa. Vui lòng sử dụng tính năng export PDF.', 'Đóng', {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  // Show manual upload instructions (DISABLED - Google Drive services removed)
  private showManualUploadInstructions(file: File): void {
    this.snackBar.open('Google Drive upload đã bị vô hiệu hóa. Vui lòng sử dụng tính năng export PDF.', 'Đóng', {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  private async handleFileUpload(file: File): Promise<void> {
    try {
      console.log('File selected:', file.name);
      
      // Set loading state
      this.isImportingExcel = true;

      // Read and process Excel file
      const registrations = await this.excelService.readExcelFile(file);
      console.log('Excel data processed:', registrations);

      if (registrations.length > 0) {
        // Check for duplicates
        const duplicateCheck = await this.checkDuplicatesInImportData(registrations);
        
        if (duplicateCheck.duplicates.length > 0) {
          // Show duplicate notification dialog
          const dialogRef = this.dialog.open(DuplicateDataDialogComponent, {
            width: '600px',
            data: {
              duplicates: duplicateCheck.duplicates,
              validData: duplicateCheck.validData,
              duplicateDetails: duplicateCheck.duplicateDetails,
              totalRecords: registrations.length,
              allDuplicates: duplicateCheck.allDuplicates
            }
          });

          // Auto-save valid data while showing dialog
          if (duplicateCheck.validData.length > 0) {
            const result = await this.saveRegistrationsToFirebase(duplicateCheck.validData);
            
            if (result.savedCount > 0) {
              // Refresh data from Firebase
              await this.loadDataFromFirebase();
            }
            
            // Show detailed import results if there are any failures
            if (result.failedData.length > 0) {
              const errorDialogRef = this.dialog.open(ImportErrorDialogComponent, {
                width: '1000px',
                data: {
                  totalProcessed: duplicateCheck.validData.length,
                  savedCount: result.savedCount,
                  failedData: result.failedData
                }
              });
            }
          }

          dialogRef.afterClosed().subscribe(async (result) => {
            // Dialog closed - no additional notification needed
            // The dialog already shows all the necessary information
          });
        } else {
          // No duplicates, save all data
          const result = await this.saveRegistrationsToFirebase(registrations);
          
          if (result.savedCount > 0) {
            // Refresh data from Firebase
            await this.loadDataFromFirebase();
            
            // Show success message
            const snackBarRef = this.snackBar.open(
              `Đã import và lưu ${result.savedCount}/${registrations.length} đăng ký vào hệ thống!`, 
              '', 
              {
                duration: 8000,
                horizontalPosition: 'right',
                verticalPosition: 'top'
              }
            );
          } else {
            this.snackBar.open('Không có dữ liệu hợp lệ để lưu vào Firebase!', 'Đóng', {
              duration: 3000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            });
          }
          
          // Show detailed import results if there are any failures
          if (result.failedData.length > 0) {
            const errorDialogRef = this.dialog.open(ImportErrorDialogComponent, {
              width: '1000px',
              data: {
                totalProcessed: registrations.length,
                savedCount: result.savedCount,
                failedData: result.failedData
              }
            });
          }
        }
      } else {
        this.snackBar.open('Không tìm thấy dữ liệu hợp lệ trong file Excel!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }

    } catch (error) {
      console.error('Error processing file:', error);
      this.snackBar.open(`Lỗi khi xử lý file: ${error}`, 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } finally {
      // Reset loading state
      this.isImportingExcel = false;
    }
  }

  // Handle multiple file uploads
  private async handleMultipleFileUpload(files: File[]): Promise<void> {
    if (files.length === 0) return;

    try {
      this.isImportingExcel = true;
      const totalFiles = files.length;
      let totalRegistrations: Registration[] = [];
      let totalSaved = 0;
      let totalFailed = 0;
      const allFailedData: Array<{registration: Registration, reason: string}> = [];
      const allDuplicates: Registration[] = [];
      const allValidData: Registration[] = [];

      // Process each file sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileNumber = i + 1;
        
        this.snackBar.open(
          `Đang xử lý file ${fileNumber}/${totalFiles}: ${file.name}...`, 
          'Đóng', 
          {
            duration: 2000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          }
        );

        try {
          console.log(`Processing file ${fileNumber}/${totalFiles}:`, file.name);
          
          // Read and process Excel file
          const registrations = await this.excelService.readExcelFile(file);
          console.log(`File ${file.name} processed:`, registrations.length, 'registrations');

          if (registrations.length > 0) {
            totalRegistrations = totalRegistrations.concat(registrations);
            
            // Check for duplicates
            const duplicateCheck = await this.checkDuplicatesInImportData(registrations);
            
            allDuplicates.push(...duplicateCheck.duplicates);
            allValidData.push(...duplicateCheck.validData);
          } else {
            console.warn(`No valid data found in file: ${file.name}`);
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          this.snackBar.open(
            `Lỗi khi xử lý file ${file.name}: ${error}`, 
            'Đóng', 
            {
              duration: 5000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            }
          );
        }
      }

      // Process all collected data
      if (totalRegistrations.length > 0) {
        if (allDuplicates.length > 0) {
          // Show duplicate notification dialog
          const dialogRef = this.dialog.open(DuplicateDataDialogComponent, {
            width: '600px',
            data: {
              duplicates: allDuplicates,
              validData: allValidData,
              duplicateDetails: allDuplicates.map(d => `${d.hoTen} - ${d.tramXe} (${d.ngayDangKy})`),
              totalRecords: totalRegistrations.length,
              allDuplicates: allValidData.length === 0 && allDuplicates.length > 0
            }
          });

          // Auto-save valid data while showing dialog
          if (allValidData.length > 0) {
            const result = await this.saveRegistrationsToFirebase(allValidData);
            totalSaved = result.savedCount;
            totalFailed = result.failedData.length;
            allFailedData.push(...result.failedData);
            
            if (result.savedCount > 0) {
              // Refresh data from Firebase
              await this.loadDataFromFirebase();
            }
            
            // Show detailed import results if there are any failures
            if (result.failedData.length > 0) {
              const errorDialogRef = this.dialog.open(ImportErrorDialogComponent, {
                width: '1000px',
                data: {
                  totalProcessed: allValidData.length,
                  savedCount: result.savedCount,
                  failedData: result.failedData
                }
              });
            }
          }

          dialogRef.afterClosed().subscribe(async () => {
            // Show summary
            this.snackBar.open(
              `Hoàn thành import ${totalFiles} file(s): ${totalSaved} đã lưu, ${allDuplicates.length} trùng lặp, ${totalFailed} lỗi`, 
              'Đóng', 
              {
                duration: 8000,
                horizontalPosition: 'right',
                verticalPosition: 'top'
              }
            );
          });
        } else {
          // No duplicates, save all data (use totalRegistrations which equals allValidData when no duplicates)
          const dataToSave = allValidData.length > 0 ? allValidData : totalRegistrations;
          const result = await this.saveRegistrationsToFirebase(dataToSave);
          totalSaved = result.savedCount;
          totalFailed = result.failedData.length;
          allFailedData.push(...result.failedData);
          
          if (result.savedCount > 0) {
            // Refresh data from Firebase
            await this.loadDataFromFirebase();
            
            // Show success message
            this.snackBar.open(
              `Đã import ${totalFiles} file(s) và lưu ${result.savedCount}/${totalRegistrations.length} đăng ký vào hệ thống!`, 
              '', 
              {
                duration: 8000,
                horizontalPosition: 'right',
                verticalPosition: 'top'
              }
            );
          } else {
            this.snackBar.open('Không có dữ liệu hợp lệ để lưu vào Firebase!', 'Đóng', {
              duration: 3000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            });
          }
          
          // Show detailed import results if there are any failures
          if (result.failedData.length > 0) {
            const errorDialogRef = this.dialog.open(ImportErrorDialogComponent, {
              width: '1000px',
              data: {
                totalProcessed: totalRegistrations.length,
                savedCount: result.savedCount,
                failedData: result.failedData
              }
            });
          }
        }
      } else {
        this.snackBar.open(
          `Không tìm thấy dữ liệu hợp lệ trong ${totalFiles} file(s) đã chọn!`, 
          'Đóng', 
          {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          }
        );
      }

    } catch (error) {
      console.error('Error processing multiple files:', error);
      this.snackBar.open(`Lỗi khi xử lý nhiều file: ${error}`, 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } finally {
      // Reset loading state
      this.isImportingExcel = false;
    }
  }

  // Handle multiple file uploads for HC collection
  private async handleMultipleFileUploadHC(files: File[]): Promise<void> {
    if (files.length === 0) return;

    try {
      this.isImportingExcel = true;
      const totalFiles = files.length;
      let totalRegistrations: Registration[] = [];
      let totalSaved = 0;
      let totalFailed = 0;
      const allFailedData: Array<{registration: Registration, reason: string}> = [];
      const allDuplicates: Registration[] = [];
      const allValidData: Registration[] = [];

      // Process each file sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileNumber = i + 1;
        
        this.snackBar.open(
          `Đang xử lý file HC ${fileNumber}/${totalFiles}: ${file.name}...`, 
          'Đóng', 
          {
            duration: 2000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          }
        );

        try {
          console.log(`Processing HC file ${fileNumber}/${totalFiles}:`, file.name);
          
          // Read and process Excel file (only T7 and CN sheets)
          const registrations = await this.excelService.readExcelFileHC(file);
          console.log(`HC File ${file.name} processed:`, registrations.length, 'registrations');

          if (registrations.length > 0) {
            totalRegistrations = totalRegistrations.concat(registrations);
            
            // Check for duplicates
            const duplicateCheck = await this.checkDuplicatesInImportDataHC(registrations);
            
            allDuplicates.push(...duplicateCheck.duplicates);
            allValidData.push(...duplicateCheck.validData);
          } else {
            console.warn(`No valid data found in HC file: ${file.name}`);
          }
        } catch (error) {
          console.error(`Error processing HC file ${file.name}:`, error);
          this.snackBar.open(
            `Lỗi khi xử lý file HC ${file.name}: ${error}`, 
            'Đóng', 
            {
              duration: 5000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            }
          );
        }
      }

      // Process all collected data
      if (totalRegistrations.length > 0) {
        if (allDuplicates.length > 0) {
          // Show duplicate notification dialog
          const dialogRef = this.dialog.open(DuplicateDataDialogComponent, {
            width: '600px',
            data: {
              duplicates: allDuplicates,
              validData: allValidData,
              duplicateDetails: allDuplicates.map(d => `${d.hoTen} - ${d.tramXe} (${d.ngayDangKy})`),
              totalRecords: totalRegistrations.length,
              allDuplicates: allValidData.length === 0 && allDuplicates.length > 0
            }
          });

          // Auto-save valid data while showing dialog
          if (allValidData.length > 0) {
            const result = await this.saveRegistrationsToFirebaseHC(allValidData);
            totalSaved = result.savedCount;
            totalFailed = result.failedData.length;
            allFailedData.push(...result.failedData);
            
            if (result.savedCount > 0) {
              // Refresh data from Firebase
              await this.loadDataFromFirebase();
            }
            
            // Show detailed import results if there are any failures
            if (result.failedData.length > 0) {
              const errorDialogRef = this.dialog.open(ImportErrorDialogComponent, {
                width: '1000px',
                data: {
                  totalProcessed: allValidData.length,
                  savedCount: result.savedCount,
                  failedData: result.failedData
                }
              });
            }
          }

          dialogRef.afterClosed().subscribe(async () => {
            // Show summary
            this.snackBar.open(
              `Hoàn thành import HC ${totalFiles} file(s): ${totalSaved} đã lưu, ${allDuplicates.length} trùng lặp, ${totalFailed} lỗi`, 
              'Đóng', 
              {
                duration: 8000,
                horizontalPosition: 'right',
                verticalPosition: 'top'
              }
            );
          });
        } else {
          // No duplicates, save all data (use totalRegistrations which equals allValidData when no duplicates)
          const dataToSave = allValidData.length > 0 ? allValidData : totalRegistrations;
          const result = await this.saveRegistrationsToFirebaseHC(dataToSave);
          totalSaved = result.savedCount;
          totalFailed = result.failedData.length;
          allFailedData.push(...result.failedData);
          
          if (result.savedCount > 0) {
            // Refresh data from Firebase
            await this.loadDataFromFirebase();
            
            // Show success message
            this.snackBar.open(
              `Đã import HC ${totalFiles} file(s) và lưu ${result.savedCount}/${totalRegistrations.length} đăng ký vào hệ thống!`, 
              '', 
              {
                duration: 8000,
                horizontalPosition: 'right',
                verticalPosition: 'top'
              }
            );
          } else {
            this.snackBar.open('Không có dữ liệu hợp lệ để lưu vào Firebase HC!', 'Đóng', {
              duration: 3000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            });
          }
          
          // Show detailed import results if there are any failures
          if (result.failedData.length > 0) {
            const errorDialogRef = this.dialog.open(ImportErrorDialogComponent, {
              width: '1000px',
              data: {
                totalProcessed: totalRegistrations.length,
                savedCount: result.savedCount,
                failedData: result.failedData
              }
            });
          }
        }
      } else {
        this.snackBar.open(
          `Không tìm thấy dữ liệu hợp lệ trong ${totalFiles} file(s) HC đã chọn!`, 
          'Đóng', 
          {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          }
        );
      }

    } catch (error) {
      console.error('Error processing multiple HC files:', error);
      this.snackBar.open(`Lỗi khi xử lý nhiều file HC: ${error}`, 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } finally {
      // Reset loading state
      this.isImportingExcel = false;
    }
  }

  // CRUD operations
  editRegistration(registration: Registration): void {
    const dialogRef = this.dialog.open(RegistrationFormDialogComponent, {
      width: '1000px',
      data: {
        registration: registration,
        departments: this.getDepartments(),
        workShifts: this.getWorkShifts(),
        routes: this.getRoutes()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.dataSource.data.findIndex(r => r.id === registration.id);
        if (index !== -1) {
          this.dataSource.data[index] = { 
            ...registration, 
            ...result,
            phongBan: '', // Remove phongBan field
            maTuyenXe: result.maTuyenXe // Keep as is since it's now the route code
          };
          this.dataSource.data = [...this.dataSource.data];
          this.snackBar.open('Đăng ký đã được cập nhật thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
        }
      }
    });
  }

  deleteRegistration(registration: Registration): void {
    if (confirm(`Bạn có chắc chắn muốn xóa đăng ký của ${registration.hoTen}?`)) {
      this.deleteRegistrationsFromFirebase([registration]);
    }
  }

  deleteSelectedRegistrations(): void {
    if (this.selectedRegistrations.size === 0) {
      this.snackBar.open('Vui lòng chọn ít nhất một đăng ký để xóa!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    const selectedCount = this.selectedRegistrations.size;
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedCount} đăng ký đã chọn?`)) {
      const selectedRegistrations = this.dataSource.data.filter(r => this.selectedRegistrations.has(r.id));
      this.deleteRegistrationsFromFirebase(selectedRegistrations);
    }
  }

  private async deleteRegistrationsFromFirebase(registrations: Registration[]): Promise<void> {
    try {
      // Show loading message
      const loadingSnackBar = this.snackBar.open('Đang xóa dữ liệu từ Firebase...', 'Đóng', {
        duration: 0,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });

      let deletedCount = 0;
      const errors: string[] = [];

      for (const registration of registrations) {
        try {
          // Use the document ID directly from registration.id
          if (registration.id && !registration.id.startsWith('temp_')) {
            if (this.useHC) {
              await this.vehicleDataService.huyDangKyPhanXeHC(registration.id);
            } else {
              await this.vehicleDataService.huyDangKyPhanXe(registration.id);
            }
            deletedCount++;
          } else {
            errors.push(`Không có ID hợp lệ cho đăng ký ${registration.maNhanVien}`);
          }
        } catch (error) {
          console.error(`Error deleting registration ${registration.maNhanVien}:`, error);
          errors.push(`Lỗi khi xóa đăng ký ${registration.maNhanVien}: ${error}`);
        }
      }

      // Dismiss loading message
      loadingSnackBar.dismiss();

      if (deletedCount > 0) {
        // Refresh data from Firebase
        await this.loadDataFromFirebase();
        
        // Clear selections
        this.selectedRegistrations.clear();
        
        // Show success message
        let message = `Đã xóa thành công ${deletedCount} đăng ký!`;
        if (errors.length > 0) {
          message += ` ${errors.length} đăng ký gặp lỗi.`;
        }
        
        this.snackBar.open(message, 'Đóng', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      } else {
        this.snackBar.open('Không thể xóa đăng ký nào. Vui lòng thử lại!', 'Đóng', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    } catch (error) {
      console.error('Error deleting registrations:', error);
      this.snackBar.open('Có lỗi xảy ra khi xóa dữ liệu!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  private async findFirebaseIdForRegistration(registration: Registration): Promise<string | null> {
    try {
      // Get all registrations from Firebase
      const allRegistrations = await this.vehicleDataService.layDanhSachDangKyPhanXe();
      
      // Find matching registration by employee ID and date
      const matchingRegistration = allRegistrations.find(r => 
        r.MaNhanVien === registration.maNhanVien && 
        r.HoTen === registration.hoTen &&
        r.DienThoai === registration.dienThoai &&
        r.NgayDangKy.toISOString().split('T')[0] === registration.ngayDangKy
      );
      
      return matchingRegistration?.ID || null;
    } catch (error) {
      console.error('Error finding Firebase ID:', error);
      return null;
    }
  }

  // Selection methods
  isAllSelected(): boolean {
    return this.dataSource.data.length > 0 && this.selectedRegistrations.size === this.dataSource.data.length;
  }

  isIndeterminate(): boolean {
    return this.selectedRegistrations.size > 0 && this.selectedRegistrations.size < this.dataSource.data.length;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selectedRegistrations.clear();
    } else {
      this.dataSource.data.forEach(registration => this.selectedRegistrations.add(registration.id));
    }
  }

  toggleSelection(registration: Registration): void {
    if (this.selectedRegistrations.has(registration.id)) {
      this.selectedRegistrations.delete(registration.id);
    } else {
      this.selectedRegistrations.add(registration.id);
    }
  }

  isSelected(registration: Registration): boolean {
    return this.selectedRegistrations.has(registration.id);
  }

  getSelectedCount(): number {
    return this.selectedRegistrations.size;
  }

  checkboxLabel(): string {
    return 'Chọn tất cả';
  }

  /**
   * Format time string to display properly in Excel format
   */
  formatTime(timeString: string): string {
    if (!timeString) return '';
    
    // Handle different time formats and convert to Excel format (15h45)
    if (timeString.includes('h')) {
      // Already in Excel format
      return timeString;
    } else if (timeString.includes(':')) {
      // Convert from "15:45" format to "15h45"
      return timeString.replace(':', 'h');
    } else if (timeString.length === 4 && !isNaN(Number(timeString))) {
      // Convert from "1545" format to "15h45"
      return timeString.substring(0, 2) + 'h' + timeString.substring(2);
    }
    
    return timeString;
  }


  // ==================== FIREBASE INTEGRATION ====================
  
  /**
   * Convert Registration array to DangKyPhanXe array and save to Firebase
   */
  private async saveRegistrationsToFirebase(registrations: Registration[], allowOverwrite: boolean = false): Promise<{savedCount: number, failedData: Array<{registration: Registration, reason: string}>}> {
    let savedCount = 0;
    const failedData: Array<{registration: Registration, reason: string}> = [];
    
    for (const reg of registrations) {
      try {
        // Convert Registration to DangKyPhanXe format
        const dangKyPhanXe: Omit<DangKyPhanXe, 'ID' | 'createdAt' | 'updatedAt'> = {
          MaNhanVien: reg.maNhanVien,
          HoTen: reg.hoTen,
          DienThoai: reg.dienThoai,
          PhongBan: '', // Remove phongBan field
          NgayDangKy: this.createVietnamDate(reg.ngayDangKy),
          ThoiGianBatDau: reg.thoiGianBatDau,
          ThoiGianKetThuc: reg.thoiGianKetThuc,
          LoaiCa: this.mapLoaiCa(reg.loaiCa),
          NoiDungCongViec: reg.noiDungCongViec || '',
          DangKyCom: reg.dangKyCom,
          TramXe: reg.tramXe || '',
          MaTuyenXe: '' // Bỏ MaTuyenXe khi import từ Excel - để trống
        };

        // Debug: Log the conversion
        console.log(`Converting registration for ${reg.maNhanVien}:`);
        console.log(`  Original: ThoiGianBatDau="${reg.thoiGianBatDau}", ThoiGianKetThuc="${reg.thoiGianKetThuc}"`);
        console.log(`  Converted: ThoiGianBatDau="${dangKyPhanXe.ThoiGianBatDau}", ThoiGianKetThuc="${dangKyPhanXe.ThoiGianKetThuc}"`);

        // Validate data before saving
        const errors = this.vehicleDataService.validateDangKyPhanXe(dangKyPhanXe);
        if (errors.length > 0) {
          console.warn(`Validation errors for ${reg.maNhanVien}:`, errors);
          failedData.push({
            registration: reg,
            reason: `Lỗi validation: ${errors.join(', ')}`
          });
          continue;
        }

        // Check for duplicate name and station
        const isDuplicate = await this.checkDuplicateNameAndStation(reg.hoTen, reg.tramXe, reg.ngayDangKy);
        
        if (isDuplicate && !allowOverwrite) {
          console.warn(`Duplicate found: ${reg.hoTen} at ${reg.tramXe} for ${reg.ngayDangKy}`);
          failedData.push({
            registration: reg,
            reason: `Trùng lặp: đã đăng ký tại trạm ${reg.tramXe} cho ngày ${reg.ngayDangKy}`
          });
          continue;
        }

        if (isDuplicate && allowOverwrite) {
          // Find and delete existing registration before saving new one
          const existingId = await this.findFirebaseIdForRegistration(reg);
          if (existingId) {
            try {
              await this.vehicleDataService.huyDangKyPhanXe(existingId);
              console.log(`Deleted existing registration for ${reg.maNhanVien} to allow overwrite`);
            } catch (deleteError) {
              console.error(`Error deleting existing registration for ${reg.maNhanVien}:`, deleteError);
              failedData.push({
                registration: reg,
                reason: `Lỗi khi xóa đăng ký cũ: ${deleteError}`
              });
              continue;
            }
          }
        }

        // Save to Firebase
        await this.vehicleDataService.dangKyPhanXe(dangKyPhanXe);
        savedCount++;
        
      } catch (error) {
        console.error(`Error saving registration for ${reg.maNhanVien}:`, error);
        failedData.push({
          registration: reg,
          reason: `Lỗi khi lưu vào Firebase: ${error}`
        });
        continue;
      }
    }
    
    return { savedCount, failedData };
  }

  /**
   * Load data from Firebase and update the table
   * For regular users: only today's data
   * For super_admin: can load data by date range
   */
  async loadDataFromFirebase(): Promise<void> {
    try {
      const dangKyList = this.useHC
        ? await this.vehicleDataService.layDanhSachDangKyPhanXeHC()
        : await this.vehicleDataService.layDanhSachDangKyPhanXe();
      
      console.log('Raw data from Firebase:', dangKyList);
      
      if (!dangKyList || dangKyList.length === 0) {
        console.log('No data found in Firebase, using empty array');
        this.dataSource.data = [];
        return;
      }
      
      let filteredRegistrations = dangKyList;
      
      // Filter by today's date on initial load if dates are set
      if (this.startDate && this.endDate) {
        const todayStr = this.getVietnamDateString(this.startDate);
        filteredRegistrations = dangKyList.filter(dangKy => {
          if (!dangKy.NgayDangKy) return false;
          const registrationDate = this.getVietnamDateStringFromTimestamp(dangKy.NgayDangKy);
          return registrationDate === todayStr;
        });
        console.log(`Filtered to ${filteredRegistrations.length} registrations for today (${todayStr}) out of ${dangKyList.length} total`);
      } else {
        console.log(`Loading all ${dangKyList.length} registrations. No date filter applied.`);
      }
      
      // Convert DangKyPhanXe to Registration format for display
      const registrations: Registration[] = filteredRegistrations.map((dangKy, index) => {
        console.log(`Processing item ${index}:`, {
          ID: dangKy.ID,
          MaNhanVien: dangKy.MaNhanVien,
          HoTen: dangKy.HoTen,
          DienThoai: dangKy.DienThoai
        });
        
        return {
          id: dangKy.ID || `temp_${index}`, // Use Firebase document ID
          maNhanVien: dangKy.MaNhanVien || '',
          hoTen: dangKy.HoTen || '',
          dienThoai: dangKy.DienThoai || '',
          phongBan: '', // Remove phongBan field
          ngayDangKy: this.getVietnamDateStringFromTimestamp(dangKy.NgayDangKy),
          loaiCa: dangKy.LoaiCa || '',
          thoiGianBatDau: dangKy.ThoiGianBatDau || '',
          thoiGianKetThuc: dangKy.ThoiGianKetThuc || '',
          maTuyenXe: dangKy.MaTuyenXe || '',
          tramXe: dangKy.TramXe || '',
          noiDungCongViec: dangKy.NoiDungCongViec || '',
          dangKyCom: dangKy.DangKyCom || false
        };
      });

      console.log('Converted registrations for today:', registrations);
      
      // Sort registrations by station order within each route
      console.log('🔧 Applying station sorting logic...');
      const sortedRegistrations = await this.sortRegistrationsByStationOrder(registrations);
      console.log('✅ Station sorting completed. Original count:', registrations.length, 'Sorted count:', sortedRegistrations.length);
      
      this.dataSource.data = sortedRegistrations;
      console.log(`Loaded ${sortedRegistrations.length} registrations for today from Firebase`);
    } catch (error) {
      console.error('Error loading data from Firebase:', error);
      // Fallback to empty array instead of showing error
      this.dataSource.data = [];
      this.snackBar.open('Không có dữ liệu trong Firebase. Bạn có thể import từ Excel để bắt đầu.', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Map phong ban string to enum value
   */
  private mapPhongBan(phongBan: string): string {
    const mapping: { [key: string]: string } = {
      'Phòng Kỹ Thuật': PhongBan.IT,
      'IT': PhongBan.IT,
      'Nhân sự': PhongBan.HR,
      'HR': PhongBan.HR,
      'Tài chính': PhongBan.FINANCE,
      'Marketing': PhongBan.MARKETING,
      'Kinh doanh': PhongBan.SALES,
      'Vận hành': PhongBan.OPERATIONS
    };
    
    return mapping[phongBan] || phongBan;
  }

  /**
   * Map loai ca string to enum value
   */
  private mapLoaiCa(loaiCa: string): string {
    const mapping: { [key: string]: string } = {
      'HC': LoaiCa.CA_SANG,
      'Ca sáng': LoaiCa.CA_SANG,
      'Ca chiều': LoaiCa.CA_CHIEU,
      'Ca tối': LoaiCa.CA_TOI,
      'Ca đêm': LoaiCa.CA_DEM
    };
    
    return mapping[loaiCa] || loaiCa;
  }

  /**
   * Check for duplicate name and station combination
   * Only checks for today's date
   */
  private async checkDuplicateNameAndStation(hoTen: string, tramXe: string, ngayDangKy: string): Promise<boolean> {
    try {
      // Get today's date in Vietnam timezone
      const today = new Date();
      const todayString = this.getVietnamDateString(today);
      
      // CHỈ CHECK DUPLICATE CHO NGÀY HÔM NAY
      // Nếu ngày đăng ký không phải hôm nay, coi như không trùng lặp
      if (ngayDangKy !== todayString) {
        return false;
      }
      
      const allRegistrations = await this.vehicleDataService.layDanhSachDangKyPhanXe();
      
      return allRegistrations.some(reg => 
        reg.HoTen?.toLowerCase().trim() === hoTen?.toLowerCase().trim() && 
        reg.TramXe?.toLowerCase().trim() === tramXe?.toLowerCase().trim() && 
        this.getVietnamDateStringFromTimestamp(reg.NgayDangKy) === ngayDangKy
      );
    } catch (error) {
      console.error('Error checking duplicate name and station:', error);
      return false;
    }
  }

  /**
   * Check for duplicates when adding new registration - returns duplicate data
   */
  private async checkDuplicateNameAndStationForAdd(hoTen: string, tramXe: string, ngayDangKy: string): Promise<Registration[]> {
    try {
      // Get today's date in Vietnam timezone
      const today = new Date();
      const todayString = this.getVietnamDateString(today);
      
      // CHỈ CHECK DUPLICATE CHO NGÀY HÔM NAY
      // Nếu ngày đăng ký không phải hôm nay, coi như không trùng lặp
      if (ngayDangKy !== todayString) {
        return [];
      }
      
      const allRegistrations = await this.vehicleDataService.layDanhSachDangKyPhanXe();
      
      const duplicates = allRegistrations.filter(reg => 
        reg.HoTen?.toLowerCase().trim() === hoTen?.toLowerCase().trim() && 
        reg.TramXe?.toLowerCase().trim() === tramXe?.toLowerCase().trim() && 
        this.getVietnamDateStringFromTimestamp(reg.NgayDangKy) === ngayDangKy
      );

      // Convert to Registration format for display
      return duplicates.map(reg => ({
        id: reg.ID || '',
        maNhanVien: reg.MaNhanVien || '',
        hoTen: reg.HoTen || '',
        dienThoai: reg.DienThoai || '',
        phongBan: reg.PhongBan || '',
        ngayDangKy: this.getVietnamDateStringFromTimestamp(reg.NgayDangKy),
        loaiCa: reg.LoaiCa || '',
        thoiGianBatDau: reg.ThoiGianBatDau || '',
        thoiGianKetThuc: reg.ThoiGianKetThuc || '',
        maTuyenXe: reg.MaTuyenXe || '',
        tramXe: reg.TramXe || '',
        noiDungCongViec: reg.NoiDungCongViec || '',
        dangKyCom: reg.DangKyCom || false
      }));
    } catch (error) {
      console.error('Error checking duplicate name and station for add:', error);
      return [];
    }
  }

  /**
   * Show duplicate dialog for add registration
   */
  private showDuplicateDialogForAdd(newRegistration: any, duplicates: Registration[]): void {
    const dialogRef = this.dialog.open(DuplicateDataDialogComponent, {
      width: '600px',
      data: {
        duplicates: duplicates,
        validData: [],
        duplicateDetails: [],
        totalRecords: 1,
        allDuplicates: duplicates.length > 0,
        mode: 'add',
        newRegistration: newRegistration
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      // Dialog closed, no action needed for add mode
    });
  }

  /**
   * Check for duplicates in Excel import data
   * Only checks for duplicates on the current date
   */
  private async checkDuplicatesInImportData(registrations: Registration[]): Promise<{
    duplicates: Registration[];
    validData: Registration[];
    duplicateDetails: string[];
    allDuplicates: boolean;
  }> {
    const duplicates: Registration[] = [];
    const validData: Registration[] = [];
    const duplicateDetails: string[] = [];
    
    // Get today's date in YYYY-MM-DD format (Vietnam timezone)
    const today = new Date();
    const todayString = this.getVietnamDateString(today);
    
    // Get existing registrations from Firebase for today only
    const allRegistrations = await this.vehicleDataService.layDanhSachDangKyPhanXe();
    const existingRegistrations = allRegistrations.filter(reg => 
      this.getVietnamDateStringFromTimestamp(reg.NgayDangKy) === todayString
    );
    
    console.log(`Checking duplicates for today: ${todayString}`);
    console.log(`Found ${existingRegistrations.length} existing registrations for today`);
    console.log(`Total import records: ${registrations.length}`);
    console.log(`Records for today: ${registrations.filter(reg => reg.ngayDangKy === todayString).length}`);
    
    for (const reg of registrations) {
      let isDuplicate = false;
      const duplicateReasons: string[] = [];
      
      // CHỈ CHECK DUPLICATE CHO NGÀY HÔM NAY
      // Dữ liệu có ngày đăng ký khác hôm nay sẽ được coi là hợp lệ và không cần check duplicate
      if (reg.ngayDangKy === todayString) {
        // Check against existing Firebase data for today only
        const existingDuplicate = existingRegistrations.find(existing => 
          existing.HoTen?.toLowerCase().trim() === reg.hoTen?.toLowerCase().trim() && 
          existing.TramXe?.toLowerCase().trim() === reg.tramXe?.toLowerCase().trim()
        );
        
        if (existingDuplicate) {
          isDuplicate = true;
          duplicateReasons.push(`Đã tồn tại trong hệ thống (Mã: ${existingDuplicate.MaNhanVien})`);
        }
        
        // Check against other records in the same import batch for today only
        const batchDuplicate = validData.find(valid => 
          valid.hoTen?.toLowerCase().trim() === reg.hoTen?.toLowerCase().trim() && 
          valid.tramXe?.toLowerCase().trim() === reg.tramXe?.toLowerCase().trim() && 
          valid.ngayDangKy === reg.ngayDangKy
        );
        
        if (batchDuplicate) {
          isDuplicate = true;
          duplicateReasons.push(`Trùng lặp trong file import (Dòng: ${registrations.indexOf(reg) + 1})`);
        }
      }
      // Nếu ngày đăng ký không phải hôm nay, reg sẽ được thêm vào validData mà không cần check duplicate
      
      if (isDuplicate) {
        duplicates.push(reg);
        duplicateDetails.push(`${reg.hoTen} - ${reg.tramXe} (${reg.ngayDangKy}): ${duplicateReasons.join(', ')}`);
      } else {
        validData.push(reg);
      }
    }
    
    // Check if all data for today are duplicates
    const todayRegistrations = registrations.filter(reg => reg.ngayDangKy === todayString);
    const allDuplicates = todayRegistrations.length > 0 && duplicates.length === todayRegistrations.length;
    
    return {
      duplicates,
      validData,
      duplicateDetails,
      allDuplicates
    };
  }

  /**
   * Create a Date object in Vietnam timezone to avoid timezone conversion issues
   */
  private createVietnamDate(dateString: string): Date {
    // Parse the date string (YYYY-MM-DD format)
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Create date at noon Vietnam time to avoid timezone issues
    const vietnamDate = new Date();
    vietnamDate.setFullYear(year, month - 1, day);
    vietnamDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone edge cases
    
    // Convert to Vietnam timezone
    const vietnamTime = new Date(vietnamDate.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
    
    return vietnamTime;
  }

  /**
   * Export registrations to PDF with vehicle assignment dialog
   */
  async exportToPDF(): Promise<void> {
    try {
      if (this.dataSource.data.length === 0) {
        this.snackBar.open('Không có dữ liệu để xuất PDF!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        return;
      }

      // Set loading state
      this.isExportingPDF = true;

      // Open vehicle assignment dialog first for selected day
      await this.openRouteVehicleAssignmentDialog();

    } catch (error) {
      console.error('Error exporting PDF:', error);
      this.snackBar.open('Có lỗi xảy ra khi tạo file PDF!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } finally {
      // Reset loading state
      this.isExportingPDF = false;
    }
  }

  /**
   * Export registrations to Excel with vehicle assignment dialog
   */
  async exportToExcel(): Promise<void> {
    try {
      if (this.dataSource.data.length === 0) {
        this.snackBar.open('Không có dữ liệu để xuất Excel!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        return;
      }

      // Set loading state
      this.isExportingExcel = true;

      // Open vehicle assignment dialog first for selected day
      await this.openRouteVehicleAssignmentDialogForExcel();

    } catch (error) {
      console.error('Error exporting Excel:', error);
      this.snackBar.open('Có lỗi xảy ra khi tạo file Excel!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } finally {
      // Reset loading state
      this.isExportingExcel = false;
    }
  }

  /**
   * Open route vehicle assignment dialog for Excel export
   */
  async openRouteVehicleAssignmentDialogForExcel(): Promise<void> {
    try {
      // Get real data from selected day's registrations
      const todayRegistrations = await this.getSelectedDateRegistrations();
      if (todayRegistrations.length === 0) {
        const base = this.displayDate || this.startDate || new Date();
        const dateStr = this.getVietnamDateString(base);
        this.snackBar.open(`Không có dữ liệu đăng ký cho ngày ${dateStr}!`, 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        return;
      }

      // Load danh sách tuyến từ cache
      const routeDetails = this.dataCacheService.getRouteDetails();
      console.log('Dialog Excel - Route details from cache:', routeDetails.length);
      console.log('Dialog Excel - Available routes:', [...new Set(routeDetails.map(detail => detail.maTuyenXe))]);
      
      // Group registrations by route using the same logic as PDF generation
      const routeGroups = await this.groupRegistrationsByRouteForDialog(todayRegistrations);
      console.log('Dialog Excel - Route groups after grouping:', routeGroups.map(rg => `${rg.routeName} (${rg.registrations?.length || 0} employees)`));
      
      // Tạo danh sách tuyến từ routeGroups (đã được xử lý logic phân chia)
      const realRoutes = routeGroups
        .map(routeGroup => ({
          routeId: routeGroup.routeName,
          routeName: routeGroup.routeName, // Sử dụng routeName từ routeGroup
          routeCode: routeGroup.routeName,
          employeeCount: routeGroup.registrations?.length || 0
        }))
        .filter(route => route.employeeCount > 0) // Bỏ qua tuyến không có nhân viên
        .sort((a, b) => {
          // Sắp xếp: HCM01, HCM02 trước, sau đó các tuyến BH
          if (a.routeCode === 'HCM01') return -1;
          if (b.routeCode === 'HCM01') return 1;
          if (a.routeCode === 'HCM02') return -1;
          if (b.routeCode === 'HCM02') return 1;
          return a.routeCode.localeCompare(b.routeCode);
        });
      
      // Load real vehicles from Firebase
      const vehicles = await this.firestoreService.getAllXeDuaDon();

      if (vehicles.length === 0) {
        this.snackBar.open('Không có dữ liệu xe đưa đón!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        return;
      }

      console.log('Loaded vehicles from Firebase:', vehicles);
      console.log('Real route groups:', realRoutes);

      // Không cần mockDrivers nữa vì thông tin tài xế sẽ lấy trực tiếp từ xe
      const dialogRef = this.dialog.open(RouteVehicleAssignmentDialogComponent, {
        width: '1200px',
        maxWidth: '95vw',
        data: {
          routes: realRoutes,
          vehicles: vehicles,
          drivers: [] // Không cần drivers nữa
        }
      });

      dialogRef.afterClosed().subscribe(async result => {
        if (result && result.routeAssignments) {
          // Export to Excel after vehicle assignment
          await this.exportOvertimeReportExcelWithVehicleAssignment(result);
        }
      });

    } catch (error) {
      console.error('Error opening route vehicle assignment dialog for Excel:', error);
      this.snackBar.open('Có lỗi xảy ra khi mở dialog phân công xe!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Open route vehicle assignment dialog for PDF export
   */
  async openRouteVehicleAssignmentDialog(): Promise<void> {
    try {
      // Get real data from today's registrations
      const todayRegistrations = await this.getSelectedDateRegistrations();
      
      if (todayRegistrations.length === 0) {
        this.snackBar.open('Không có dữ liệu đăng ký cho ngày hôm nay!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        return;
      }

      // Load danh sách tuyến từ cache
      const routeDetails = this.dataCacheService.getRouteDetails();
      console.log('Dialog - Route details from cache:', routeDetails.length);
      console.log('Dialog - Available routes:', [...new Set(routeDetails.map(detail => detail.maTuyenXe))]);

      // Group registrations by route using the same logic as PDF generation
      const routeGroups = await this.groupRegistrationsByRouteForDialog(todayRegistrations);
      console.log('Dialog - Route groups after grouping:', routeGroups.map(rg => `${rg.routeName} (${rg.registrations?.length || 0} employees)`));
      
      // Tạo danh sách tuyến từ routeGroups (đã được xử lý logic phân chia)
      const realRoutes = routeGroups
        .map(routeGroup => ({
          routeId: routeGroup.routeName,
          routeName: routeGroup.routeName, // Sử dụng routeName từ routeGroup
          routeCode: routeGroup.routeName,
          employeeCount: routeGroup.registrations?.length || 0
        }))
        .filter(route => route.employeeCount > 0) // Bỏ qua tuyến không có nhân viên
        .sort((a, b) => {
          // Sắp xếp: HCM01, HCM02 trước, sau đó các tuyến BH
          if (a.routeCode === 'HCM01') return -1;
          if (b.routeCode === 'HCM01') return 1;
          if (a.routeCode === 'HCM02') return -1;
          if (b.routeCode === 'HCM02') return 1;
          return a.routeCode.localeCompare(b.routeCode);
        });
      
      // Load real vehicles from Firebase
      const vehicles = await this.firestoreService.getAllXeDuaDon();

      if (vehicles.length === 0) {
        this.snackBar.open('Không có dữ liệu xe để phân công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        return;
      }

      console.log('Loaded vehicles from Firebase:', vehicles);
      console.log('Real route groups:', realRoutes);

      // Không cần mockDrivers nữa vì thông tin tài xế sẽ lấy trực tiếp từ xe
      const dialogRef = this.dialog.open(RouteVehicleAssignmentDialogComponent, {
        width: '1200px',
        maxWidth: '95vw',
        height: '90vh',
        data: {
          routes: realRoutes,
          vehicles: vehicles,
          drivers: [] // Không cần drivers nữa
        }
      });

      dialogRef.afterClosed().subscribe(async result => {
        if (result && result.routeAssignments) {
          // Export to PDF after vehicle assignment
          await this.exportOvertimeReportPDFWithVehicleAssignment(result);
        }
      });

    } catch (error) {
      console.error('Error opening route vehicle assignment dialog:', error);
      this.snackBar.open('Có lỗi xảy ra khi mở dialog phân công xe!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Sort registrations by station order within each route
   */
  private async sortRegistrationsByStationOrder(registrations: Registration[]): Promise<Registration[]> {
    try {
      console.log('🔍 Starting station sorting for', registrations.length, 'registrations');
      
      // Get route details to determine station order
      const routeDetails = await this.routeDetailService.getRouteDetails().toPromise();
      
      if (!routeDetails || routeDetails.length === 0) {
        console.warn('⚠️ No route details found, returning registrations without sorting');
        return registrations;
      }

      console.log('📋 Found', routeDetails.length, 'route details');

      // Create a map of station names to their order for each route
      const stationOrderMap = new Map<string, Map<string, number>>();
      
      routeDetails.forEach((detail: any) => {
        if (!stationOrderMap.has(detail.maTuyenXe)) {
          stationOrderMap.set(detail.maTuyenXe, new Map());
        }
        // Store both exact match and normalized match for better matching
        stationOrderMap.get(detail.maTuyenXe)!.set(detail.tenDiemDon, detail.thuTu);
        stationOrderMap.get(detail.maTuyenXe)!.set(this.normalizeStationName(detail.tenDiemDon), detail.thuTu);
      });

      // Log HCM02 station orders
      const hcm02Map = stationOrderMap.get('HCM02');
      if (hcm02Map) {
        console.log('🗺️ HCM02 station orders:');
        for (const [station, order] of hcm02Map) {
          console.log(`   "${station}" -> order: ${order}`);
        }
      }

      // Sort registrations by route first, then by station order within each route
      const sorted = registrations.sort((a, b) => {
        // First sort by route
        const routeComparison = (a.maTuyenXe || '').localeCompare(b.maTuyenXe || '');
        if (routeComparison !== 0) {
          return routeComparison;
        }

        // Then sort by station order within the same route
        const routeCode = a.maTuyenXe;
        const routeOrderMap = stationOrderMap.get(routeCode);
        
        if (!routeOrderMap) {
          return 0; // No sorting if route not found
        }

        const stationA = a.tramXe || '';
        const stationB = b.tramXe || '';
        
        let orderA = routeOrderMap.get(stationA) || routeOrderMap.get(this.normalizeStationName(stationA)) || 999;
        let orderB = routeOrderMap.get(stationB) || routeOrderMap.get(this.normalizeStationName(stationB)) || 999;


        return orderA - orderB;
      });

      console.log('✅ Sorting completed. Final order:');
      sorted.forEach((reg, index) => {
        console.log(`   ${index + 1}. ${reg.hoTen} - ${reg.tramXe} (${reg.maTuyenXe})`);
      });

      return sorted;
    } catch (error) {
      console.error('❌ Error sorting registrations by station order:', error);
      return registrations; // Return original order if sorting fails
    }
  }

  /**
   * Normalize station name for comparison
   */
  private normalizeStationName(stationName: string): string {
    if (!stationName) return '';
    return stationName.toLowerCase()
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd');
  }

  /**
   * Check if station is Bà Chiểu
   */
  private isBaChieuStation(station: string): boolean {
    if (!station) return false;
    const stationLower = station.toLowerCase();
    const baChieuVariations = [
      'bà chiểu', 'ba chieu'
    ];
    return baChieuVariations.some(variation =>
      stationLower.includes(variation) || variation.includes(stationLower)
    );
  }

  /**
   * Get today's registrations from Firebase
   */
  private async getSelectedDateRegistrations(): Promise<Registration[]> {
    try {
      const base = this.displayDate || this.startDate || new Date();
      const startOfDay = new Date(base.getFullYear(), base.getMonth(), base.getDate());
      const endOfDay = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59);
      const registrations = this.useHC
        ? await this.firestoreService.getDangKyPhanXeHCByDateRange(startOfDay, endOfDay)
        : await this.firestoreService.getDangKyPhanXeByDateRange(startOfDay, endOfDay);

      // Map DangKyPhanXe -> Registration
      return registrations.map(reg => ({
        id: reg.ID || '0',
        maNhanVien: reg.MaNhanVien,
        hoTen: reg.HoTen,
        dienThoai: reg.DienThoai,
        phongBan: reg.PhongBan,
        ngayDangKy: this.getVietnamDateStringFromTimestamp(reg.NgayDangKy),
        loaiCa: reg.LoaiCa,
        thoiGianBatDau: reg.ThoiGianBatDau,
        thoiGianKetThuc: reg.ThoiGianKetThuc,
        maTuyenXe: reg.MaTuyenXe,
        tramXe: reg.TramXe,
        noiDungCongViec: reg.NoiDungCongViec,
        dangKyCom: reg.DangKyCom
      }));
    } catch (error) {
      console.error('Error getting today registrations:', error);
      return [];
    }
  }

  /**
   * Group registrations by route using StationRouteMappingService to map by tramXe
   */
  private async groupRegistrationsByRouteForDialog(registrations: Registration[]): Promise<any[]> {
    console.log('Dialog - Starting groupRegistrationsByRouteForDialog with', registrations.length, 'registrations');
    const routeMap = new Map<string, any>();

    for (const registration of registrations) {
      let finalRouteName = 'Chưa phân tuyến';
      
      // Nếu đã có maTuyenXe, sử dụng nó
      if (registration.maTuyenXe && registration.maTuyenXe.trim() !== '') {
        finalRouteName = registration.maTuyenXe;
        console.log(`Dialog - Using existing maTuyenXe "${finalRouteName}" for ${registration.hoTen}`);
      } else if (registration.tramXe && registration.tramXe.trim() !== '') {
        // Nếu chưa có maTuyenXe, map từ tramXe sử dụng cache
        const mappedRoute = this.dataCacheService.getRouteForStation(registration.tramXe);
        if (mappedRoute) {
          finalRouteName = mappedRoute;
          console.log(`Dialog - Mapped employee ${registration.hoTen} from station "${registration.tramXe}" to route "${mappedRoute}"`);
        } else {
          console.warn(`Dialog - No route mapping found for station "${registration.tramXe}"`);
        }
      }
      
      // Apply HCM grouping priority logic (same as PDF generation)
      const originalRouteName = finalRouteName;
      finalRouteName = this.applyHCMGroupingPriority(finalRouteName, registration.tramXe);
      if (originalRouteName !== finalRouteName) {
        console.log(`Dialog - HCM grouping priority changed route from "${originalRouteName}" to "${finalRouteName}" for ${registration.hoTen}`);
      }
      
      if (!routeMap.has(finalRouteName)) {
        routeMap.set(finalRouteName, {
          routeName: finalRouteName,
          registrations: []
        });
      }

      routeMap.get(finalRouteName)!.registrations.push(registration);
    }

    // Convert to array and filter out routes with no employees and self-transport routes
    const routes = Array.from(routeMap.values()).filter(route => 
      route.registrations && 
      route.registrations.length > 0 &&
      route.routeName !== 'TỰ TÚC' // Exclude self-transport routes
    );

    console.log('Dialog - Routes before sorting:', routes.map(r => `${r.routeName} (${r.registrations?.length || 0} employees)`));

    // Sort routes according to the specified order: HCM01, HCM02, BH01, BH02, BH03
    const routeOrder = ['HCM01', 'HCM02', 'BH01', 'BH02', 'BH03'];
    
    routes.sort((a, b) => {
      const indexA = routeOrder.indexOf(a.routeName);
      const indexB = routeOrder.indexOf(b.routeName);
      
      // If both routes are in the predefined order, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one route is in the predefined order, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither route is in the predefined order, sort alphabetically
      return a.routeName.localeCompare(b.routeName);
    });

    console.log('Dialog - Routes after sorting:', routes.map(r => `${r.routeName} (${r.registrations?.length || 0} employees)`));

    // Áp dụng logic overflow HCM để đảm bảo tính nhất quán với PDF export
    let processedRoutes = await this.applyHCMOverflowLogicForDialog(routes);

    // Áp dụng logic phân chia Biên Hòa giống PDF export
    processedRoutes = await this.applyBHDistributionLogicForDialog(processedRoutes);

    console.log('Dialog - Final processed routes:', processedRoutes.map(r => `${r.routeName} (${r.registrations?.length || 0} employees)`));

    return processedRoutes;
  }

  /**
   * Apply HCM grouping priority logic - Updated: Ưu tiên "Ngã 3 Bến Gỗ" và "Ngã 3 Long Bình Tân" vào tuyến Biên Hòa
   * HCM01: Ngã 4 Thủ Đức, RMK, Ngã 3 Cát Lái, Hàng Xanh (Gần Văn Thánh), Đinh Tiên Hoàng-ĐBP, Hai Bà Trưng-ĐBP, BV Hòa Hảo
   * HCM02: Ngã 4 Thủ Đức, RMK, Ngã 3 Cát Lái, Bà Chiểu, Chợ Gò Vấp, Hóc Môn, Trường Lý Tự Trọng
   */
  private applyHCMGroupingPriority(routeName: string, tramXe: string): string {
    // Check if it's a self-transport case
    if (this.isSelfTransportStation(tramXe)) {
      return 'TỰ TÚC';
    }
    
    // Đặc biệt: "Ngã 3 Hãng dầu" luôn thuộc BH03
    if (this.isNga3HangDauStation(tramXe)) {
      return 'BH03';
    }
    
    // ƯU TIÊN: "Ngã 3 Bến Gỗ" và "Ngã 3 Long Bình Tân" vào tuyến Biên Hòa để tối ưu chi phí
    if (this.isBenGoOrLongBinhTanStation(tramXe)) {
      // Nếu đã là tuyến BH, giữ nguyên
      if (routeName === 'BH01' || routeName === 'BH02' || routeName === 'BH03') {
        return routeName;
      }
      // Nếu là tuyến HCM hoặc chưa phân tuyến, chuyển sang BH03
      return 'BH03';
    }
    
    // Kiểm tra nếu là trạm ưu tiên cho HCM02
    if (this.isHCM02PriorityStation(tramXe)) {
      return 'HCM02';
    }
    
    // Kiểm tra nếu là trạm ưu tiên cho HCM01
    if (this.isHCM01PriorityStation(tramXe)) {
      return 'HCM01';
    }
    
    // Giữ nguyên tuyến từ database mapping
    return routeName;
  }


  /**
   * Kiểm tra xem trạm có phải là BV Hòa Hảo không
   * BV Hòa Hảo phải luôn ở HCM01, không bao giờ được đưa vào HCM02
   */
  private isBvHoaHaoStation(station: string): boolean {
    if (!station) return false;
    const stationLower = station.toLowerCase();
    const bvHoaHaoVariations = ['bv hòa hảo', 'bv hoa hao', 'bệnh viện hòa hảo', 'benh vien hoa hao'];
    return bvHoaHaoVariations.some(v => stationLower.includes(v) || v.includes(stationLower));
  }

  /**
   * Kiểm tra xem trạm có phải là trạm chung giữa HCM01 và HCM02 không
   * Các trạm này có thể được chuyển từ HCM01 sang HCM02 để tạo chỗ trống cho BV Hòa Hảo
   */
  private isSharedStationForHCM(station: string): boolean {
    if (!station) return false;
    const stationLower = station.toLowerCase();
    const sharedStations = [
      'ngã 4 thủ đức', 'nga 4 thu duc',
      'rmk',
      'ngã 3 cát lái', 'nga 3 cat lai'
    ];
    return sharedStations.some(sharedStation =>
      stationLower.includes(sharedStation) || sharedStation.includes(stationLower)
    );
  }

  /**
   * Kiểm tra xem trạm có phải là trạm ưu tiên cho HCM01 không
   * Cập nhật theo hình ảnh: HCM01 bao gồm Đinh Tiên Hoàng-ĐBP, Hai Bà Trưng-ĐBP, Ngã 4 Thủ Đức, Hàng Xanh
   * Lưu ý: BV Hòa Hảo được xử lý riêng bằng isBvHoaHaoStation
   */
  private isHCM01PriorityStation(station: string): boolean {
    if (!station) return false;
    // Loại bỏ BV Hòa Hảo vì đã được xử lý riêng
    if (this.isBvHoaHaoStation(station)) {
      return false;
    }
    
    const stationLower = station.toLowerCase();
    
    const hcm01PriorityStations = [
      'đinh tiên hoàng', 'dinh tien hoang',
      'hai bà trưng', 'hai ba trung',
      'ngã 4 thủ đức', 'nga 4 thu duc',
      'hàng xanh', 'hang xanh', 'hàng xanh (gần văn thánh)', 'hang xanh (gan van thanh)'
    ];
    
    return hcm01PriorityStations.some(priorityStation =>
      stationLower.includes(priorityStation) || priorityStation.includes(stationLower)
    );
  }

  /**
   * Kiểm tra xem trạm có phải là trạm ưu tiên cho HCM02 không
   * Cập nhật theo hình ảnh: HCM02 bao gồm Bà Chiểu, Chợ Gò Vấp, Hóc Môn, Trường Lý Tự Trọng
   */
  private isHCM02PriorityStation(station: string): boolean {
    if (!station) return false;
    
    const stationLower = station.toLowerCase();
    
    const hcm02PriorityStations = [
      'bà chiểu', 'ba chieu',
      'chợ gò vấp', 'cho go vap', 'gò vấp', 'go vap',
      'hóc môn', 'hoc mon',
      'chùa hoằng pháp', 'chua hoang phap',
      'trường lý tự trọng', 'truong ly tu trong'
    ];
    
    return hcm02PriorityStations.some(priorityStation => 
      stationLower.includes(priorityStation) || priorityStation.includes(stationLower)
    );
  }

  /**
   * Check if station is before or at "Hàng xanh" (same logic as PDF service)
   */
  private isStationBeforeOrAtHangXanh(tramXe: string): boolean {
    if (!tramXe) return false;
    
    const station = tramXe.toLowerCase();
    
    // Danh sách các trạm từ KCN Long Đức đến Hàng xanh (theo thứ tự)
    // Loại bỏ các trạm không nên gom vào BH01 như Ngã 4 Thủ Đức, Bà Chiểu, Chợ Gò Vấp
    const stationsBeforeHangXanh = [
      'kcn long đức',
      'ngã 3 bến gỗ', 
      'ngã 3 long bình tân',
      'rmk',
      'ngã 3 cát lái',
      'bến gỗ',
      'bến xe miền đông',
      'hàng xanh',
      'hàng xanh - bến xe'
    ];
    
    return stationsBeforeHangXanh.some(stationName => 
      station.includes(stationName)
    );
  }

  /**
   * Check if it's a self-transport station (same logic as PDF service)
   */
  private isSelfTransportStation(tramXe: string): boolean {
    if (!tramXe) return false;
    
    const station = tramXe.toLowerCase();
    
    const selfTransportStations = [
      'tự túc',
      'tự đi',
      'không cần xe',
      'tự lo',
      'tự sắp xếp'
    ];
    
    return selfTransportStations.some(stationName => 
      station.includes(stationName)
    );
  }

  /**
   * Kiểm tra xem trạm có phải là "Ngã 3 Bến Gỗ" hoặc "Ngã 3 Long Bình Tân" không
   * Các trạm này được ưu tiên vào tuyến Biên Hòa để tối ưu chi phí
   */
  private isBenGoOrLongBinhTanStation(station: string): boolean {
    if (!station) return false;
    
    const stationLower = station.toLowerCase();
    
    const priorityStations = [
      'ngã 3 bến gỗ', 'nga 3 ben go',
      'ngã 3 long bình tân', 'nga 3 long binh tan'
    ];
    
    return priorityStations.some(priorityStation =>
      stationLower.includes(priorityStation) || priorityStation.includes(stationLower)
    );
  }

  /**
   * Kiểm tra xem trạm có phải là "Ngã 3 Hãng dầu" không
   */
  private isNga3HangDauStation(station: string): boolean {
    if (!station) return false;
    
    const stationLower = station.toLowerCase();
    
    const nga3HangDauVariations = [
      'ngã 3 hãng dầu',
      'nga 3 hang dau',
      'ngã 3 hàng dầu',
      'nga 3 hang dau',
      'hãng dầu',
      'hang dau',
      'hàng dầu',
      'hang dau'
    ];
    
    return nga3HangDauVariations.some(variation => 
      stationLower.includes(variation) || variation.includes(stationLower)
    );
  }

  /**
   * Export overtime report PDF with vehicle assignment data
   */
  private async exportOvertimeReportPDFWithVehicleAssignment(result: any): Promise<void> {
    try {
      // Pass vehicle assignment data and selected date to PDF export service
      const base = this.displayDate || this.startDate || new Date();
      await this.pdfExportService.exportOvertimeReportPDFWithVehicleAssignments(result.routeAssignments, base);
      
      // Show success message
      this.snackBar.open('File PDF đã được tạo thành công với thông tin phân công xe!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });

    } catch (error) {
      console.error('Error exporting overtime report PDF:', error);
      this.snackBar.open('Có lỗi xảy ra khi tạo file PDF!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Export overtime report Excel with vehicle assignment data
   */
  private async exportOvertimeReportExcelWithVehicleAssignment(result: any): Promise<void> {
    try {
      // Pass vehicle assignment data and selected date to Excel export service
      const base = this.displayDate || this.startDate || new Date();
      await this.excelExportService.exportOvertimeReportExcelWithVehicleAssignments(result.routeAssignments, base);
      
      // Show success message
      this.snackBar.open('File Excel đã được tạo thành công với thông tin phân công xe!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });

    } catch (error) {
      console.error('Error exporting overtime report Excel:', error);
      this.snackBar.open('Có lỗi xảy ra khi tạo file Excel!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Export employee station PDF
   */
  async exportEmployeeStationPDF(): Promise<void> {
    // TODO: Fix PdfExportEmployeeStationService import issue
    console.log('Export employee station PDF - temporarily disabled');
    /*
    try {
      // Set loading state
      this.isExportingEmployeeStationPDF = true;

      // Export to PDF
      await this.pdfExportEmployeeStationService.exportEmployeeStationPDF();
      
      // Show success message
      this.snackBar.open('File PDF danh sách nhân viên đã được tạo thành công!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });

    } catch (error) {
      console.error('Error exporting employee station PDF:', error);
      this.snackBar.open('Có lỗi xảy ra khi tạo file PDF danh sách nhân viên!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } finally {
      // Reset loading state
      this.isExportingEmployeeStationPDF = false;
    }
    */
  }

  /**
   * Check if current user has admin or super_admin role
   */
  hasAdminRole(): boolean {
    return this.authService.hasAnyRoleSync(['admin', 'super_admin']);
  }

  /**
   * Check if current user has super_admin role
   */
  hasSuperAdminRole(): boolean {
    return this.authService.hasAnyRoleSync(['super_admin']);
  }

  /**
   * Update displayed columns based on user role
   */
  updateDisplayedColumns(): void {
    const baseColumns = [
      'select',
      'maNhanVien', 
      'hoTen', 
      'dienThoai', 
      'ngayDangKy', 
      'thoiGianBatDau', 
      'tramXe',
      'actions'
    ];

    if (this.hasSuperAdminRole()) {
      // Insert maTuyenXe column before actions for super_admin
      const maTuyenXeIndex = baseColumns.indexOf('actions');
      baseColumns.splice(maTuyenXeIndex, 0, 'maTuyenXe');
    }

    this.displayedColumns = baseColumns;
  }

  // ==================== STATION ASSIGNMENT PDF EXPORT METHODS ====================

  /**
   * Open station assignment dialog for PDF export
   */
  async openStationAssignmentDialog(): Promise<void> {
    try {
      
      // Get vehicles from Firebase or use mock data
      const vehicles = await this.getVehiclesForAssignment();

      if (vehicles.length === 0) {
        this.snackBar.open('Không có dữ liệu xe để phân công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        return;
      }

      const dialogRef = this.dialog.open(StationAssignmentDialogComponent, {
        width: '1200px',
        maxWidth: '95vw',
        height: '90vh',
        data: {
          stations: [],
          vehicles: vehicles,
          drivers: []
        }
      });

      dialogRef.afterClosed().subscribe(async result => {
        if (result && result.stationAssignments) {
          await this.exportStationAssignmentsToPDF(result);
        }
      });

    } catch (error) {
      console.error('Error opening station assignment dialog:', error);
      this.snackBar.open('Có lỗi xảy ra khi mở dialog phân công!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Get vehicles for assignment (mock data for now)
   */
  private async getVehiclesForAssignment(): Promise<any[]> {
    // For now, return mock vehicles
    // In real implementation, fetch from Firebase
    return [
      {
        MaXe: 'VEH001',
        BienSoXe: '51A-12345',
        TenTaiXe: 'Nguyễn Văn A',
        SoDienThoaiTaiXe: '0901234567',
        LoaiXe: 'Xe 16 chỗ',
        MaNhaXe: 'NX001'
      },
      {
        MaXe: 'VEH002',
        BienSoXe: '51B-67890',
        TenTaiXe: 'Trần Thị B',
        SoDienThoaiTaiXe: '0901234568',
        LoaiXe: 'Xe 29 chỗ',
        MaNhaXe: 'NX001'
      },
      {
        MaXe: 'VEH003',
        BienSoXe: '51C-11111',
        TenTaiXe: 'Lê Văn C',
        SoDienThoaiTaiXe: '0901234569',
        LoaiXe: 'Xe 45 chỗ',
        MaNhaXe: 'NX002'
      },
      {
        MaXe: 'VEH004',
        BienSoXe: '51D-22222',
        TenTaiXe: 'Phạm Thị D',
        SoDienThoaiTaiXe: '0901234570',
        LoaiXe: 'Xe taxi 7 chỗ',
        MaNhaXe: 'NX002'
      },
      {
        MaXe: 'VEH005',
        BienSoXe: '51E-33333',
        TenTaiXe: 'Hoàng Văn E',
        SoDienThoaiTaiXe: '0901234571',
        LoaiXe: 'Xe 16 chỗ',
        MaNhaXe: 'NX003'
      }
    ];
  }

  /**
   * Export station assignments to PDF
   */
  private async exportStationAssignmentsToPDF(result: any): Promise<void> {
    try {
      const exportData: PDFExportData = {
        exportDate: result.exportDate,
        stationAssignments: result.stationAssignments,
        totalEmployees: result.stationAssignments.reduce((sum: number, s: StationAssignment) => sum + s.employeeCount, 0),
        totalVehicles: result.stationAssignments.length,
        totalStations: result.stationAssignments.length
      };

      await this.stationAssignmentPdfExportService.exportStationAssignmentsToPDF(exportData);

      this.snackBar.open('File PDF phân công tài xế và xe đã được tạo thành công!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });

    } catch (error) {
      console.error('Error exporting PDF:', error);
      this.snackBar.open('Có lỗi xảy ra khi tạo file PDF!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Áp dụng logic overflow HCM cho dialog để đảm bảo tính nhất quán với PDF export
   */
  private async applyHCMOverflowLogicForDialog(routes: any[]): Promise<any[]> {
    console.log('Dialog - Applying HCM overflow logic with cache data');
    
    // Tính tổng nhân viên HCM
    const hcmRoutes = routes.filter(route => 
      route.routeName === 'HCM01' || route.routeName === 'HCM02'
    );
    
    const totalHCMEmployees = hcmRoutes.reduce((sum, route) => 
      sum + (route.registrations?.length || 0), 0
    );
    
    console.log('Dialog - Total HCM employees:', totalHCMEmployees);
    
    // Kiểm tra nếu HCM02 vượt quá 15 nhân viên
    const hcm02Route = hcmRoutes.find(route => route.routeName === 'HCM02');
    const hcm02Count = hcm02Route?.registrations?.length || 0;
    
    if (hcm02Count > 15) {
      console.log(`Dialog - HCM02 has ${hcm02Count} employees (exceeds 15), applying overflow logic...`);
      return this.applyHCM02SpecificOverflowLogicForDialog(routes, hcmRoutes);
    }
    
    // Gom tất cả nhân viên HCM và phân chia theo logic mới: HCM01 trước (đủ 15), sau đó HCM02, nếu dư thì chuyển sang BH
    console.log('Dialog - Applying sequential HCM distribution logic...');
    return this.distributeHCMSequentiallyForDialog(routes, hcmRoutes);
    
    console.log('Dialog - HCM employees > 30, applying overflow logic...');
    
    // Lấy tất cả nhân viên HCM
    const allHCMEmployees: Registration[] = [];
    hcmRoutes.forEach(route => {
      if (route.registrations) {
        allHCMEmployees.push(...route.registrations);
      }
    });
    
    // Lấy danh sách trạm BH để so sánh
    const bhStations = await this.getBHStationNamesForDialog();
    console.log('Dialog - BH stations for matching:', bhStations);
    
    // Tính số nhân viên dư thừa
    const maxHCMCapacity = 30; // 2 xe x 15 chỗ
    const overflowCount = totalHCMEmployees - maxHCMCapacity;
    console.log(`Dialog - HCM overflow: ${overflowCount} employees need to be reassigned to BH routes`);
    
    // Trường hợp đặc biệt: Nếu chỉ dư 1 nhân viên (31 tổng), tìm nhân viên có trạm trùng BH trước
    if (overflowCount === 1) {
      console.log('Dialog - Special case: Only 1 employee overflow, finding BH-matching employee first');
      
      // Tìm nhân viên có trạm trùng với BH
      const bhMatchingEmployee = allHCMEmployees.find(employee => {
        const stationName = this.normalizeStationName(employee.tramXe);
        return bhStations.some(bhStation => 
          this.normalizeStationName(bhStation) === stationName ||
          stationName.includes(this.normalizeStationName(bhStation)) ||
          this.normalizeStationName(bhStation).includes(stationName)
        );
      });
      
      if (bhMatchingEmployee) {
        console.log(`Dialog - Found BH-matching employee: ${bhMatchingEmployee?.hoTen} at station ${bhMatchingEmployee?.tramXe}`);
        
        // Chuyển nhân viên này sang BH route
        if (bhMatchingEmployee) {
          const targetBHRoute = this.findBestBHRouteForEmployeeForDialog(bhMatchingEmployee!, routes);
          if (targetBHRoute) {
            const routeIndex = routes.findIndex(r => r.routeName === targetBHRoute);
            if (routeIndex >= 0) {
              if (!routes[routeIndex].registrations) {
                routes[routeIndex].registrations = [];
              }
              routes[routeIndex].registrations.push(bhMatchingEmployee!);
              console.log(`Dialog - Moved ${bhMatchingEmployee!.hoTen} to ${targetBHRoute}`);
            }
          }
        }
        
        // Phân bổ 30 nhân viên còn lại cho HCM01 và HCM02 bằng logic phân chia đều
        const remainingHCMEmployees = allHCMEmployees.filter(emp => emp !== bhMatchingEmployee);
        const remainingHCMRoutes = hcmRoutes.map(route => ({
          ...route,
          registrations: route.registrations?.filter((emp: Registration) => emp !== bhMatchingEmployee) || []
        }));
        return this.distributeHCMEmployeesEvenlyForDialog(routes, remainingHCMRoutes);
      } else {
        console.log('Dialog - No BH-matching employee found, using general overflow logic');
      }
    }
    
    // Phân loại nhân viên HCM: trùng trạm BH vs không trùng trạm BH
    const employeesMatchingBH: Registration[] = [];
    const employeesNotMatchingBH: Registration[] = [];
    
    allHCMEmployees.forEach(employee => {
      const stationName = this.normalizeStationName(employee.tramXe);
      
      // Kiểm tra xem trạm có khớp với trạm BH không
      const matchingBHStation = bhStations.find(bhStation => 
        this.normalizeStationName(bhStation) === stationName ||
        stationName.includes(this.normalizeStationName(bhStation)) ||
        this.normalizeStationName(bhStation).includes(stationName)
      );
      
      if (matchingBHStation) {
        console.log(`Dialog - Employee ${employee.hoTen} at station ${employee.tramXe} matches BH station ${matchingBHStation}`);
        employeesMatchingBH.push(employee);
      } else {
        employeesNotMatchingBH.push(employee);
      }
    });
    
    console.log(`Dialog - Employees matching BH: ${employeesMatchingBH.length}, Not matching BH: ${employeesNotMatchingBH.length}`);
    
    // Chuyển nhân viên trùng trạm BH sang BH routes (ưu tiên chuyển đủ số dư thừa)
    const employeesToMoveToBH = employeesMatchingBH.slice(0, overflowCount);
    const remainingHCMEmployees = [
      ...employeesNotMatchingBH,
      ...employeesMatchingBH.slice(overflowCount)
    ];
    
    console.log(`Dialog - Moving ${employeesToMoveToBH.length} employees to BH routes`);
    console.log(`Dialog - Remaining HCM employees: ${remainingHCMEmployees.length}`);
    
    // Phân chia nhân viên HCM còn lại bằng logic phân chia đều
    const remainingHCMRoutes = hcmRoutes.map(route => ({
      ...route,
      registrations: remainingHCMEmployees
    }));
    
    const updatedRoutes = this.distributeHCMEmployeesEvenlyForDialog(routes, remainingHCMRoutes);
    
    // Chuyển nhân viên dư thừa vào BH routes
    employeesToMoveToBH.forEach(employee => {
      const targetBHRoute = this.findBestBHRouteForEmployeeForDialog(employee, updatedRoutes);
      if (targetBHRoute) {
        const routeIndex = updatedRoutes.findIndex(r => r.routeName === targetBHRoute);
        if (routeIndex >= 0) {
          if (!updatedRoutes[routeIndex].registrations) {
            updatedRoutes[routeIndex].registrations = [];
          }
          updatedRoutes[routeIndex].registrations.push(employee);
        }
      }
    });
    
    console.log('Dialog - Final route distribution after overflow logic:');
    updatedRoutes.forEach(route => {
      console.log(`${route.routeName}: ${route.registrations?.length || 0} employees`);
    });
    
    return updatedRoutes;
  }

  /**
   * Distribute HCM employees sequentially: HCM01 trước (đủ 15), sau đó HCM02, nếu dư thì chuyển sang BH
   * Thứ tự trạm phải tồn tại trong tuyến dựa vào chiTietTuyenDuong
   */
  private async distributeHCMSequentiallyForDialog(routes: any[], hcmRoutes: any[]): Promise<any[]> {
    console.log('Dialog - Applying sequential distribution logic for HCM routes...');
    
    // Gom tất cả nhân viên HCM
    const allHCMEmployees: Registration[] = [];
    hcmRoutes.forEach(route => {
      if (route.registrations) {
        allHCMEmployees.push(...route.registrations);
      }
    });
    
    console.log(`Dialog - Total HCM employees to distribute: ${allHCMEmployees.length}`);
    console.log(`Dialog - HCM employees details:`, allHCMEmployees.map(emp => `${emp.hoTen}(${emp.tramXe})`));
    
    // Sắp xếp nhân viên theo thứ tự trạm trong tuyến từ chiTietTuyenDuong
    const sortedHCMEmployees = await this.sortEmployeesByStationOrder(allHCMEmployees);
    console.log(`Dialog - Sorted HCM employees by station order: ${sortedHCMEmployees.map(emp => `${emp.hoTen}(${emp.tramXe})`).join(', ')}`);
    
    const hcm01Employees: Registration[] = [];
    const hcm02Employees: Registration[] = [];
    const maxEmployeesPerRoute = 15;
    
    console.log(`Dialog - Starting distribution with max ${maxEmployeesPerRoute} employees per route`);
    
    // Phân chia tuần tự: HCM01 trước (đủ 15), sau đó HCM02
    for (let i = 0; i < sortedHCMEmployees.length; i++) {
      const employee = sortedHCMEmployees[i];
      
      if (hcm01Employees.length < maxEmployeesPerRoute) {
        hcm01Employees.push(employee);
        console.log(`Dialog - Assigned ${employee.hoTen} to HCM01 (${hcm01Employees.length}/${maxEmployeesPerRoute})`);
      } else if (hcm02Employees.length < maxEmployeesPerRoute) {
        hcm02Employees.push(employee);
        console.log(`Dialog - HCM01 full, assigned ${employee.hoTen} to HCM02 (${hcm02Employees.length}/${maxEmployeesPerRoute})`);
      } else {
        // Cả hai tuyến đều đủ, nhân viên còn lại sẽ được chuyển sang BH
        console.log(`Dialog - Both HCM routes full, employee ${employee.hoTen} will be moved to BH route`);
        break;
      }
    }
    
    console.log(`Dialog - Sequential distribution result: HCM01=${hcm01Employees.length}, HCM02=${hcm02Employees.length}`);
    console.log(`Dialog - HCM01 employees:`, hcm01Employees.map(emp => `${emp.hoTen}(${emp.tramXe})`));
    console.log(`Dialog - HCM02 employees:`, hcm02Employees.map(emp => `${emp.hoTen}(${emp.tramXe})`));
    
    // Cập nhật routes
    const updatedRoutes = [...routes];
    const hcm01Index = updatedRoutes.findIndex(r => r.routeName === 'HCM01');
    const hcm02Index = updatedRoutes.findIndex(r => r.routeName === 'HCM02');
    
    if (hcm01Index >= 0) {
      updatedRoutes[hcm01Index].registrations = hcm01Employees;
    }
    if (hcm02Index >= 0) {
      updatedRoutes[hcm02Index].registrations = hcm02Employees;
    }
    
    // Chuyển nhân viên dư thừa sang tuyến BH theo trạm
    const remainingEmployees = sortedHCMEmployees.slice(hcm01Employees.length + hcm02Employees.length);
    console.log(`Dialog - Moving ${remainingEmployees.length} overflow employees to BH routes`);
    
    for (const employee of remainingEmployees) {
      const bhRoute = await this.findBHRouteForStationForDialog(employee.tramXe || '');
      if (bhRoute) {
        const bhRouteIndex = updatedRoutes.findIndex(r => r.routeName === bhRoute);
        if (bhRouteIndex >= 0) {
          if (!updatedRoutes[bhRouteIndex].registrations) {
            updatedRoutes[bhRouteIndex].registrations = [];
          }
          updatedRoutes[bhRouteIndex].registrations.push(employee);
          console.log(`Dialog - Moved overflow employee ${employee.hoTen} from station "${employee.tramXe}" to ${bhRoute}`);
        }
      }
    }
    
    return updatedRoutes;
  }

  /**
   * Sắp xếp nhân viên theo thứ tự trạm trong tuyến từ cache
   */
  private async sortEmployeesByStationOrder(employees: Registration[]): Promise<Registration[]> {
    try {
      if (!this.dataCacheService.isDataLoaded()) {
        console.warn('Dialog - Data cache not loaded, returning employees without sorting');
        return employees;
      }

      // Sắp xếp nhân viên theo thứ tự trạm từ cache
      const sortedEmployees = [...employees].sort((a, b) => {
        const stationA = a.tramXe || '';
        const stationB = b.tramXe || '';
        
        // Tìm thứ tự trạm từ cache
        let orderA = 999;
        let orderB = 999;
        
        // Tìm thứ tự trạm từ HCM01
        const hcm01OrderA = this.dataCacheService.getStationOrderInRoute('HCM01', stationA);
        const hcm01OrderB = this.dataCacheService.getStationOrderInRoute('HCM01', stationB);
        if (hcm01OrderA !== null) orderA = hcm01OrderA;
        if (hcm01OrderB !== null) orderB = hcm01OrderB;
        
        // Nếu không tìm thấy trong HCM01, tìm trong HCM02
        if (orderA === 999 || orderB === 999) {
          const hcm02OrderA = this.dataCacheService.getStationOrderInRoute('HCM02', stationA);
          const hcm02OrderB = this.dataCacheService.getStationOrderInRoute('HCM02', stationB);
          if (hcm02OrderA !== null && orderA === 999) orderA = hcm02OrderA;
          if (hcm02OrderB !== null && orderB === 999) orderB = hcm02OrderB;
        }
        
        // Sắp xếp theo thứ tự trạm
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        
        // Fallback: sắp xếp theo tên nhân viên
        return a.hoTen.localeCompare(b.hoTen);
      });

      console.log(`Dialog - Sorted ${sortedEmployees.length} employees by station order`);
      return sortedEmployees;
      
    } catch (error) {
      console.error('Dialog - Error sorting employees by station order:', error);
      return employees;
    }
  }
  private async findBHRouteForStationForDialog(stationName: string): Promise<string> {
    // Lấy tuyến từ cache
    const actualRoute = this.dataCacheService.getRouteForStation(stationName);
    if (actualRoute) {
      console.log(`Dialog - Found route "${actualRoute}" for station "${stationName}" from cache`);
      return actualRoute;
    }

    console.log(`Dialog - No matching route found for "${stationName}", defaulting to BH01`);
    return 'BH01';
  }

  /**
   * Phân chia đều nhân viên HCM giữa HCM01 và HCM02 không quan tâm mã tuyến ban đầu
   * QUAN TRỌNG: Đảm bảo BV Hòa Hảo luôn ở HCM01
   */
  private distributeHCMEmployeesEvenlyForDialog(routes: any[], hcmRoutes: any[]): any[] {
    console.log('Dialog - Applying even distribution logic for HCM routes...');
    
    // Gom tất cả nhân viên HCM01 và HCM02 thành một danh sách chung
    const allHCMEmployees: Registration[] = [];
    hcmRoutes.forEach(route => {
      if (route.registrations) {
        allHCMEmployees.push(...route.registrations);
      }
    });
    
    console.log(`Dialog - Total HCM employees to distribute: ${allHCMEmployees.length}`);
    
    // QUAN TRỌNG: Tách riêng BV Hòa Hảo để đảm bảo luôn ở HCM01
    const bvHoaHaoEmployees: Registration[] = [];
    const otherHCMEmployees: Registration[] = [];
    
    allHCMEmployees.forEach(employee => {
      if (this.isBvHoaHaoStation(employee.tramXe)) {
        console.log(`Dialog - Classifying employee ${employee.hoTen} from station "${employee.tramXe}" as BV Hòa Hảo (must be in HCM01)`);
        bvHoaHaoEmployees.push(employee);
      } else {
        otherHCMEmployees.push(employee);
      }
    });
    
    // Khởi tạo danh sách nhân viên cho từng tuyến
    const hcm01Employees: Registration[] = [];
    const hcm02Employees: Registration[] = [];
    
    const maxEmployeesPerRoute = 15;
    let currentRoute = 'HCM01'; // Bắt đầu với HCM01
    
    // Vòng lặp tuần tự gán nhân viên (không bao gồm BV Hòa Hảo)
    for (let i = 0; i < otherHCMEmployees.length; i++) {
      const employee = otherHCMEmployees[i];
      
      if (currentRoute === 'HCM01') {
        if (hcm01Employees.length < maxEmployeesPerRoute) {
          hcm01Employees.push(employee);
          console.log(`Dialog - Assigned ${employee.hoTen} to HCM01 (${hcm01Employees.length}/${maxEmployeesPerRoute})`);
        } else {
          // HCM01 đã đủ, chuyển sang HCM02
          currentRoute = 'HCM02';
          hcm02Employees.push(employee);
          console.log(`Dialog - HCM01 full, assigned ${employee.hoTen} to HCM02 (${hcm02Employees.length}/${maxEmployeesPerRoute})`);
        }
      } else if (currentRoute === 'HCM02') {
        if (hcm02Employees.length < maxEmployeesPerRoute) {
          hcm02Employees.push(employee);
          console.log(`Dialog - Assigned ${employee.hoTen} to HCM02 (${hcm02Employees.length}/${maxEmployeesPerRoute})`);
        } else {
          // Cả hai tuyến đều đủ, nhân viên còn lại sẽ được xử lý bởi overflow logic
          console.log(`Dialog - Both HCM routes full, employee ${employee.hoTen} will be handled by overflow logic`);
          break;
        }
      }
    }
    
    // QUAN TRỌNG: Đảm bảo tất cả nhân viên từ BV Hòa Hảo được đưa vào HCM01
    // Nếu HCM01 đầy, chuyển nhân viên từ các trạm chung (shared stations) từ HCM01 sang HCM02 để tạo chỗ trống
    for (const employee of bvHoaHaoEmployees) {
      if (hcm01Employees.length < maxEmployeesPerRoute) {
        hcm01Employees.push(employee);
        console.log(`Dialog - Added BV Hòa Hảo employee ${employee.hoTen} to HCM01 (${hcm01Employees.length}/${maxEmployeesPerRoute})`);
      } else {
        // HCM01 is full, cần chuyển nhân viên từ trạm chung từ HCM01 sang HCM02 để tạo chỗ trống
        console.log(`Dialog - HCM01 is full, moving shared station employees from HCM01 to HCM02 to make room for BV Hòa Hảo employee ${employee.hoTen}`);
        
        // Tìm nhân viên từ trạm chung trong HCM01 để chuyển sang HCM02
        let moved = false;
        for (let i = hcm01Employees.length - 1; i >= 0; i--) {
          const empInHCM01 = hcm01Employees[i];
          const stationLower = (empInHCM01.tramXe || '').toLowerCase();
          
          // Chỉ chuyển nhân viên từ trạm chung (shared stations như RMK, Ngã 4 Thủ Đức, Ngã 3 Cát Lái)
          if (this.isSharedStationForHCM(stationLower)) {
            if (hcm02Employees.length < maxEmployeesPerRoute) {
              hcm01Employees.splice(i, 1);
              hcm02Employees.push(empInHCM01);
              console.log(`Dialog - Moved shared station employee ${empInHCM01.hoTen} from HCM01 to HCM02 to make room for BV Hòa Hảo`);
              moved = true;
              break;
            }
          }
        }
        
        // Nếu đã chuyển được, thêm nhân viên BV Hòa Hảo vào HCM01
        if (moved) {
          hcm01Employees.push(employee);
          console.log(`Dialog - Added BV Hòa Hảo employee ${employee.hoTen} to HCM01 after making room`);
        } else {
          // Nếu không thể chuyển, vẫn thêm vào HCM01 (overflow) nhưng log warning
          console.warn(`Dialog - WARNING: Could not make room in HCM01 for BV Hòa Hảo employee ${employee.hoTen}, adding anyway (overflow)`);
          hcm01Employees.push(employee);
        }
      }
    }
    
    console.log(`Dialog - Even distribution result: HCM01=${hcm01Employees.length}, HCM02=${hcm02Employees.length}`);
    
    // Cập nhật routes
    const updatedRoutes = [...routes];
    
    // Cập nhật HCM01 và HCM02
    const hcm01Index = updatedRoutes.findIndex(r => r.routeName === 'HCM01');
    const hcm02Index = updatedRoutes.findIndex(r => r.routeName === 'HCM02');
    
    if (hcm01Index >= 0) {
      updatedRoutes[hcm01Index].registrations = hcm01Employees;
    }
    if (hcm02Index >= 0) {
      updatedRoutes[hcm02Index].registrations = hcm02Employees;
    }
    
    return updatedRoutes;
  }

  /**
   * Áp dụng logic overflow cụ thể cho HCM02 khi vượt quá 15 nhân viên (cho dialog)
   */
  private async applyHCM02SpecificOverflowLogicForDialog(routes: any[], hcmRoutes: any[]): Promise<any[]> {
    console.log('Dialog - Applying HCM02 specific overflow logic...');
    
    // Lấy tất cả nhân viên HCM
    const allHCMEmployees: Registration[] = [];
    hcmRoutes.forEach(route => {
      if (route.registrations) {
        allHCMEmployees.push(...route.registrations);
      }
    });
    
    console.log(`Dialog - Total HCM employees: ${allHCMEmployees.length}`);
    
    // Tính số nhân viên dư thừa
    const maxHCMCapacity = 30; // 2 xe x 15 chỗ
    const overflowCount = allHCMEmployees.length - maxHCMCapacity;
    console.log(`Dialog - HCM02 overflow: ${overflowCount} employees need to be reassigned to BH routes`);
    
    // Lấy danh sách trạm BH để so sánh
    const bhStations = await this.getBHStationNamesForDialog();
    console.log('Dialog - BH stations for matching:', bhStations);
    
    // Phân loại nhân viên HCM: trùng trạm BH vs không trùng trạm BH
    const employeesMatchingBH: Registration[] = [];
    const employeesNotMatchingBH: Registration[] = [];
    
    allHCMEmployees.forEach(employee => {
      const stationName = this.normalizeStationName(employee.tramXe);
      
      // Kiểm tra xem trạm có khớp với trạm BH không
      const matchingBHStation = bhStations.find(bhStation => 
        this.normalizeStationName(bhStation) === stationName ||
        stationName.includes(this.normalizeStationName(bhStation)) ||
        this.normalizeStationName(bhStation).includes(stationName)
      );
      
      if (matchingBHStation) {
        console.log(`Dialog - Employee ${employee.hoTen} at station ${employee.tramXe} matches BH station ${matchingBHStation}`);
        employeesMatchingBH.push(employee);
      } else {
        employeesNotMatchingBH.push(employee);
      }
    });
    
    console.log(`Dialog - Employees matching BH: ${employeesMatchingBH.length}, Not matching BH: ${employeesNotMatchingBH.length}`);
    
    // Chuyển nhân viên trùng trạm BH sang BH routes (ưu tiên chuyển đủ số dư thừa)
    const employeesToMoveToBH = employeesMatchingBH.slice(0, overflowCount);
    const remainingHCMEmployees = [
      ...employeesNotMatchingBH,
      ...employeesMatchingBH.slice(overflowCount)
    ];
    
    console.log(`Dialog - Moving ${employeesToMoveToBH.length} employees to BH routes`);
    console.log(`Dialog - Remaining HCM employees: ${remainingHCMEmployees.length}`);
    
    // Phân chia nhân viên HCM còn lại bằng logic phân chia đều
    const remainingHCMRoutes = hcmRoutes.map(route => ({
      ...route,
      registrations: remainingHCMEmployees
    }));
    
    const updatedRoutes = this.distributeHCMEmployeesEvenlyForDialog(routes, remainingHCMRoutes);
    
    // Chuyển nhân viên dư thừa vào BH routes
    employeesToMoveToBH.forEach(employee => {
      const targetBHRoute = this.findBestBHRouteForEmployeeForDialog(employee, updatedRoutes);
      if (targetBHRoute) {
        const routeIndex = updatedRoutes.findIndex(r => r.routeName === targetBHRoute);
        if (routeIndex >= 0) {
          if (!updatedRoutes[routeIndex].registrations) {
            updatedRoutes[routeIndex].registrations = [];
          }
          updatedRoutes[routeIndex].registrations.push(employee);
        }
      }
    });
    
    console.log('Dialog - Final route distribution after HCM02 overflow logic:');
    updatedRoutes.forEach(route => {
      console.log(`${route.routeName}: ${route.registrations?.length || 0} employees`);
    });
    
    return updatedRoutes;
  }

  /**
   * Chia đều nhân viên HCM cho HCM01 và HCM02 khi tổng < 30 (cho dialog)
   */
  private distributeHCMEvenlyForDialog(routes: any[], hcmRoutes: any[]): any[] {
    console.log('Dialog - Using new even distribution logic for HCM routes...');
    return this.distributeHCMEmployeesEvenlyForDialog(routes, hcmRoutes);
  }

  /**
   * Lấy danh sách tên trạm của các tuyến BH (cho dialog)
   */
  private async getBHStationNamesForDialog(): Promise<string[]> {
    try {
      const routeDetails = await this.routeDetailService.getRouteDetails().toPromise();
      const bhStations = routeDetails
        ?.filter((detail: any) => detail.maTuyenXe.startsWith('BH'))
        ?.map((detail: any) => detail.tenDiemDon) || [];
      
      return [...new Set(bhStations)]; // Loại bỏ trùng lặp
    } catch (error) {
      console.error('Dialog - Error getting BH station names:', error);
      return [];
    }
  }

  /**
   * Tìm tuyến BH tốt nhất cho nhân viên (cho dialog)
   */
  private findBestBHRouteForEmployeeForDialog(employee: Registration, routes: any[]): string | null {
    const stationName = this.normalizeStationName(employee.tramXe);
    const stationLower = employee.tramXe.toLowerCase();
    
    // Ưu tiên BH03/BH04 cho các trạm cụ thể từ HCM02 overflow
    const stationsForBH03BH04 = ['ngã 3 bến gỗ', 'nga 3 ben go', 'ngã 3 long bình tân', 'nga 3 long binh tan'];
    const shouldUseBH03BH04 = stationsForBH03BH04.some(station => 
      stationLower.includes(station) || station.includes(stationLower)
    );
    
    if (shouldUseBH03BH04) {
      // Phân biệt cụ thể: Ngã 3 Bến Gỗ → BH03, Ngã 3 Long Bình Tân → BH04
      if (stationLower.includes('ngã 3 bến gỗ') || stationLower.includes('nga 3 ben go')) {
        const routeExists = routes.some(r => r.routeName === 'BH03');
        if (routeExists) {
          console.log(`Dialog - Assigning employee ${employee.hoTen} from station ${employee.tramXe} to BH03`);
          return 'BH03';
        }
      }
      
      if (stationLower.includes('ngã 3 long bình tân') || stationLower.includes('nga 3 long binh tan')) {
        const routeExists = routes.some(r => r.routeName === 'BH03');
        if (routeExists) {
          console.log(`Dialog - Assigning employee ${employee.hoTen} from station ${employee.tramXe} to BH03`);
          return 'BH03';
        }
      }
      
      // Fallback: Ưu tiên BH03
      const preferredBHRoutes = ['BH03'];
      for (const bhRoute of preferredBHRoutes) {
        const routeExists = routes.some(r => r.routeName === bhRoute);
        if (routeExists) {
          console.log(`Dialog - Assigning employee ${employee.hoTen} from station ${employee.tramXe} to ${bhRoute} (fallback)`);
          return bhRoute;
        }
      }
    }
    
    // Ưu tiên BH01, BH02, BH03 theo thứ tự cho các trạm khác
    const bhRoutes = ['BH01', 'BH02', 'BH03'];
    
    for (const bhRoute of bhRoutes) {
      const routeExists = routes.some(r => r.routeName === bhRoute);
      if (routeExists) {
        console.log(`Dialog - Assigning employee ${employee.hoTen} from station ${employee.tramXe} to ${bhRoute}`);
        return bhRoute;
      }
    }
    
    console.log(`Dialog - No BH route found, using BH01 as fallback for ${employee.hoTen}`);
    return 'BH01'; // Fallback
  }

  /**
   * Kiểm tra trạm thuộc về tuyến nào dựa trên dữ liệu từ Firebase (cho dialog)
   */
  private async getStationRouteMappingForDialog(): Promise<Map<string, string>> {
    const stationRouteMap = new Map<string, string>();
    
    try {
      // Import RouteDetailService để lấy dữ liệu từ Firebase
      const { RouteDetailService } = await import('../../services/route-detail.service');
      const routeDetailService = new RouteDetailService();
      
      // Lấy tất cả route details
      const routeDetails = await routeDetailService.getRouteDetails().toPromise();
      
      if (routeDetails) {
        routeDetails.forEach((detail: any) => {
          const normalizedStation = this.normalizeStationName(detail.tenDiemDon);
          stationRouteMap.set(normalizedStation, detail.maTuyenXe);
          // Cũng lưu tên gốc để đảm bảo matching
          stationRouteMap.set(detail.tenDiemDon.toLowerCase(), detail.maTuyenXe);
        });
      }
      
      console.log('Dialog - Station-Route mapping loaded:', Array.from(stationRouteMap.entries()));
      
      // Log một số mapping quan trọng để kiểm tra
      const importantStations = ['đinh tiên hoàng-đbp', 'bv hòa hảo', 'ngã 3 bến gỗ', 'ngã 3 long bình tân'];
      importantStations.forEach(station => {
        const route = stationRouteMap.get(station) || stationRouteMap.get(this.normalizeStationName(station));
        console.log(`Dialog - Important station "${station}" mapped to route: ${route || 'NOT FOUND'}`);
      });
      
    } catch (error) {
      console.error('Dialog - Error loading station-route mapping from Firebase:', error);
      console.error('Dialog - This may cause incorrect station assignments. Please check Firebase connection.');
    }
    
    return stationRouteMap;
  }

  /**
   * Phân bổ 30 nhân viên HCM còn lại cho HCM01 và HCM02 (cho dialog)
   */
  private async distributeRemainingHCMEmployeesForDialog(hcmEmployees: Registration[], routes: any[]): Promise<any[]> {
    console.log('Dialog - Distributing remaining HCM employees:', hcmEmployees.length);
    
    const targetEmployeesPerHCMRoute = 15;
    
    // Sử dụng service đã load dữ liệu Firebase
    console.log('Dialog - Using pre-loaded Firebase data for station-route mapping');
    
    // Phân loại nhân viên theo tuyến thực tế và trạm ưu tiên HCM02
    const hcm01Employees: Registration[] = [];
    const hcm02PriorityEmployees: Registration[] = [];
    const otherHCMEmployees: Registration[] = [];
    
    // Lấy danh sách trạm chính thức của HCM01 và HCM02 từ cache
    const officialHCM01Stations = this.dataCacheService.getStationsForRoute('HCM01');
    const officialHCM02Stations = this.dataCacheService.getStationsForRoute('HCM02');
    
    hcmEmployees.forEach(employee => {
      // Sử dụng cache để lấy route cho trạm
      const actualRoute = this.dataCacheService.getRouteForStation(employee.tramXe);
      
      console.log(`Dialog - Processing employee ${employee.hoTen} at station "${employee.tramXe}"`);
      console.log(`Dialog - Cache mapping result: ${actualRoute || 'NOT FOUND IN CACHE'}`);
      
      // CHỈ DỰA VÀO CACHE DATA - KHÔNG HARDCODE
      if (actualRoute === 'HCM01' && officialHCM01Stations.includes(employee.tramXe)) {
        // Trạm thuộc HCM01 và có trong danh sách chính thức cache
        hcm01Employees.push(employee);
        console.log(`Dialog - ✅ Station "${employee.tramXe}" belongs to HCM01 (Cache confirmed), keeping in HCM01`);
      } else if (actualRoute === 'HCM02' && officialHCM02Stations.includes(employee.tramXe)) {
        // Trạm thuộc HCM02 và có trong danh sách chính thức cache
        hcm02PriorityEmployees.push(employee);
        console.log(`Dialog - ✅ Station "${employee.tramXe}" belongs to HCM02 (Cache confirmed), assigning to HCM02`);
      } else {
        // Trạm không thuộc HCM01 hoặc HCM02 chính thức - phân bổ linh hoạt
        otherHCMEmployees.push(employee);
        console.log(`Dialog - ⚠️ Station "${employee.tramXe}" NOT in official cache lists, flexible assignment`);
        console.log(`Dialog - ⚠️ Cache HCM01 stations: ${officialHCM01Stations.join(', ')}`);
        console.log(`Dialog - ⚠️ Cache HCM02 stations: ${officialHCM02Stations.join(', ')}`);
      }
    });
    
    console.log(`Dialog - HCM01 employees: ${hcm01Employees.length}`);
    console.log(`Dialog - HCM02 priority employees: ${hcm02PriorityEmployees.length}`);
    console.log(`Dialog - Other HCM employees: ${otherHCMEmployees.length}`);
    
    // Phân bổ cho HCM01: CHỈ lấy từ hcm01Employees (Firebase confirmed)
    let finalHCM01Employees = [...hcm01Employees];
    
    // Phân bổ cho HCM02: CHỈ lấy từ hcm02PriorityEmployees (Firebase confirmed)
    let finalHCM02Employees = [...hcm02PriorityEmployees];
    
    // Các trạm không thuộc Firebase sẽ được phân bổ vào tuyến khác (KHÔNG vào HCM01/HCM02)
    console.log(`Dialog - ⚠️ ${otherHCMEmployees.length} employees from non-Firebase stations will be assigned to other routes`);
    otherHCMEmployees.forEach(emp => {
      console.log(`Dialog - ⚠️ Employee "${emp.hoTen}" at station "${emp.tramXe}" - NOT assigned to HCM01/HCM02 (not in Firebase)`);
    });
    
    // Đảm bảo không vượt quá 15 nhân viên mỗi tuyến
    if (finalHCM01Employees.length > targetEmployeesPerHCMRoute) {
      console.log(`Dialog - ⚠️ HCM01 has ${finalHCM01Employees.length} employees, limiting to ${targetEmployeesPerHCMRoute}`);
      finalHCM01Employees = finalHCM01Employees.slice(0, targetEmployeesPerHCMRoute);
    }
    
    if (finalHCM02Employees.length > targetEmployeesPerHCMRoute) {
      console.log(`Dialog - ⚠️ HCM02 has ${finalHCM02Employees.length} employees, limiting to ${targetEmployeesPerHCMRoute}`);
      finalHCM02Employees = finalHCM02Employees.slice(0, targetEmployeesPerHCMRoute);
    }
    
    console.log(`Dialog - Final distribution: HCM01=${finalHCM01Employees.length}, HCM02=${finalHCM02Employees.length}`);
    
    // Cập nhật routes
    const updatedRoutes = [...routes];
    
    // Sắp xếp nhân viên theo thứ tự trạm từ cache
    console.log('Dialog - Sorting employees by station order from cache...');
    const sortedHCM01Employees = await this.sortEmployeesByStationOrder(finalHCM01Employees);
    const sortedHCM02Employees = await this.sortEmployeesByStationOrder(finalHCM02Employees);
    
    console.log('Dialog - HCM01 employees after sorting:', sortedHCM01Employees.map((emp: Registration) => `${emp.hoTen} - ${emp.tramXe}`));
    console.log('Dialog - HCM02 employees after sorting:', sortedHCM02Employees.map((emp: Registration) => `${emp.hoTen} - ${emp.tramXe}`));
    
    // Cập nhật HCM01 và HCM02
    const hcm01Index = updatedRoutes.findIndex(r => r.routeName === 'HCM01');
    const hcm02Index = updatedRoutes.findIndex(r => r.routeName === 'HCM02');
    
    if (hcm01Index >= 0) {
      updatedRoutes[hcm01Index].registrations = sortedHCM01Employees;
    }
    if (hcm02Index >= 0) {
      updatedRoutes[hcm02Index].registrations = sortedHCM02Employees;
    }
    
    
    console.log('Dialog - Final distribution result:');
    console.log(`HCM01: ${sortedHCM01Employees.length} employees`);
    console.log(`HCM02: ${sortedHCM02Employees.length} employees`);
    
    return updatedRoutes;
  }

  /**
   * Apply BH distribution logic for dialog - same as PDF export
   */
  private async applyBHDistributionLogicForDialog(routes: any[]): Promise<any[]> {
    // Find BH routes
    const bhRoutes = routes.filter(r => r.routeName === 'BH01' || r.routeName === 'BH02' || r.routeName === 'BH03');
    if (bhRoutes.length === 0) {
      return routes;
    }

    // Collect all BH employees
    const allBHEmployees: Registration[] = [];
    bhRoutes.forEach(route => {
      if (route.registrations) {
        allBHEmployees.push(...route.registrations);
      }
    });

    console.log(`Dialog - Total BH employees to redistribute: ${allBHEmployees.length}`);

    // Get stations for each BH route
    const bh01Stations = this.dataCacheService.getStationsForRoute('BH01');
    const bh02Stations = this.dataCacheService.getStationsForRoute('BH02');
    const bh03Stations = this.dataCacheService.getStationsForRoute('BH03');

    // QUAN TRỌNG: Tách riêng các trạm ưu tiên cho từng tuyến BH
    const phuocTanEmployees: Registration[] = []; // Ưu tiên BH01
    const nga3HangDauEmployees: Registration[] = []; // Ưu tiên BH03
    const benGoLongBinhTanEmployees: Registration[] = []; // Ưu tiên BH03
    const otherBHEmployees: Registration[] = [];
    
    allBHEmployees.forEach(employee => {
      const station = employee.tramXe || '';
      if (this.isPhuocTanToanDung(station)) {
        console.log(`Dialog - Classifying employee ${employee.hoTen} from station "${station}" as Phước Tân (must be in BH01)`);
        phuocTanEmployees.push(employee);
      } else if (this.isNga3HangDauStation(station)) {
        console.log(`Dialog - Classifying employee ${employee.hoTen} from station "${station}" as Ngã 3 Hãng dầu (must be in BH03)`);
        nga3HangDauEmployees.push(employee);
      } else if (this.isBenGoOrLongBinhTanStation(station)) {
        console.log(`Dialog - Classifying employee ${employee.hoTen} from station "${station}" as Ngã 3 Bến Gỗ/Long Bình Tân (must be in BH03)`);
        benGoLongBinhTanEmployees.push(employee);
      } else {
        otherBHEmployees.push(employee);
      }
    });
    
    console.log(`Dialog - BH Employee classification: Phước Tân=${phuocTanEmployees.length}, Ngã 3 Hãng dầu=${nga3HangDauEmployees.length}, Bến Gỗ/Long Bình Tân=${benGoLongBinhTanEmployees.length}, Other=${otherBHEmployees.length}`);

    const bh01Employees: Registration[] = [];
    const bh02Employees: Registration[] = [];
    const bh03Employees: Registration[] = [];

    const maxEmployeesBH01 = 45;
    const maxEmployeesBH02 = 45;
    const maxEmployeesBH03 = 15;

    // Helper function to add employee to a route if there's space
    const addToRoute = (employee: Registration, route: Registration[], routeName: string): boolean => {
      if (route.includes(employee)) {
        return false; // Already added
      }
      const maxCapacity = routeName === 'BH01' ? maxEmployeesBH01 : routeName === 'BH02' ? maxEmployeesBH02 : maxEmployeesBH03;
      if (route.length < maxCapacity) {
        route.push(employee);
        return true;
      }
      return false; // Route is full
    };
    
    // Helper function to move employee from one route to another
    const moveFromRoute = (employee: Registration, fromRoute: Registration[], toRoute: Registration[], toRouteName: string): boolean => {
      const index = fromRoute.indexOf(employee);
      const maxCapacity = toRouteName === 'BH01' ? maxEmployeesBH01 : toRouteName === 'BH02' ? maxEmployeesBH02 : maxEmployeesBH03;
      if (index >= 0 && toRoute.length < maxCapacity) {
        fromRoute.splice(index, 1);
        toRoute.push(employee);
        return true;
      }
      return false;
    };
    
    // Helper function to check if station is shared between multiple BH routes
    const isSharedBHStation = (station: string): boolean => {
      const stationLower = station.toLowerCase();
      const inBH01 = bh01Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );
      const inBH02 = bh02Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );
      const inBH03 = bh03Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );
      const routeCount = [inBH01, inBH02, inBH03].filter(Boolean).length;
      return routeCount > 1; // Shared if appears in more than one route
    };

    // BƯỚC 1: Gom nhân viên vào BH01 từ các trạm khác (trước khi thêm trạm ưu tiên)
    console.log('Dialog - BH Step 1: Grouping other employees into BH01');
    for (const employee of otherBHEmployees) {
      const station = employee.tramXe || '';
      const stationLower = station.toLowerCase();

      const inBH01 = bh01Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );
      const inBH02 = bh02Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );
      const inBH03 = bh03Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );

      const routeCount = [inBH01, inBH02, inBH03].filter(Boolean).length;
      const shouldAddToBH01 = (inBH01 && inBH02 && inBH03) || (inBH01 && routeCount === 1);

      if (shouldAddToBH01) {
        addToRoute(employee, bh01Employees, 'BH01');
      }
    }
    
    // BƯỚC 2: QUAN TRỌNG - Đảm bảo tất cả nhân viên từ Phước Tân được đưa vào BH01
    // Nếu BH01 đầy, chuyển nhân viên từ trạm chung từ BH01 sang BH02 hoặc BH03 để tạo chỗ trống
    for (const employee of phuocTanEmployees) {
      if (!addToRoute(employee, bh01Employees, 'BH01')) {
        // BH01 is full, cần chuyển nhân viên từ trạm chung từ BH01 sang BH02/BH03 để tạo chỗ trống
        console.log(`Dialog - BH01 is full, moving shared station employees from BH01 to make room for Phước Tân employee ${employee.hoTen}`);
        
        // Tìm nhân viên từ trạm chung trong BH01 để chuyển sang BH02 hoặc BH03
        let moved = false;
        for (let i = bh01Employees.length - 1; i >= 0; i--) {
          const empInBH01 = bh01Employees[i];
          
          // Chỉ chuyển nhân viên từ trạm chung (shared stations)
          if (isSharedBHStation(empInBH01.tramXe || '')) {
            // Ưu tiên chuyển sang BH02 trước
            if (moveFromRoute(empInBH01, bh01Employees, bh02Employees, 'BH02')) {
              console.log(`Dialog - Moved shared station employee ${empInBH01.hoTen} from BH01 to BH02 to make room for Phước Tân`);
              moved = true;
              break;
            } else if (moveFromRoute(empInBH01, bh01Employees, bh03Employees, 'BH03')) {
              console.log(`Dialog - Moved shared station employee ${empInBH01.hoTen} from BH01 to BH03 to make room for Phước Tân`);
              moved = true;
              break;
            }
          }
        }
        
        // Nếu đã chuyển được, thêm nhân viên Phước Tân vào BH01
        if (moved) {
          addToRoute(employee, bh01Employees, 'BH01');
        } else {
          // Nếu không thể chuyển, vẫn thêm vào BH01 (overflow) nhưng log warning
          console.warn(`Dialog - WARNING: Could not make room in BH01 for Phước Tân employee ${employee.hoTen}, adding anyway (overflow)`);
          bh01Employees.push(employee);
        }
      }
    }

    // BƯỚC 3: Gom nhân viên vào BH02 từ nhân viên còn lại (không bao gồm trạm ưu tiên)
    console.log('Dialog - BH Step 3: Grouping remaining employees into BH02');
    for (const employee of otherBHEmployees) {
      if (bh01Employees.includes(employee)) continue;

      const station = employee.tramXe || '';
      const stationLower = station.toLowerCase();

      const inBH02 = bh02Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );
      const inBH03 = bh03Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );

      const routeCount = [inBH02, inBH03].filter(Boolean).length;
      const shouldAddToBH02 = (inBH02 && inBH03) || (inBH02 && routeCount === 1);

      if (shouldAddToBH02) {
        addToRoute(employee, bh02Employees, 'BH02');
      }
    }

    // BƯỚC 4: QUAN TRỌNG - Đảm bảo tất cả nhân viên từ Ngã 3 Hãng dầu và Bến Gỗ/Long Bình Tân được đưa vào BH03
    // Nếu BH03 đầy, chuyển nhân viên từ trạm chung từ BH03 sang BH01 hoặc BH02 để tạo chỗ trống
    const allBH03PriorityEmployees = [...nga3HangDauEmployees, ...benGoLongBinhTanEmployees];
    for (const employee of allBH03PriorityEmployees) {
      if (!addToRoute(employee, bh03Employees, 'BH03')) {
        // BH03 is full, cần chuyển nhân viên từ trạm chung từ BH03 sang BH01 hoặc BH02 để tạo chỗ trống
        console.log(`Dialog - BH03 is full, moving shared station employees from BH03 to make room for priority employee ${employee.hoTen}`);
        
        // Tìm nhân viên từ trạm chung trong BH03 để chuyển sang BH01 hoặc BH02
        let moved = false;
        for (let i = bh03Employees.length - 1; i >= 0; i--) {
          const empInBH03 = bh03Employees[i];
          
          // Chỉ chuyển nhân viên từ trạm chung (shared stations), không chuyển các trạm ưu tiên khác
          if (isSharedBHStation(empInBH03.tramXe || '')) {
            // Ưu tiên chuyển sang BH02 trước
            if (moveFromRoute(empInBH03, bh03Employees, bh02Employees, 'BH02')) {
              console.log(`Dialog - Moved shared station employee ${empInBH03.hoTen} from BH03 to BH02 to make room for priority employee`);
              moved = true;
              break;
            } else if (moveFromRoute(empInBH03, bh03Employees, bh01Employees, 'BH01')) {
              console.log(`Dialog - Moved shared station employee ${empInBH03.hoTen} from BH03 to BH01 to make room for priority employee`);
              moved = true;
              break;
            }
          }
        }
        
        // Nếu đã chuyển được, thêm nhân viên ưu tiên vào BH03
        if (moved) {
          addToRoute(employee, bh03Employees, 'BH03');
        } else {
          // Nếu không thể chuyển, vẫn thêm vào BH03 (overflow) nhưng log warning
          console.warn(`Dialog - WARNING: Could not make room in BH03 for priority employee ${employee.hoTen}, adding anyway (overflow)`);
          bh03Employees.push(employee);
        }
      }
    }

    // BƯỚC 5: Thêm các nhân viên còn lại vào BH03
    console.log('Dialog - BH Step 5: Adding remaining employees to BH03');
    for (const employee of otherBHEmployees) {
      if (bh01Employees.includes(employee) || bh02Employees.includes(employee)) continue;

      const station = employee.tramXe || '';
      const stationLower = station.toLowerCase();

      const inBH03 = bh03Stations.some(s => 
        s.toLowerCase() === stationLower || 
        this.normalizeStationName(s) === this.normalizeStationName(station)
      );

      if (inBH03) {
        addToRoute(employee, bh03Employees, 'BH03');
      }
    }

    console.log(`Dialog - BH distribution: BH01=${bh01Employees.length}, BH02=${bh02Employees.length}, BH03=${bh03Employees.length}`);

    // Update routes
    const updatedRoutes = routes.map(route => {
      if (route.routeName === 'BH01') {
        return { ...route, registrations: bh01Employees };
      }
      if (route.routeName === 'BH02') {
        return { ...route, registrations: bh02Employees };
      }
      if (route.routeName === 'BH03') {
        return { ...route, registrations: bh03Employees };
      }
      return route;
    });

    return updatedRoutes;
  }

  /**
   * Kiểm tra trạm "Phước Tân (Cây xăng Toàn Dung)" (chuẩn hóa trước khi so khớp)
   */
  private isPhuocTanToanDung(station: string): boolean {
    if (!station) return false;
    const normalized = this.normalizeStationName(station);
    const targets = [
      'phuoc tan cay xang toan dung',
      'phuoc tan (cay xang toan dung)',
      'phước tân (cây xăng toàn dung)'
    ].map(s => this.normalizeStationName(s));
    return targets.includes(normalized);
  }
}
