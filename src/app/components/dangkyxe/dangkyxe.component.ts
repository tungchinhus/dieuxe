import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { Registration } from '../../models/registration.model';
import { GoogleDriveUploadService } from '../../services/google-drive-upload.service';
import { GoogleDriveWebUploadService } from '../../services/google-drive-web-upload.service';
import { ExcelService } from '../../services/excel.service';
import { VersionService } from '../../services/version.service';
import { VehicleDataService } from '../../services/vehicle-data.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { PdfExportEmployeeStationService } from '../../services/pdf-export-employee-station.service';
import { DangKyPhanXe, LoaiCa, PhongBan } from '../../models/vehicle.model';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatTooltipModule
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
  
  selectedRegistrations = new Set<number>();
  buildInfo = '';
  isCollapsed = false;
  
  // Loading states
  isImportingExcel = false;
  isExportingPDF = false;
  isExportingEmployeeStationPDF = false;

  constructor(
    private sidenavService: SidenavService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private googleDriveUploadService: GoogleDriveUploadService,
    private googleDriveWebUploadService: GoogleDriveWebUploadService,
    private excelService: ExcelService,
    private versionService: VersionService,
    private vehicleDataService: VehicleDataService,
    private pdfExportService: PdfExportService,
    private pdfExportEmployeeStationService: PdfExportEmployeeStationService
  ) {}

  toggleSidenav(): void {
    this.isCollapsed = !this.isCollapsed;
    this.sidenavService.toggle();
  }

  ngOnInit(): void {
    console.log('Component initialized successfully!');
    this.loadDataFromFirebase(); // Load data from Firebase instead of mock data
    this.buildInfo = this.versionService.getBuildInfo();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Apply filter to the data source for quick search
   * @param filterValue - The search term
   */
  applyFilter(filterValue: string): void {
    // Remove extra spaces and convert to lowercase
    const searchTerm = filterValue.trim().toLowerCase();
    
    // Set up custom filter predicate for searching in hoTen and tramXe
    this.dataSource.filterPredicate = (data: Registration, filter: string) => {
      if (!filter) return true;
      
      const searchData = filter.toLowerCase();
      
      // Search in hoTen (employee name)
      const hoTenMatch = data.hoTen?.toLowerCase().includes(searchData) || false;
      
      // Search in tramXe (station)
      const tramXeMatch = data.tramXe?.toLowerCase().includes(searchData) || false;
      
      // Search in maNhanVien (employee code) for additional functionality
      const maNhanVienMatch = data.maNhanVien?.toLowerCase().includes(searchData) || false;
      
      // Search in dienThoai (phone) for additional functionality
      const dienThoaiMatch = data.dienThoai?.toLowerCase().includes(searchData) || false;
      
      return hoTenMatch || tramXeMatch || maNhanVienMatch || dienThoaiMatch;
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
    this.dataSource.filter = '';
    
    // Reset to first page
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
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
        id: i,
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
        const isDuplicate = await this.checkDuplicateNameAndStation(result.hoTen, result.tramXe, result.ngayDangKy);
        
        if (isDuplicate) {
          this.snackBar.open(
            `Không thể thêm: ${result.hoTen} đã đăng ký tại trạm ${result.tramXe} cho ngày ${result.ngayDangKy}`, 
            'Đóng', 
            {
              duration: 5000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            }
          );
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
        await this.vehicleDataService.dangKyPhanXe(dangKyPhanXe);
        
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
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.handleFileUpload(file);
      }
    };
    input.click();
  }

  // Direct upload to Google Drive - one click upload
  async uploadToGoogleDrive(file: File): Promise<void> {
    try {
      // Show loading message
      const loadingSnackBar = this.snackBar.open('Đang upload file lên Google Drive...', 'Đóng', {
        duration: 0,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });

      // Use web upload service
      const uploadResult = await this.googleDriveWebUploadService.uploadFileToDrive(file, file.name);
      
      loadingSnackBar.dismiss();
      
      if (uploadResult.success) {
        // Show success message and open Google Drive
        const snackBarRef = this.snackBar.open(
          `File "${file.name}" đã được upload thành công lên Google Drive!`, 
          'Mở Google Drive', 
          {
            duration: 5000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          }
        );
        
        snackBarRef.onAction().subscribe(() => {
          // Open Google Drive folder
          this.googleDriveWebUploadService.openFolderInNewTab();
        });
      } else {
        // Show error message
        this.snackBar.open(
          'Có lỗi xảy ra khi upload. Vui lòng thử lại.', 
          'Thử lại', 
          {
            duration: 5000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          }
        ).onAction().subscribe(() => {
          this.uploadToGoogleDrive(file);
        });
      }

    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      
      // Check if it's a CSP error
      const errorMessage = error instanceof Error ? error.message : String(error);
      let userMessage = 'Có lỗi xảy ra khi upload. Vui lòng thử lại.';
      
      if (errorMessage.includes('CSP') || errorMessage.includes('Content Security Policy')) {
        userMessage = 'Lỗi bảo mật: Vui lòng kiểm tra cài đặt CSP và thử lại.';
      } else if (errorMessage.includes('Failed to load Google API script')) {
        userMessage = 'Không thể tải Google API. Vui lòng kiểm tra kết nối mạng và thử lại.';
      }
      
      // Show error message
      this.snackBar.open(
        userMessage, 
        'Thử lại', 
        {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        }
      ).onAction().subscribe(() => {
        this.uploadToGoogleDrive(file);
      });
    }
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

  // Show upload instructions based on result
  private showUploadInstructions(uploadResult: any): void {
    const snackBarRef = this.snackBar.open(
      uploadResult.message, 
      'Mở Google Drive', 
      {
        duration: 8000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      }
    );
    
    snackBarRef.onAction().subscribe(() => {
      // Open Google Drive folder
      this.googleDriveUploadService.openFolderInNewTab();
      
      // Download the file if available
      if (uploadResult.downloadUrl) {
        this.googleDriveUploadService.downloadFile(new File([uploadResult.downloadUrl], uploadResult.fileName));
      }
    });
  }

  // Show manual upload instructions
  private showManualUploadInstructions(file: File): void {
    const snackBarRef = this.snackBar.open(
      `File "${file.name}" đã sẵn sàng để upload thủ công lên Google Drive!`, 
      'Mở Google Drive', 
      {
        duration: 8000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      }
    );
    
    snackBarRef.onAction().subscribe(() => {
      // Open Google Drive folder
      this.googleDriveUploadService.openFolderInNewTab();
      
      // Download the file for user to upload
      this.googleDriveUploadService.downloadFile(file);
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
            const savedCount = await this.saveRegistrationsToFirebase(duplicateCheck.validData);
            
            if (savedCount > 0) {
              // Refresh data from Firebase
              await this.loadDataFromFirebase();
            }
          }

          dialogRef.afterClosed().subscribe(async (result) => {
            // Dialog closed - no additional notification needed
            // The dialog already shows all the necessary information
          });
        } else {
          // No duplicates, save all data
          const savedCount = await this.saveRegistrationsToFirebase(registrations);
          
          if (savedCount > 0) {
            // Refresh data from Firebase
            await this.loadDataFromFirebase();
            
            // Show success message
            const snackBarRef = this.snackBar.open(
              `Đã import và lưu ${savedCount}/${registrations.length} đăng ký vào hệ thống!`, 
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
          // Find the Firebase ID for this registration
          const firebaseId = await this.findFirebaseIdForRegistration(registration);
          if (firebaseId) {
            await this.vehicleDataService.huyDangKyPhanXe(firebaseId);
            deletedCount++;
          } else {
            errors.push(`Không tìm thấy ID Firebase cho đăng ký ${registration.maNhanVien}`);
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
  private async saveRegistrationsToFirebase(registrations: Registration[], allowOverwrite: boolean = false): Promise<number> {
    let savedCount = 0;
    const duplicateErrors: string[] = [];
    
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
          MaTuyenXe: reg.maTuyenXe || ''
        };

        // Debug: Log the conversion
        console.log(`Converting registration for ${reg.maNhanVien}:`);
        console.log(`  Original: ThoiGianBatDau="${reg.thoiGianBatDau}", ThoiGianKetThuc="${reg.thoiGianKetThuc}"`);
        console.log(`  Converted: ThoiGianBatDau="${dangKyPhanXe.ThoiGianBatDau}", ThoiGianKetThuc="${dangKyPhanXe.ThoiGianKetThuc}"`);

        // Validate data before saving
        const errors = this.vehicleDataService.validateDangKyPhanXe(dangKyPhanXe);
        if (errors.length > 0) {
          console.warn(`Validation errors for ${reg.maNhanVien}:`, errors);
          continue;
        }

        // Check for duplicate name and station
        const isDuplicate = await this.checkDuplicateNameAndStation(reg.hoTen, reg.tramXe, reg.ngayDangKy);
        
        if (isDuplicate && !allowOverwrite) {
          console.warn(`Duplicate found: ${reg.hoTen} at ${reg.tramXe} for ${reg.ngayDangKy}`);
          duplicateErrors.push(`${reg.hoTen} - đã đăng ký tại trạm ${reg.tramXe} cho ngày ${reg.ngayDangKy}`);
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
            }
          }
        }

        // Save to Firebase
        await this.vehicleDataService.dangKyPhanXe(dangKyPhanXe);
        savedCount++;
        
      } catch (error) {
        console.error(`Error saving registration for ${reg.maNhanVien}:`, error);
        continue;
      }
    }
    
    // Show duplicate errors if any (only when not allowing overwrite)
    if (duplicateErrors.length > 0 && !allowOverwrite) {
      this.snackBar.open(
        `Có ${duplicateErrors.length} đăng ký bị trùng lặp và đã bỏ qua:\n${duplicateErrors.join('\n')}`, 
        'Đóng', 
        {
          duration: 8000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        }
      );
    }
    
    return savedCount;
  }

  /**
   * Load data from Firebase and update the table - only for today's date
   */
  async loadDataFromFirebase(): Promise<void> {
    try {
      const dangKyList = await this.vehicleDataService.layDanhSachDangKyPhanXe();
      
      console.log('Raw data from Firebase:', dangKyList);
      
      if (!dangKyList || dangKyList.length === 0) {
        console.log('No data found in Firebase, using empty array');
        this.dataSource.data = [];
        return;
      }
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      console.log('Filtering data for today:', todayString);
      
      // Filter data to only include today's registrations
      const todayRegistrations = dangKyList.filter(dangKy => {
        if (!dangKy.NgayDangKy) return false;
        const registrationDate = dangKy.NgayDangKy.toISOString().split('T')[0];
        return registrationDate === todayString;
      });
      
      console.log(`Found ${todayRegistrations.length} registrations for today out of ${dangKyList.length} total`);
      
      // Convert DangKyPhanXe to Registration format for display
      const registrations: Registration[] = todayRegistrations.map((dangKy, index) => {
        console.log(`Processing item ${index}:`, {
          ID: dangKy.ID,
          MaNhanVien: dangKy.MaNhanVien,
          HoTen: dangKy.HoTen,
          DienThoai: dangKy.DienThoai
        });
        
        return {
          id: parseInt(dangKy.ID || (index + 1).toString()),
          maNhanVien: dangKy.MaNhanVien || '',
          hoTen: dangKy.HoTen || '',
          dienThoai: dangKy.DienThoai || '',
          phongBan: '', // Remove phongBan field
          ngayDangKy: dangKy.NgayDangKy ? dangKy.NgayDangKy.toISOString().split('T')[0] : '',
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
      this.dataSource.data = registrations;
      console.log(`Loaded ${registrations.length} registrations for today from Firebase`);
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
      // Get today's date
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      
      // CHỈ CHECK DUPLICATE CHO NGÀY HÔM NAY
      // Nếu ngày đăng ký không phải hôm nay, coi như không trùng lặp
      if (ngayDangKy !== todayString) {
        return false;
      }
      
      const allRegistrations = await this.vehicleDataService.layDanhSachDangKyPhanXe();
      
      return allRegistrations.some(reg => 
        reg.HoTen?.toLowerCase().trim() === hoTen?.toLowerCase().trim() && 
        reg.TramXe?.toLowerCase().trim() === tramXe?.toLowerCase().trim() && 
        reg.NgayDangKy.toISOString().split('T')[0] === ngayDangKy
      );
    } catch (error) {
      console.error('Error checking duplicate name and station:', error);
      return false;
    }
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
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    // Get existing registrations from Firebase for today only
    const allRegistrations = await this.vehicleDataService.layDanhSachDangKyPhanXe();
    const existingRegistrations = allRegistrations.filter(reg => 
      reg.NgayDangKy.toISOString().split('T')[0] === todayString
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
   * Export registrations to PDF
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

      // Export to PDF
      await this.pdfExportService.exportToPDF();
      
      // Show success message
      this.snackBar.open('File PDF đã được tạo thành công!', 'Đóng', {
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
    } finally {
      // Reset loading state
      this.isExportingPDF = false;
    }
  }

  /**
   * Export employee station PDF
   */
  async exportEmployeeStationPDF(): Promise<void> {
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
  }
}
