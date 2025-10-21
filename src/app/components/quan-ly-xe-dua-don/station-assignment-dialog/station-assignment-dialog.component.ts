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
import { RouteDetail } from '../../../models/route-detail.model';
import { FirestoreService } from '../../../services/firestore.service';
import { RouteDetailService } from '../../../services/route-detail.service';

export interface StationAssignmentDialogData {
  stations: StationData[];
  vehicles: XeDuaDon[];
  drivers: DriverInfo[];
}

export interface StationData {
  stationId: string;
  stationName: string;
  routeCode: string;
  routeName: string;
  employeeCount: number;
  thuTu?: number; // Order of station in route
}

@Component({
  selector: 'app-station-assignment-dialog',
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
  templateUrl: './station-assignment-dialog.component.html',
  styleUrl: './station-assignment-dialog.component.css'
})
export class StationAssignmentDialogComponent implements OnInit {
  stationAssignments: StationAssignment[] = [];
  isLoading = false;
  isExporting = false;

  constructor(
    public dialogRef: MatDialogRef<StationAssignmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StationAssignmentDialogData,
    private snackBar: MatSnackBar,
    private firestoreService: FirestoreService,
    private routeDetailService: RouteDetailService
  ) {}

  ngOnInit(): void {
    this.initializeAssignments();
    this.autoAssignVehicles();
  }

  private initializeAssignments(): void {
    this.stationAssignments = this.data.stations.map(station => ({
      stationId: station.stationId,
      stationName: station.stationName,
      routeCode: station.routeCode,
      routeName: station.routeName,
      employeeCount: station.employeeCount,
      assignedDriver: {
        driverId: '',
        driverName: '',
        phoneNumber: '',
        licenseNumber: ''
      },
      assignedVehicle: {
        vehicleId: '',
        licensePlate: '',
        vehicleType: '',
        capacity: 0,
        garageId: '',
        garageName: ''
      },
      assignedAt: new Date(),
      thuTu: station.thuTu // Copy thuTu field from station data
    }));
  }

