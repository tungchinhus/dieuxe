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
import { NhaXe, TrangThaiNhaXe } from '../../models/garage.model';
import { NhaXeFormDialogComponent } from './nha-xe-form-dialog/nha-xe-form-dialog.component';

@Component({
  selector: 'app-quan-ly-nha-xe',
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
  templateUrl: './quan-ly-nha-xe.component.html',
  styleUrl: './quan-ly-nha-xe.component.css'
})
export class QuanLyNhaXeComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  // Table data
  dataSource = new MatTableDataSource<NhaXe>([]);
  displayedColumns: string[] = [
    'select',
    'TenNhaXe', 
    'DiaChi', 
    'SoDienThoai', 
    'NguoiDaiDien',
    'TrangThai',
    'actions'
  ];
  
  selectedNhaXe = new Set<string>();
  isCollapsed = false;
  searchTerm = '';
  selectedTrangThai = '';

  // TrangThai options
  trangThaiOptions = [
    { value: TrangThaiNhaXe.HOAT_DONG, label: 'Hoạt động' },
    { value: TrangThaiNhaXe.TAM_DUNG, label: 'Tạm dừng' },
    { value: TrangThaiNhaXe.NGUNG_HOAT_DONG, label: 'Ngừng hoạt động' }
  ];

  constructor(
    private sidenavService: SidenavService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private firestoreService: FirestoreService
  ) {}

  toggleSidenav(): void {
    this.isCollapsed = !this.isCollapsed;
    this.sidenavService.toggle();
  }

  ngOnInit(): void {
    console.log('QuanLyNhaXeComponent initialized successfully!');
    this.loadDataFromFirebase();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  // ==================== FIREBASE INTEGRATION ====================
  
  /**
   * Load data from Firebase and update the table
   */
  async loadDataFromFirebase(): Promise<void> {
    try {
      const nhaXeList = await this.firestoreService.getAllNhaXe();
      
      console.log('Raw data from Firebase:', nhaXeList);
      
      if (!nhaXeList || nhaXeList.length === 0) {
        console.log('No data found in Firebase, using empty array');
        this.dataSource.data = [];
        return;
      }
      
      this.dataSource.data = nhaXeList;
      console.log(`Loaded ${nhaXeList.length} nha xe from Firebase`);
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
   * Open add nha xe dialog
   */
  openAddNhaXeDialog(): void {
    const dialogRef = this.dialog.open(NhaXeFormDialogComponent, {
      width: '1000px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addNhaXe(result);
      }
    });
  }

  /**
   * Add new nha xe to Firebase
   */
  private async addNhaXe(nhaXeData: Omit<NhaXe, 'MaNhaXe' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const nhaXeId = await this.firestoreService.createNhaXe(nhaXeData);
      
      // Reload data from Firebase
      await this.loadDataFromFirebase();
      
      this.snackBar.open('Thêm nhà xe thành công!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error adding nha xe:', error);
      this.snackBar.open('Có lỗi xảy ra khi thêm nhà xe!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Edit nha xe
   */
  editNhaXe(nhaXe: NhaXe): void {
    const dialogRef = this.dialog.open(NhaXeFormDialogComponent, {
      width: '800px',
      data: {
        nhaXe: nhaXe
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateNhaXe(nhaXe.MaNhaXe, result);
      }
    });
  }

  /**
   * Update nha xe in Firebase
   */
  private async updateNhaXe(maNhaXe: string, updateData: Partial<Omit<NhaXe, 'MaNhaXe' | 'createdAt'>>): Promise<void> {
    try {
      await this.firestoreService.updateNhaXe(maNhaXe, updateData);
      
      // Reload data from Firebase
      await this.loadDataFromFirebase();
      
      this.snackBar.open('Cập nhật nhà xe thành công!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error updating nha xe:', error);
      this.snackBar.open('Có lỗi xảy ra khi cập nhật nhà xe!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Delete nha xe
   */
  deleteNhaXe(nhaXe: NhaXe): void {
    if (confirm(`Bạn có chắc chắn muốn xóa nhà xe ${nhaXe.TenNhaXe}?`)) {
      this.performDeleteNhaXe(nhaXe.MaNhaXe);
    }
  }

  /**
   * Perform delete nha xe from Firebase
   */
  private async performDeleteNhaXe(maNhaXe: string): Promise<void> {
    try {
      await this.firestoreService.deleteNhaXe(maNhaXe);
      
      // Reload data from Firebase
      await this.loadDataFromFirebase();
      
      this.snackBar.open('Xóa nhà xe thành công!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error deleting nha xe:', error);
      this.snackBar.open('Có lỗi xảy ra khi xóa nhà xe!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  // ==================== SELECTION METHODS ====================
  
  isAllSelected(): boolean {
    return this.dataSource.data.length > 0 && this.selectedNhaXe.size === this.dataSource.data.length;
  }

  isIndeterminate(): boolean {
    return this.selectedNhaXe.size > 0 && this.selectedNhaXe.size < this.dataSource.data.length;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selectedNhaXe.clear();
    } else {
      this.dataSource.data.forEach(nhaXe => this.selectedNhaXe.add(nhaXe.MaNhaXe));
    }
  }

  toggleSelection(nhaXe: NhaXe): void {
    if (this.selectedNhaXe.has(nhaXe.MaNhaXe)) {
      this.selectedNhaXe.delete(nhaXe.MaNhaXe);
    } else {
      this.selectedNhaXe.add(nhaXe.MaNhaXe);
    }
  }

  isSelected(nhaXe: NhaXe): boolean {
    return this.selectedNhaXe.has(nhaXe.MaNhaXe);
  }

  getSelectedCount(): number {
    return this.selectedNhaXe.size;
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
   * Apply trang thai filter
   */
  applyTrangThaiFilter(): void {
    if (this.selectedTrangThai) {
      this.dataSource.filterPredicate = (data: NhaXe, filter: string) => {
        return data.TrangThai === this.selectedTrangThai;
      };
      this.dataSource.filter = this.selectedTrangThai;
    } else {
      this.dataSource.filterPredicate = (data: NhaXe, filter: string) => {
        return data.TenNhaXe.toLowerCase().includes(filter) ||
               data.DiaChi.toLowerCase().includes(filter) ||
               data.SoDienThoai.toLowerCase().includes(filter) ||
               data.NguoiDaiDien.toLowerCase().includes(filter);
      };
      this.dataSource.filter = this.searchTerm.trim().toLowerCase();
    }
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedTrangThai = '';
    this.dataSource.filter = '';
    this.dataSource.filterPredicate = (data: NhaXe, filter: string) => {
      return data.TenNhaXe.toLowerCase().includes(filter) ||
             data.DiaChi.toLowerCase().includes(filter) ||
             data.SoDienThoai.toLowerCase().includes(filter) ||
             data.NguoiDaiDien.toLowerCase().includes(filter);
    };
  }

  /**
   * Delete selected nha xe
   */
  deleteSelected(): void {
    if (this.selectedNhaXe.size === 0) {
      this.snackBar.open('Vui lòng chọn nhà xe cần xóa!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa ${this.selectedNhaXe.size} nhà xe đã chọn?`)) {
      this.performDeleteSelected();
    }
  }

  /**
   * Perform delete selected nha xe
   */
  private async performDeleteSelected(): Promise<void> {
    const deletePromises = Array.from(this.selectedNhaXe).map(maNhaXe => 
      this.firestoreService.deleteNhaXe(maNhaXe)
    );

    try {
      await Promise.all(deletePromises);
      
      // Clear selection
      this.selectedNhaXe.clear();
      
      // Reload data from Firebase
      await this.loadDataFromFirebase();
      
      this.snackBar.open(`Đã xóa ${deletePromises.length} nhà xe thành công!`, 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error deleting selected nha xe:', error);
      this.snackBar.open('Có lỗi xảy ra khi xóa nhà xe đã chọn!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  // ==================== HELPER METHODS ====================
  
  /**
   * Get CSS class for trang thai badge
   */
  getTrangThaiClass(trangThai: string): string {
    const classMap: { [key: string]: string } = {
      [TrangThaiNhaXe.HOAT_DONG]: 'trang-thai-hoat-dong',
      [TrangThaiNhaXe.TAM_DUNG]: 'trang-thai-tam-dung',
      [TrangThaiNhaXe.NGUNG_HOAT_DONG]: 'trang-thai-ngung-hoat-dong'
    };
    
    return classMap[trangThai] || 'trang-thai-default';
  }

  /**
   * Get display text for trang thai
   */
  getTrangThaiText(trangThai: string): string {
    const textMap: { [key: string]: string } = {
      [TrangThaiNhaXe.HOAT_DONG]: 'Hoạt động',
      [TrangThaiNhaXe.TAM_DUNG]: 'Tạm dừng',
      [TrangThaiNhaXe.NGUNG_HOAT_DONG]: 'Ngừng hoạt động'
    };
    
    return textMap[trangThai] || trangThai;
  }
}
