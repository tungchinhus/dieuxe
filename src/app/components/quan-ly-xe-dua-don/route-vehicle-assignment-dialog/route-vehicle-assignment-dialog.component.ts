import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { StationAssignment, DriverInfo, VehicleInfo, XeDuaDon, LoaiXe } from '../../../models/vehicle.model';

export interface RouteVehicleAssignmentDialogData {
  routes: RouteData[];
  vehicles: XeDuaDon[];
  drivers: DriverInfo[];
}

export interface RouteData {
  routeId: string;
  routeName: string;
  routeCode: string;
  employeeCount: number;
}

export interface RouteVehicleAssignment {
  routeId: string;
  routeName: string;
  routeCode: string;
  employeeCount: number;
  assignedVehicle: VehicleInfo;
  assignedAt: Date;
}

@Component({
  selector: 'app-route-vehicle-assignment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatToolbarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './route-vehicle-assignment-dialog.component.html',
  styleUrl: './route-vehicle-assignment-dialog.component.css'
})
export class RouteVehicleAssignmentDialogComponent implements OnInit {
  routeAssignments: RouteVehicleAssignment[] = [];
  isLoading = false;
  isExporting = false;

  constructor(
    public dialogRef: MatDialogRef<RouteVehicleAssignmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RouteVehicleAssignmentDialogData,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeAssignments();
    this.autoAssignVehicles();
  }

  private initializeAssignments(): void {
    this.routeAssignments = this.data.routes.map(route => ({
      routeId: route.routeId,
      routeName: route.routeName,
      routeCode: route.routeCode,
      employeeCount: route.employeeCount,
      assignedVehicle: {
        vehicleId: '',
        licensePlate: '',
        vehicleType: '',
        capacity: 0,
        garageId: '',
        garageName: ''
      },
      assignedAt: new Date()
    }));
  }

  onVehicleChange(routeId: string, vehicleId: string): void {
    const selectedVehicle = this.data.vehicles.find(v => v.MaXe === vehicleId);
    if (selectedVehicle) {
      const assignment = this.routeAssignments.find(a => a.routeId === routeId);
      if (assignment) {
        assignment.assignedVehicle = {
          vehicleId: selectedVehicle.MaXe,
          licensePlate: selectedVehicle.BienSoXe,
          vehicleType: selectedVehicle.LoaiXe,
          capacity: this.getVehicleCapacity(selectedVehicle.LoaiXe),
          garageId: selectedVehicle.MaNhaXe || '',
          garageName: ''
        };
      }
    }
  }

  private getVehicleCapacity(vehicleType: string): number {
    const capacityMap: { [key: string]: number } = {
      [LoaiXe.XE_4_CHO]: 4,
      [LoaiXe.XE_7_CHO]: 7,
      [LoaiXe.XE_16_CHO]: 16,
      [LoaiXe.XE_29_CHO]: 29,
      [LoaiXe.XE_45_CHO]: 45,
      [LoaiXe.XE_TAXI_7_CHO]: 7
    };
    return capacityMap[vehicleType] || 0;
  }

  isAssignmentComplete(routeId: string): boolean {
    const assignment = this.routeAssignments.find(a => a.routeId === routeId);
    return assignment ? !!assignment.assignedVehicle.vehicleId : false;
  }

  getIncompleteAssignmentsCount(): number {
    return this.routeAssignments.filter(assignment => !this.isAssignmentComplete(assignment.routeId)).length;
  }

  canExport(): boolean {
    return this.getIncompleteAssignmentsCount() === 0;
  }

