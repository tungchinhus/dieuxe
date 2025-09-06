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
import { Registration } from '../../models/registration.model';

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

  constructor(
    private sidenavService: SidenavService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  toggleSidenav(): void {
    this.sidenavService.toggle();
  }

  ngOnInit(): void {
    console.log('Component initialized successfully!');
    this.loadMockData();
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

  private handleFileUpload(file: File): void {
    console.log('File selected:', file.name);
    this.snackBar.open(`File ${file.name} đã được chọn!`, 'Đóng', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
    // TODO: Implement actual file processing logic here
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
}
