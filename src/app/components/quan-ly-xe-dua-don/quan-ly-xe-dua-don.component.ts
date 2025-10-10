import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SidenavService } from '../../services/sidenav.service';
import { FirestoreService } from '../../services/firestore.service';
import { XeDuaDon, LoaiXe } from '../../models/vehicle.model';
import { NhaXe } from '../../models/garage.model';
import { XeDuaDonFormDialogComponent } from './xe-dua-don-form-dialog/xe-dua-don-form-dialog.component';
import { StationAssignmentDialogComponent } from './station-assignment-dialog/station-assignment-dialog.component';
import { StationAssignmentPdfExportService } from '../../services/station-assignment-pdf-export.service';
import { DriverInfo, StationAssignment, PDFExportData } from '../../models/vehicle.model';

@Component({
  selector: 'app-quan-ly-xe-dua-don',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    MatSelectModule,
    MatOptionModule,
    MatSidenavModule,
    MatListModule,
    MatTooltipModule
  ],
  templateUrl: './quan-ly-xe-dua-don.component.html',
  styleUrl: './quan-ly-xe-dua-don.component.css'
})
export class QuanLyXeDuaDonComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  // Table data
  dataSource = new MatTableDataSource<XeDuaDon>([]);
  displayedColumns: string[] = [
    'select',
    'MaXe',
    'BienSoXe', 
    'TenTaiXe', 
    'SoDienThoaiTaiXe', 
    'LoaiXe',
    'GhiChu',
    'actions'
  ];
  
  selectedXeDuaDon = new Set<string>();
  isCollapsed = false;
  searchTerm = '';
  selectedLoaiXe = '';

  // LoaiXe options
  loaiXeOptions = [
    { value: LoaiXe.XE_16_CHO, label: 'Xe 16 chỗ' },
    { value: LoaiXe.XE_29_CHO, label: 'Xe 29 chỗ' },
    { value: LoaiXe.XE_45_CHO, label: 'Xe 45 chỗ' },
    { value: LoaiXe.XE_TAXI_7_CHO, label: 'Xe taxi 7 chỗ' }
  ];

  // NhaXe options
  nhaXeOptions: { value: string; label: string }[] = [];

  constructor(
    private sidenavService: SidenavService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private firestoreService: FirestoreService,
    private stationAssignmentPdfExportService: StationAssignmentPdfExportService
  ) {}

  toggleSidenav(): void {
    this.isCollapsed = !this.isCollapsed;
    this.sidenavService.toggle();
  }

  ngOnInit(): void {
    console.log('QuanLyXeDuaDonComponent initialized successfully!');
    this.loadDataFromFirebase();
    this.loadNhaXeOptions();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  // ==================== FIREBASE INTEGRATION ====================
  
  /**
   * Load nha xe options from Firebase
   */
  private async loadNhaXeOptions(): Promise<void> {
    try {
      const nhaXeList = await this.firestoreService.getAllNhaXe();
      this.nhaXeOptions = nhaXeList.map(nhaXe => ({
        value: nhaXe.MaNhaXe,
        label: nhaXe.TenNhaXe
      }));
      console.log('Loaded nha xe options:', this.nhaXeOptions);
    } catch (error) {
      console.error('Error loading nha xe options:', error);
      this.nhaXeOptions = [];
    }
  }

  /**
   * Load data from Firebase and update the table
   */
  async loadDataFromFirebase(): Promise<void> {
    try {
      const xeDuaDonList = await this.firestoreService.getAllXeDuaDon();
      
      console.log('Raw data from Firebase:', xeDuaDonList);
      
      if (!xeDuaDonList || xeDuaDonList.length === 0) {
        console.log('No data found in Firebase, using empty array');
        this.dataSource.data = [];
        return;
      }
      
      this.dataSource.data = xeDuaDonList;
      console.log(`Loaded ${xeDuaDonList.length} xe dua don from Firebase`);
    } catch (error) {
      console.error('Error loading data from Firebase:', error);
      this.dataSource.data = [];
      this.snackBar.open('Có lỗi xảy ra khi tải dữ liệu từ Firebase!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  // ==================== CRUD OPERATIONS ====================
  
  /**
   * Open add xe dua don dialog
   */
  openAddXeDuaDonDialog(): void {
    const dialogRef = this.dialog.open(XeDuaDonFormDialogComponent, {
      width: '1000px',
      data: {
        loaiXeOptions: this.loaiXeOptions,
        nhaXeOptions: this.nhaXeOptions
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addXeDuaDon(result);
      }
    });
  }

  openFileUploadDialog(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.snackBar.open('Tính năng import từ Excel sẽ được phát triển trong phiên bản tiếp theo', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    };
    input.click();
  }

  /**
   * Add new xe dua don to Firebase
   */
  private async addXeDuaDon(xeDuaDonData: Omit<XeDuaDon, 'MaXe' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const xeId = await this.firestoreService.createXeDuaDon(xeDuaDonData);
      
      // Reload data from Firebase
      await this.loadDataFromFirebase();
      
      this.snackBar.open('Thêm xe đưa đón thành công!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error adding xe dua don:', error);
      this.snackBar.open('Có lỗi xảy ra khi thêm xe đưa đón!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Edit xe dua don
   */
  editXeDuaDon(xeDuaDon: XeDuaDon): void {
    const dialogRef = this.dialog.open(XeDuaDonFormDialogComponent, {
      width: '800px',
      data: {
        xeDuaDon: xeDuaDon,
        loaiXeOptions: this.loaiXeOptions,
        nhaXeOptions: this.nhaXeOptions
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateXeDuaDon(xeDuaDon.MaXe, result);
      }
    });
  }

  /**
   * Update xe dua don in Firebase
   */
  private async updateXeDuaDon(maXe: string, updateData: Partial<Omit<XeDuaDon, 'MaXe' | 'createdAt'>>): Promise<void> {
    try {
      await this.firestoreService.updateXeDuaDon(maXe, updateData);
      
      // Reload data from Firebase
      await this.loadDataFromFirebase();
      
      this.snackBar.open('Cập nhật xe đưa đón thành công!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error updating xe dua don:', error);
      this.snackBar.open('Có lỗi xảy ra khi cập nhật xe đưa đón!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Delete xe dua don
   */
  deleteXeDuaDon(xeDuaDon: XeDuaDon): void {
    if (confirm(`Bạn có chắc chắn muốn xóa xe đưa đón ${xeDuaDon.BienSoXe}?`)) {
      this.performDeleteXeDuaDon(xeDuaDon.MaXe);
    }
  }

  /**
   * Perform delete xe dua don from Firebase
   */
  private async performDeleteXeDuaDon(maXe: string): Promise<void> {
    try {
      await this.firestoreService.deleteXeDuaDon(maXe);
      
      // Reload data from Firebase
      await this.loadDataFromFirebase();
      
      this.snackBar.open('Xóa xe đưa đón thành công!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error deleting xe dua don:', error);
      this.snackBar.open('Có lỗi xảy ra khi xóa xe đưa đón!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  // ==================== SELECTION METHODS ====================
  
  isAllSelected(): boolean {
    return this.dataSource.data.length > 0 && this.selectedXeDuaDon.size === this.dataSource.data.length;
  }

  isIndeterminate(): boolean {
    return this.selectedXeDuaDon.size > 0 && this.selectedXeDuaDon.size < this.dataSource.data.length;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selectedXeDuaDon.clear();
    } else {
      this.dataSource.data.forEach(xe => this.selectedXeDuaDon.add(xe.MaXe));
    }
  }

  toggleSelection(xeDuaDon: XeDuaDon): void {
    if (this.selectedXeDuaDon.has(xeDuaDon.MaXe)) {
      this.selectedXeDuaDon.delete(xeDuaDon.MaXe);
    } else {
      this.selectedXeDuaDon.add(xeDuaDon.MaXe);
    }
  }

  isSelected(xeDuaDon: XeDuaDon): boolean {
    return this.selectedXeDuaDon.has(xeDuaDon.MaXe);
  }

  getSelectedCount(): number {
    return this.selectedXeDuaDon.size;
  }

  checkboxLabel(): string {
    return 'Chọn tất cả';
  }

  // ==================== FILTER METHODS ====================
  
  /**
   * Apply search filter
   */
  applyFilter(): void {
    this.dataSource.filter = this.searchTerm.trim().toLowerCase();
  }

  /**
   * Apply loai xe filter
   */
  applyLoaiXeFilter(): void {
    if (this.selectedLoaiXe) {
      this.dataSource.filterPredicate = (data: XeDuaDon, filter: string) => {
        return data.LoaiXe === this.selectedLoaiXe;
      };
      this.dataSource.filter = this.selectedLoaiXe;
    } else {
      this.dataSource.filterPredicate = (data: XeDuaDon, filter: string) => {
        return data.BienSoXe.toLowerCase().includes(filter) ||
               data.TenTaiXe.toLowerCase().includes(filter) ||
               data.SoDienThoaiTaiXe.toLowerCase().includes(filter);
      };
      this.dataSource.filter = this.searchTerm.trim().toLowerCase();
    }
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedLoaiXe = '';
    this.dataSource.filter = '';
    this.dataSource.filterPredicate = (data: XeDuaDon, filter: string) => {
      return data.BienSoXe.toLowerCase().includes(filter) ||
             data.TenTaiXe.toLowerCase().includes(filter) ||
             data.SoDienThoaiTaiXe.toLowerCase().includes(filter);
    };
  }

  /**
   * Delete selected xe dua don
   */
  deleteSelected(): void {
    if (this.selectedXeDuaDon.size === 0) {
      this.snackBar.open('Vui lòng chọn xe đưa đón cần xóa!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa ${this.selectedXeDuaDon.size} xe đưa đón đã chọn?`)) {
      this.performDeleteSelected();
    }
  }

  /**
   * Perform delete selected xe dua don
   */
  private async performDeleteSelected(): Promise<void> {
    const deletePromises = Array.from(this.selectedXeDuaDon).map(maXe => 
      this.firestoreService.deleteXeDuaDon(maXe)
    );

    try {
      await Promise.all(deletePromises);
      
      // Clear selection
      this.selectedXeDuaDon.clear();
      
      // Reload data from Firebase
      await this.loadDataFromFirebase();
      
      this.snackBar.open(`Đã xóa ${deletePromises.length} xe đưa đón thành công!`, 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error deleting selected xe dua don:', error);
      this.snackBar.open('Có lỗi xảy ra khi xóa xe đưa đón đã chọn!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  // ==================== HELPER METHODS ====================
  
  /**
   * Get CSS class for loai xe badge
   */
  getLoaiXeClass(loaiXe: string): string {
    const classMap: { [key: string]: string } = {
      [LoaiXe.XE_4_CHO]: 'loai-xe-4-cho',
      [LoaiXe.XE_7_CHO]: 'loai-xe-7-cho',
      [LoaiXe.XE_16_CHO]: 'loai-xe-16-cho',
      [LoaiXe.XE_29_CHO]: 'loai-xe-29-cho',
      [LoaiXe.XE_45_CHO]: 'loai-xe-45-cho',
      [LoaiXe.XE_TAXI_7_CHO]: 'loai-xe-taxi-7-cho'
    };
    
    return classMap[loaiXe] || 'loai-xe-default';
  }

  /**
   * Get icon for loai xe in form dialog
   */
  getLoaiXeIcon(loaiXe: LoaiXe): string {
    const iconMap: { [key: string]: string } = {
      [LoaiXe.XE_4_CHO]: 'directions_car',
      [LoaiXe.XE_7_CHO]: 'local_taxi',
      [LoaiXe.XE_16_CHO]: 'airport_shuttle',
      [LoaiXe.XE_29_CHO]: 'directions_bus',
      [LoaiXe.XE_45_CHO]: 'directions_bus',
      [LoaiXe.XE_TAXI_7_CHO]: 'local_taxi'
    };
    
    return iconMap[loaiXe] || 'directions_car';
  }

  // ==================== PDF EXPORT METHODS ====================

  /**
   * Open station assignment dialog for PDF export
   */
  async openStationAssignmentDialog(): Promise<void> {
    try {
      // Generate mock data for demonstration
      // In real implementation, you would fetch this from Firebase
      const mockStations = this.stationAssignmentPdfExportService.generateMockStations();
      const mockDrivers = this.stationAssignmentPdfExportService.generateMockDrivers();
      const vehicles = this.dataSource.data;

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
          stations: mockStations,
          vehicles: vehicles,
          drivers: mockDrivers
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
    }
  }
}
