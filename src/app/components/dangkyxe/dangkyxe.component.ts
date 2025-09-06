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
import { SidenavService } from '../../services/sidenav.service';
import { RegistrationFormDialogComponent } from './registration-form-dialog/registration-form-dialog.component';
import { UploadInstructionsDialogComponent } from './upload-instructions-dialog/upload-instructions-dialog.component';
import { DirectUploadDialogComponent } from './direct-upload-dialog/direct-upload-dialog.component';
import { RealUploadDialogComponent } from './real-upload-dialog/real-upload-dialog.component';
import { Registration } from '../../models/registration.model';
import { GoogleDriveService } from '../../services/google-drive.service';
import { GoogleDriveSimpleService } from '../../services/google-drive-simple.service';
import { GoogleDriveDirectService } from '../../services/google-drive-direct.service';
import { GoogleDriveUploadService } from '../../services/google-drive-upload.service';
import { GoogleDriveRealService } from '../../services/google-drive-real.service';
import { GoogleDriveDirectUploadService } from '../../services/google-drive-direct-upload.service';
import { GoogleDriveRealUploadService } from '../../services/google-drive-real-upload.service';
import { GoogleDriveSimpleUploadService } from '../../services/google-drive-simple-upload.service';
import { GoogleDriveWebUploadService } from '../../services/google-drive-web-upload.service';
import { ExcelService } from '../../services/excel.service';
import { VersionService } from '../../services/version.service';

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
    MatMenuModule
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
    'maTuyenXe', 
    'actions'
  ];
  
  selectedRegistrations = new Set<number>();
  buildInfo = '';

  constructor(
    private sidenavService: SidenavService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private googleDriveService: GoogleDriveService,
    private googleDriveSimpleService: GoogleDriveSimpleService,
    private googleDriveDirectService: GoogleDriveDirectService,
    private googleDriveUploadService: GoogleDriveUploadService,
    private googleDriveRealService: GoogleDriveRealService,
    private googleDriveDirectUploadService: GoogleDriveDirectUploadService,
    private googleDriveRealUploadService: GoogleDriveRealUploadService,
    private googleDriveSimpleUploadService: GoogleDriveSimpleUploadService,
    private googleDriveWebUploadService: GoogleDriveWebUploadService,
    private excelService: ExcelService,
    private versionService: VersionService
  ) {}

  toggleSidenav(): void {
    this.sidenavService.toggle();
  }

  ngOnInit(): void {
    console.log('Component initialized successfully!');
    this.loadMockData();
    this.buildInfo = this.versionService.getBuildInfo();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const newRegistration: Registration = {
          id: this.dataSource.data.length + 1,
          ...result,
          phongBan: this.getDepartments().find(d => d.value === result.phongBan)?.label || result.phongBan,
          maTuyenXe: this.getRoutes().find(r => r.value === result.maTuyenXe)?.label || result.maTuyenXe
        };
        this.dataSource.data = [...this.dataSource.data, newRegistration];
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

  // File upload for Google Drive only
  openFileUploadForDrive(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.uploadToGoogleDrive(file);
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
      
      // Show loading message
      const loadingSnackBar = this.snackBar.open('Đang xử lý file Excel...', 'Đóng', {
        duration: 0, // Keep open until dismissed
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });

      // Read and process Excel file
      const registrations = await this.excelService.readExcelFile(file);
      console.log('Excel data processed:', registrations);

      // Add new registrations to the table
      if (registrations.length > 0) {
        const newData = [...this.dataSource.data, ...registrations];
        this.dataSource.data = newData;
        
        // Dismiss loading message
        loadingSnackBar.dismiss();
        
        // Show success message and offer to upload to Google Drive
        const snackBarRef = this.snackBar.open(
          `Đã import ${registrations.length} đăng ký từ Excel! Bạn có muốn upload file lên Google Drive không?`, 
          'Upload lên Google Drive', 
          {
            duration: 8000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          }
        );
        
        snackBarRef.onAction().subscribe(() => {
          this.uploadToGoogleDrive(file);
        });
      } else {
        loadingSnackBar.dismiss();
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
    }
  }

  // CRUD operations
  editRegistration(registration: Registration): void {
    const dialogRef = this.dialog.open(RegistrationFormDialogComponent, {
      width: '800px',
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
          this.dataSource.data[index] = { ...registration, ...result };
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
      const index = this.dataSource.data.findIndex(r => r.id === registration.id);
      if (index !== -1) {
        this.dataSource.data.splice(index, 1);
        this.dataSource.data = [...this.dataSource.data];
        this.selectedRegistrations.delete(registration.id);
        this.snackBar.open('Đăng ký đã được xóa thành công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
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

  // Excel template download
  downloadExcelTemplate(): void {
    try {
      const templateBlob = this.excelService.generateExcelTemplate();
      const url = window.URL.createObjectURL(templateBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_dang_ky_xe.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      this.snackBar.open('Template Excel đã được tải xuống!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      this.snackBar.open('Lỗi khi tải template Excel!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }
}