  onVehicleChange(stationId: string, vehicleId: string): void {
    const selectedVehicle = this.data.vehicles.find(v => v.MaXe === vehicleId);
    if (selectedVehicle) {
      const assignment = this.stationAssignments.find(a => a.stationId === stationId);
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

  isAssignmentComplete(stationId: string): boolean {
    const assignment = this.stationAssignments.find(a => a.stationId === stationId);
    return assignment ? !!assignment.assignedVehicle.vehicleId : false;
  }

  getIncompleteAssignmentsCount(): number {
    return this.stationAssignments.filter(assignment => !this.isAssignmentComplete(assignment.stationId)).length;
  }

  canExport(): boolean {
    return this.getIncompleteAssignmentsCount() === 0;
  }

  onExportPDF(): void {
    if (!this.canExport()) {
      this.snackBar.open('Vui lòng hoàn thành việc phân công cho tất cả các trạm!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    this.isExporting = true;
    
    // Close dialog and return assignment data for PDF export
    this.dialogRef.close({
      stationAssignments: this.stationAssignments,
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

  getDriverOptions(): DriverInfo[] {
    return this.data.drivers;
  }

  getVehicleOptions(): XeDuaDon[] {
    return this.data.vehicles;
  }

  getTotalEmployees(): number {
    return this.stationAssignments.reduce((sum, s) => sum + s.employeeCount, 0);
  }

  getAssignedStationsCount(): number {
    return this.stationAssignments.filter(a => a.assignedVehicle.vehicleId).length;
  }

  /**
   * Kiểm tra xem phân bổ nhân viên có đồng đều không
   */
  isEmployeeDistributionBalanced(): boolean {
    if (this.stationAssignments.length < 2) return true;
    
    const employeeCounts = this.stationAssignments.map(s => s.employeeCount);
    const min = Math.min(...employeeCounts);
    const max = Math.max(...employeeCounts);
    
    // Phân bổ được coi là đồng đều nếu chênh lệch không quá 50% của giá trị trung bình
    const average = employeeCounts.reduce((sum, count) => sum + count, 0) / employeeCounts.length;
    const maxDifference = average * 0.5; // 50% của giá trị trung bình
    
    return (max - min) <= maxDifference;
  }

  /**
   * Tính tỷ lệ phần trăm nhân viên của trạm
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
   * Tự động phân bổ xe đồng đều cho các trạm
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
    
    // Phân bổ xe đồng đều cho các trạm
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
   * Phân bổ xe đồng đều cho các trạm
   */
  private distributeVehiclesEvenly(vehicles: XeDuaDon[]): void {
    const stations = this.stationAssignments;
    const totalStations = stations.length;
    
    if (totalStations === 0) return;

    // Đặc biệt xử lý cho 3 trạm để đảm bảo phân bổ đồng đều
    if (totalStations === 3) {
      this.distributeVehiclesForThreeStations(vehicles, stations);
    } else {
      this.distributeVehiclesGeneral(vehicles, stations);
    }

    // Hiển thị thông báo thành công
    this.snackBar.open(
      `Đã tự động phân bổ ${vehicles.length} xe cho ${totalStations} trạm!`, 
      'Đóng', 
      {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      }
    );
  }

  /**
   * Phân bổ xe đặc biệt cho 3 trạm để đảm bảo đồng đều dựa trên số nhân viên
   */
  private distributeVehiclesForThreeStations(vehicles: XeDuaDon[], stations: StationAssignment[]): void {
    // Sắp xếp xe theo sức chứa từ lớn đến nhỏ
    const sortedVehicles = this.sortVehiclesByCapacity(vehicles);
    
    // Tính tổng số nhân viên
    const totalEmployees = stations.reduce((sum, station) => sum + station.employeeCount, 0);
    
    // Phân bổ xe dựa trên tỷ lệ nhân viên của từng trạm
    const vehicleAssignments = this.calculateVehicleAssignmentByEmployeeRatio(stations, sortedVehicles, totalEmployees);
    
    // Thực hiện phân bổ xe
    vehicleAssignments.forEach((assignment, index) => {
      const station = stations[index];
      const selectedVehicle = this.selectBestVehicleForStation(assignment.availableVehicles, station);
      
      if (selectedVehicle) {
        this.assignVehicleToStation(station.stationId, selectedVehicle);
      }
    });
  }

  /**
   * Tính toán phân bổ xe dựa trên tỷ lệ nhân viên
   */
  private calculateVehicleAssignmentByEmployeeRatio(
    stations: StationAssignment[], 
    vehicles: XeDuaDon[], 
    totalEmployees: number
  ): { availableVehicles: XeDuaDon[] }[] {
    
    const assignments: { availableVehicles: XeDuaDon[] }[] = [];
    let vehicleIndex = 0;
    
    // Sắp xếp trạm theo số nhân viên từ cao đến thấp
    const sortedStations = [...stations].sort((a, b) => b.employeeCount - a.employeeCount);
    
    sortedStations.forEach((station, index) => {
      // Tính tỷ lệ nhân viên của trạm này
      const employeeRatio = station.employeeCount / totalEmployees;
      
      // Tính số xe cần thiết dựa trên tỷ lệ nhân viên
      let vehiclesNeeded = Math.ceil(vehicles.length * employeeRatio);
      
      // Đảm bảo mỗi trạm có ít nhất 1 xe nếu có xe khả dụng
      if (vehiclesNeeded === 0 && vehicles.length > 0) {
        vehiclesNeeded = 1;
      }
      
      // Đảm bảo không vượt quá số xe còn lại
      const remainingVehicles = vehicles.length - vehicleIndex;
      vehiclesNeeded = Math.min(vehiclesNeeded, remainingVehicles);
      
      // Lấy xe cho trạm này
      const assignedVehicles = vehicles.slice(vehicleIndex, vehicleIndex + vehiclesNeeded);
      
      assignments.push({
        availableVehicles: assignedVehicles
      });
      
      vehicleIndex += vehiclesNeeded;
    });
    
    return assignments;
  }

  /**
   * Phân bổ xe cho trường hợp tổng quát
   */
  private distributeVehiclesGeneral(vehicles: XeDuaDon[], stations: StationAssignment[]): void {
    const totalStations = stations.length;
    
    // Tính toán số xe cần thiết cho mỗi trạm
    const vehiclesPerStation = Math.floor(vehicles.length / totalStations);
    const remainingVehicles = vehicles.length % totalStations;

    let vehicleIndex = 0;

    // Phân bổ xe cho từng trạm
    stations.forEach((station, index) => {
      // Tính số xe cho trạm này
      let vehiclesForThisStation = vehiclesPerStation;
      
      // Phân bổ xe thừa cho các trạm đầu tiên
      if (index < remainingVehicles) {
        vehiclesForThisStation += 1;
      }

      // Chọn xe phù hợp nhất cho trạm này
      const selectedVehicle = this.selectBestVehicleForStation(
        vehicles.slice(vehicleIndex, vehicleIndex + vehiclesForThisStation),
        station
      );

      if (selectedVehicle) {
        this.assignVehicleToStation(station.stationId, selectedVehicle);
      }

      vehicleIndex += vehiclesForThisStation;
    });
  }

  /**
   * Chọn xe phù hợp nhất cho trạm dựa trên số nhân viên
   */
  private selectBestVehicleForStation(availableVehicles: XeDuaDon[], station: StationAssignment): XeDuaDon | null {
    if (availableVehicles.length === 0) return null;

    const employeeCount = station.employeeCount;
    
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
   * Gán xe cho trạm
   */
  private assignVehicleToStation(stationId: string, vehicle: XeDuaDon): void {
    const assignment = this.stationAssignments.find(a => a.stationId === stationId);
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
    const assignedVehicles = this.stationAssignments
      .filter(assignment => assignment.assignedVehicle.vehicleId)
      .map(assignment => this.data.vehicles.find(v => v.MaXe === assignment.assignedVehicle.vehicleId))
      .filter(vehicle => vehicle !== undefined) as XeDuaDon[];

    // Reset tất cả phân bổ
    this.stationAssignments.forEach(assignment => {
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
