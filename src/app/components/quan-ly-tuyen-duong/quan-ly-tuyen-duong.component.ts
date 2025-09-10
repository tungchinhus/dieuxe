import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { SelectionModel } from '@angular/cdk/collections';
import { RouteDetail, RouteDetailCreate, RouteDetailUpdate } from '../../models/route-detail.model';
import { RouteDetailDialogComponent } from './route-detail-dialog/route-detail-dialog.component';
import { ExcelService } from '../../services/excel.service';
import { RouteDetailService } from '../../services/route-detail.service';

@Component({
  selector: 'app-quan-ly-tuyen-duong',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatMenuModule,
    MatCheckboxModule,
    MatToolbarModule,
    MatSnackBarModule,
    FormsModule
  ],
  templateUrl: './quan-ly-tuyen-duong.component.html',
  styleUrl: './quan-ly-tuyen-duong.component.css'
})
export class QuanLyTuyenDuongComponent implements OnInit {
  displayedColumns: string[] = ['select', 'maTuyenXe', 'tenDiemDon', 'thuTu', 'actions'];
  dataSource = new MatTableDataSource<RouteDetail>([]);
  selection = new SelectionModel<RouteDetail>(true, []);
  searchValue = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private excelService: ExcelService,
    private routeDetailService: RouteDetailService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadData() {
    this.routeDetailService.getRouteDetails().subscribe({
      next: (routeDetails) => {
        this.dataSource.data = routeDetails;
      },
      error: (error) => {
        console.error('Error loading route details:', error);
        this.snackBar.open('Lỗi khi tải dữ liệu từ Firebase!', 'Đóng', {
          duration: 3000
        });
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle() {
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.data.forEach(row => this.selection.select(row));
  }

  checkboxLabel(row?: RouteDetail): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.maChiTiet + 1}`;
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(RouteDetailDialogComponent, {
      data: { mode: 'add' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addRouteDetail(result);
      }
    });
  }

  openEditDialog(routeDetail: RouteDetail) {
    const dialogRef = this.dialog.open(RouteDetailDialogComponent, {
      data: { mode: 'edit', routeDetail: routeDetail }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateRouteDetail(result);
      }
    });
  }

  addRouteDetail(routeDetail: RouteDetailCreate) {
    // Auto-increment maChiTiet
    const nextId = this.getNextId();
    const routeDetailWithId = {
      ...routeDetail,
      maChiTiet: nextId
    };

    console.log('Adding route detail with auto-incremented ID:', routeDetailWithId);

    this.routeDetailService.addRouteDetail(routeDetailWithId).then(() => {
      this.snackBar.open('Thêm chi tiết tuyến đường thành công!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      // Reload data to show the new item
      this.loadData();
    }).catch((error) => {
      console.error('Error adding route detail:', error);
      this.snackBar.open('Lỗi khi thêm chi tiết tuyến đường!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    });
  }

  updateRouteDetail(routeDetail: RouteDetailUpdate & { maChiTiet: number }) {
    // Find the document ID from the current data
    const existingItem = this.dataSource.data.find(item => item.maChiTiet === routeDetail.maChiTiet);
    if (existingItem && existingItem.id) {
      const updateData: RouteDetailUpdate = {
        maTuyenXe: routeDetail.maTuyenXe,
        tenDiemDon: routeDetail.tenDiemDon,
        thuTu: routeDetail.thuTu
      };
      
      console.log('Updating route detail:', updateData);
      
      this.routeDetailService.updateRouteDetail(existingItem.id, updateData).then(() => {
        this.snackBar.open('Cập nhật chi tiết tuyến đường thành công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        // Reload data to show the updated item
        this.loadData();
      }).catch((error) => {
        console.error('Error updating route detail:', error);
        this.snackBar.open('Lỗi khi cập nhật chi tiết tuyến đường!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      });
    }
  }

  deleteRouteDetail(routeDetail: RouteDetail) {
    if (confirm('Bạn có chắc chắn muốn xóa chi tiết tuyến đường này?')) {
      if (routeDetail.id) {
        this.routeDetailService.deleteRouteDetail(routeDetail.id).then(() => {
          this.snackBar.open('Xóa chi tiết tuyến đường thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
          // Reload data to show the updated list
          this.loadData();
        }).catch((error) => {
          console.error('Error deleting route detail:', error);
          this.snackBar.open('Lỗi khi xóa chi tiết tuyến đường!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
        });
      }
    }
  }

  deleteSelected() {
    if (this.selection.selected.length === 0) {
      this.snackBar.open('Vui lòng chọn ít nhất một mục để xóa!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa ${this.selection.selected.length} chi tiết tuyến đường đã chọn?`)) {
      const selectedIds = this.selection.selected
        .map(item => item.id)
        .filter((id): id is string => !!id); // Filter out undefined IDs and ensure type safety
      
      if (selectedIds.length > 0) {
        this.routeDetailService.deleteMultipleRouteDetails(selectedIds).then(() => {
          this.selection.clear();
          this.snackBar.open('Xóa các chi tiết tuyến đường thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
          // Reload data to show the updated list
          this.loadData();
        }).catch((error) => {
          console.error('Error deleting multiple route details:', error);
          this.snackBar.open('Lỗi khi xóa các chi tiết tuyến đường!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
        });
      }
    }
  }

  private getNextId(): number {
    const maxId = Math.max(...this.dataSource.data.map(item => item.maChiTiet), 0);
    return maxId + 1;
  }

  openFileUploadDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.importFromExcel(file);
      }
    };
    input.click();
  }

  downloadTemplate() {
    try {
      const blob = this.excelService.generateRouteDetailTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Mau_Chi_Tiet_Tuyen_Duong.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.snackBar.open('Tải mẫu Excel thành công!', 'Đóng', {
        duration: 3000
      });
    } catch (error) {
      this.snackBar.open('Lỗi khi tải mẫu Excel!', 'Đóng', {
        duration: 3000
      });
    }
  }

  private async importFromExcel(file: File) {
    try {
      this.snackBar.open('Đang xử lý file Excel...', 'Đóng', {
        duration: 2000
      });

      const routeDetails = await this.excelService.readRouteDetailExcelFile(file);
      
      if (routeDetails.length === 0) {
        this.snackBar.open('Không tìm thấy dữ liệu hợp lệ trong file Excel!', 'Đóng', {
          duration: 3000
        });
        return;
      }

      // Add imported data to Firebase
      await this.routeDetailService.addMultipleRouteDetails(routeDetails);
      
      this.snackBar.open(`Import thành công ${routeDetails.length} chi tiết tuyến đường!`, 'Đóng', {
        duration: 3000
      });

    } catch (error) {
      console.error('Error importing Excel file:', error);
      this.snackBar.open('Lỗi khi đọc file Excel: ' + (error as Error).message, 'Đóng', {
        duration: 5000
      });
    }
  }
}