  onExportPDF(): void {
    if (!this.canExport()) {
      this.snackBar.open('Vui lòng hoàn thành việc phân công xe cho tất cả các tuyến!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    this.isExporting = true;
    
    // Close dialog and return assignment data for PDF export
    this.dialogRef.close({
      routeAssignments: this.routeAssignments,
      exportDate: new Date()
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getVehicleTypeIcon(vehicleType: string): string {
    const iconMap: { [key: string]: string } = {
      [LoaiXe.XE_4_CHO]: 'directions_car',
      [LoaiXe.XE_7_CHO]: 'local_taxi',
      [LoaiXe.XE_16_CHO]: 'airport_shuttle',
      [LoaiXe.XE_29_CHO]: 'directions_bus',
      [LoaiXe.XE_45_CHO]: 'directions_bus',
      [LoaiXe.XE_TAXI_7_CHO]: 'local_taxi'
    };
    return iconMap[vehicleType] || 'directions_car';
  }

  getVehicleOptions(): XeDuaDon[] {
    return this.data.vehicles;
  }

  getTotalEmployees(): number {
    return this.routeAssignments.reduce((sum, r) => sum + r.employeeCount, 0);
  }

  getAssignedRoutesCount(): number {
    return this.routeAssignments.filter(a => a.assignedVehicle.vehicleId).length;
  }

  /**
   * Kiểm tra xem phân bổ nhân viên có đồng đều không
   */
  isEmployeeDistributionBalanced(): boolean {
    if (this.routeAssignments.length < 2) return true;
    
    const employeeCounts = this.routeAssignments.map(r => r.employeeCount);
    const min = Math.min(...employeeCounts);
    const max = Math.max(...employeeCounts);
    
    // Phân bổ được coi là đồng đều nếu chênh lệch không quá 50% của giá trị trung bình
    const average = employeeCounts.reduce((sum, count) => sum + count, 0) / employeeCounts.length;
    const maxDifference = average * 0.5; // 50% của giá trị trung bình
    
    return (max - min) <= maxDifference;
  }

  /**
   * Tính tỷ lệ phần trăm nhân viên của tuyến
   */
  getEmployeePercentage(employeeCount: number): number {
    const total = this.getTotalEmployees();
    return total > 0 ? Math.round((employeeCount / total) * 100) : 0;
  }

  /**
   * Đề xuất loại xe phù hợp với số nhân viên
   */
  getRecommendedVehicleType(employeeCount: number): string {
    if (employeeCount <= 7) {
      return 'Taxi 7 chỗ';
    } else if (employeeCount <= 16) {
      return 'Xe 16 chỗ';
    } else if (employeeCount <= 29) {
      return 'Xe 29 chỗ';
    } else if (employeeCount <= 45) {
      return 'Xe 45 chỗ';
    } else {
      return 'Nhiều xe 45 chỗ';
    }
  }

  /**
   * Tự động phân bổ xe đồng đều cho các tuyến
   */
  private autoAssignVehicles(): void {
    const availableVehicles = this.data.vehicles.filter(vehicle => 
      vehicle.BienSoXe && vehicle.LoaiXe
    );
    
    if (availableVehicles.length === 0) {
      console.warn('Không có xe khả dụng để phân bổ');
      return;
    }

    // Sắp xếp xe theo loại và sức chứa
    const sortedVehicles = this.sortVehiclesByCapacity(availableVehicles);
    
    // Phân bổ xe đồng đều cho các tuyến
    this.distributeVehiclesEvenly(sortedVehicles);
  }

  /**
   * Sắp xếp xe theo sức chứa từ lớn đến nhỏ
   */
  private sortVehiclesByCapacity(vehicles: XeDuaDon[]): XeDuaDon[] {
    return vehicles.sort((a, b) => {
      const capacityA = this.getVehicleCapacity(a.LoaiXe);
      const capacityB = this.getVehicleCapacity(b.LoaiXe);
      return capacityB - capacityA; // Sắp xếp từ lớn đến nhỏ
    });
  }

  /**
   * Phân bổ xe đồng đều cho các tuyến dựa trên số nhân viên
   */
  private distributeVehiclesEvenly(vehicles: XeDuaDon[]): void {
    const routes = this.routeAssignments;
    const totalRoutes = routes.length;
    
    if (totalRoutes === 0) return;

    // Tính tổng số nhân viên
    const totalEmployees = routes.reduce((sum, route) => sum + route.employeeCount, 0);
    
    // Phân bổ xe dựa trên tỷ lệ nhân viên của từng tuyến
    const vehicleAssignments = this.calculateVehicleAssignmentByEmployeeRatio(routes, vehicles, totalEmployees);
    
    // Thực hiện phân bổ xe
    vehicleAssignments.forEach((assignment, index) => {
      const route = routes[index];
      const selectedVehicle = this.selectBestVehicleForRoute(assignment.availableVehicles, route);
      
      if (selectedVehicle) {
        this.assignVehicleToRoute(route.routeId, selectedVehicle);
      }
    });

    // Hiển thị thông báo thành công
    this.snackBar.open(
      `Đã tự động phân bổ ${vehicles.length} xe cho ${totalRoutes} tuyến!`, 
      'Đóng', 
      {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      }
    );
  }

  /**
   * Tính toán phân bổ xe dựa trên tỷ lệ nhân viên
   */
  private calculateVehicleAssignmentByEmployeeRatio(
    routes: RouteVehicleAssignment[], 
    vehicles: XeDuaDon[], 
    totalEmployees: number
  ): { availableVehicles: XeDuaDon[] }[] {
    
    const assignments: { availableVehicles: XeDuaDon[] }[] = [];
    let vehicleIndex = 0;
    
    // Sắp xếp tuyến theo số nhân viên từ cao đến thấp
    const sortedRoutes = [...routes].sort((a, b) => b.employeeCount - a.employeeCount);
    
    sortedRoutes.forEach((route, index) => {
      // Tính tỷ lệ nhân viên của tuyến này
      const employeeRatio = route.employeeCount / totalEmployees;
      
      // Tính số xe cần thiết dựa trên tỷ lệ nhân viên
      let vehiclesNeeded = Math.ceil(vehicles.length * employeeRatio);
      
      // Đảm bảo mỗi tuyến có ít nhất 1 xe nếu có xe khả dụng
      if (vehiclesNeeded === 0 && vehicles.length > 0) {
        vehiclesNeeded = 1;
      }
      
      // Đảm bảo không vượt quá số xe còn lại
      const remainingVehicles = vehicles.length - vehicleIndex;
      vehiclesNeeded = Math.min(vehiclesNeeded, remainingVehicles);
      
      // Lấy xe cho tuyến này
      const assignedVehicles = vehicles.slice(vehicleIndex, vehicleIndex + vehiclesNeeded);
      
      assignments.push({
        availableVehicles: assignedVehicles
      });
      
      vehicleIndex += vehiclesNeeded;
    });
    
    return assignments;
  }

  /**
   * Chọn xe phù hợp nhất cho tuyến dựa trên số nhân viên
   */
  private selectBestVehicleForRoute(availableVehicles: XeDuaDon[], route: RouteVehicleAssignment): XeDuaDon | null {
    if (availableVehicles.length === 0) return null;

    const employeeCount = route.employeeCount;
    
    // Sắp xếp xe theo độ phù hợp với số nhân viên
    const sortedVehicles = availableVehicles.sort((a, b) => {
      const capacityA = this.getVehicleCapacity(a.LoaiXe);
      const capacityB = this.getVehicleCapacity(b.LoaiXe);
      
      // Tính điểm phù hợp cho từng xe
      const scoreA = this.calculateVehicleScore(capacityA, employeeCount);
      const scoreB = this.calculateVehicleScore(capacityB, employeeCount);
      
      return scoreB - scoreA; // Sắp xếp từ cao đến thấp
    });

    return sortedVehicles[0];
  }

  /**
   * Tính điểm phù hợp của xe với số nhân viên
   */
  private calculateVehicleScore(capacity: number, employeeCount: number): number {
    // Điểm cao nhất khi sức chứa vừa đủ hoặc hơi thừa
    if (capacity >= employeeCount) {
      // Ưu tiên xe có sức chứa gần với số nhân viên nhất
      const utilization = employeeCount / capacity;
      return utilization * 100; // Điểm từ 0-100
    } else {
      // Xe không đủ sức chứa có điểm thấp
      return -1;
    }
  }

  /**
   * Gán xe cho tuyến
   */
  private assignVehicleToRoute(routeId: string, vehicle: XeDuaDon): void {
    const assignment = this.routeAssignments.find(a => a.routeId === routeId);
    if (assignment) {
      assignment.assignedVehicle = {
        vehicleId: vehicle.MaXe,
        licensePlate: vehicle.BienSoXe,
        vehicleType: vehicle.LoaiXe,
        capacity: this.getVehicleCapacity(vehicle.LoaiXe),
        garageId: vehicle.MaNhaXe || '',
        garageName: ''
      };
    }
  }

  /**
   * Phân bổ lại xe đồng đều (nút thủ công)
   */
  onRedistributeVehicles(): void {
    // Lấy danh sách xe đã được phân bổ
    const assignedVehicles = this.routeAssignments
      .filter(assignment => assignment.assignedVehicle.vehicleId)
      .map(assignment => this.data.vehicles.find(v => v.MaXe === assignment.assignedVehicle.vehicleId))
      .filter(vehicle => vehicle !== undefined) as XeDuaDon[];

    // Reset tất cả phân bổ
    this.routeAssignments.forEach(assignment => {
      assignment.assignedVehicle = {
        vehicleId: '',
        licensePlate: '',
        vehicleType: '',
        capacity: 0,
        garageId: '',
        garageName: ''
      };
    });

    // Phân bổ lại
    if (assignedVehicles.length > 0) {
      const sortedVehicles = this.sortVehiclesByCapacity(assignedVehicles);
      this.distributeVehiclesEvenly(sortedVehicles);
    } else {
      this.snackBar.open('Không có xe nào được phân bổ để phân bổ lại!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }
}
