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
      assignedAt: new Date()
    }));
  }

  onDriverChange(stationIndex: number, driverId: string): void {
    const selectedDriver = this.data.drivers.find(d => d.driverId === driverId);
    if (selectedDriver) {
      this.stationAssignments[stationIndex].assignedDriver = { ...selectedDriver };
    }
  }

  onVehicleChange(stationIndex: number, vehicleId: string): void {
    const selectedVehicle = this.data.vehicles.find(v => v.MaXe === vehicleId);
    if (selectedVehicle) {
      this.stationAssignments[stationIndex].assignedVehicle = {
        vehicleId: selectedVehicle.MaXe,
        licensePlate: selectedVehicle.BienSoXe,
        vehicleType: selectedVehicle.LoaiXe,
        capacity: this.getVehicleCapacity(selectedVehicle.LoaiXe),
        garageId: selectedVehicle.MaNhaXe || '',
        garageName: ''
      };
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

  isAssignmentComplete(stationIndex: number): boolean {
    const assignment = this.stationAssignments[stationIndex];
    return !!(assignment.assignedDriver.driverId && assignment.assignedVehicle.vehicleId);
  }

  getIncompleteAssignmentsCount(): number {
    return this.stationAssignments.filter((_, index) => !this.isAssignmentComplete(index)).length;
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
}
