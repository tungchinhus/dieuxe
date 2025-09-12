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
import { MatChipsModule } from '@angular/material/chips';
import { SelectionModel } from '@angular/cdk/collections';
import { FirestoreService } from '../../services/firestore.service';
import { NhanVien, NhanVienFormData } from '../../models/employee.model';
import { NhanVienFormDialogComponent } from './nhan-vien-form-dialog/nhan-vien-form-dialog.component';

@Component({
  selector: 'app-quan-ly-nhan-vien',
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
    MatChipsModule
  ],
  templateUrl: './quan-ly-nhan-vien.component.html',
  styleUrl: './quan-ly-nhan-vien.component.css'
})
export class QuanLyNhanVienComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  // Table data
  dataSource = new MatTableDataSource<NhanVien>([]);
  selection = new SelectionModel<NhanVien>(true, []);
  displayedColumns: string[] = [
    'select',
    'MaNhanVien',
    'HoTen', 
    'DienThoai', 
    'MaTuyenXe',
    'TramXe',
    'actions'
  ];
  
  searchTerm = '';

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private firestoreService: FirestoreService,
  ) {}

  ngOnInit(): void {
    console.log('QuanLyNhanVienComponent initialized successfully!');
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
      const nhanVienList = await this.firestoreService.getAllNhanVien();
      
      console.log('Raw data from Firebase:', nhanVienList);
      
      if (!nhanVienList || nhanVienList.length === 0) {
        console.log('No data found in Firebase, using empty array');
        this.dataSource.data = [];
        return;
      }
      
      this.dataSource.data = nhanVienList;
      console.log(`Loaded ${nhanVienList.length} nhan vien from Firebase`);
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
   * Open add nhan vien dialog
   */
  openAddNhanVienDialog(): void {
    const dialogRef = this.dialog.open(NhanVienFormDialogComponent, {
      width: '1000px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addNhanVien(result);
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
   * Add new nhan vien to Firebase
   */
  private async addNhanVien(nhanVienData: NhanVienFormData): Promise<void> {
    try {
      const nhanVienId = await this.firestoreService.createNhanVien(nhanVienData);
      
      // Reload data from Firebase
      await this.loadDataFromFirebase();
      
      this.snackBar.open('Thêm nhân viên thành công!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error adding nhan vien:', error);
      this.snackBar.open('Có lỗi xảy ra khi thêm nhân viên!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Edit nhan vien
   */
  editNhanVien(nhanVien: NhanVien): void {
    const dialogRef = this.dialog.open(NhanVienFormDialogComponent, {
      width: '1000px',
      data: {
        nhanVien: nhanVien
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateNhanVien(nhanVien.NhanVienID, result);
      }
    });
  }

  /**
   * Update nhan vien in Firebase
   */
  private async updateNhanVien(nhanVienId: number, updateData: Partial<NhanVienFormData>): Promise<void> {
    try {
      await this.firestoreService.updateNhanVien(nhanVienId, updateData);
      
      // Reload data from Firebase
      await this.loadDataFromFirebase();
      
      this.snackBar.open('Cập nhật nhân viên thành công!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error updating nhan vien:', error);
      this.snackBar.open('Có lỗi xảy ra khi cập nhật nhân viên!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Delete nhan vien
   */
  deleteNhanVien(nhanVien: NhanVien): void {
    if (confirm(`Bạn có chắc chắn muốn xóa nhân viên ${nhanVien.HoTen}?`)) {
      this.performDeleteNhanVien(nhanVien.NhanVienID);
    }
  }

  /**
   * Perform delete nhan vien from Firebase
   */
  private async performDeleteNhanVien(nhanVienId: number): Promise<void> {
    try {
      await this.firestoreService.deleteNhanVien(nhanVienId);
      
      // Reload data from Firebase
      await this.loadDataFromFirebase();
      
      this.snackBar.open('Xóa nhân viên thành công!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error deleting nhan vien:', error);
      this.snackBar.open('Có lỗi xảy ra khi xóa nhân viên!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  // ==================== SELECTION METHODS ====================
  
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle(): void {
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.data.forEach(row => this.selection.select(row));
  }

  checkboxLabel(row?: NhanVien): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row`;
  }

  // ==================== FILTER METHODS ====================
  
  /**
   * Apply search filter
   */
  applyFilter(): void {
    this.dataSource.filter = this.searchTerm.trim().toLowerCase();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.dataSource.filter = '';
    this.dataSource.filterPredicate = (data: NhanVien, filter: string) => {
      return (data.MaNhanVien?.toLowerCase().includes(filter) ?? false) ||
             (data.HoTen?.toLowerCase().includes(filter) ?? false) ||
             (data.DienThoai?.toLowerCase().includes(filter) ?? false);
    };
  }

  /**
   * Delete selected nhan vien
   */
  deleteSelected(): void {
    if (this.selection.selected.length === 0) {
      this.snackBar.open('Vui lòng chọn nhân viên cần xóa!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa ${this.selection.selected.length} nhân viên đã chọn?`)) {
      this.performDeleteSelected();
    }
  }

  /**
   * Perform delete selected nhan vien
   */
  private async performDeleteSelected(): Promise<void> {
    const deletePromises = this.selection.selected.map(nhanVien => 
      this.firestoreService.deleteNhanVien(nhanVien.NhanVienID)
    );

    try {
      await Promise.all(deletePromises);
      
      // Clear selection
      this.selection.clear();
      
      // Reload data from Firebase
      await this.loadDataFromFirebase();
      
      this.snackBar.open(`Đã xóa ${deletePromises.length} nhân viên thành công!`, 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error deleting selected nhan vien:', error);
      this.snackBar.open('Có lỗi xảy ra khi xóa nhân viên đã chọn!', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  // ==================== HELPER METHODS ====================
}
