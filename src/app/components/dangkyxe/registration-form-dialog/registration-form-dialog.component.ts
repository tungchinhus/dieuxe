import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';

import { Registration, Department, WorkShift, Route, RegistrationFormData } from '../../../models/registration.model';
import { RouteDetail } from '../../../models/route-detail.model';
import { RouteDetailService } from '../../../services/route-detail.service';

export interface DialogData {
  registration?: Registration;
  departments: Department[];
  workShifts: WorkShift[];
  routes: Route[];
}

@Component({
  selector: 'app-registration-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDividerModule,
    MatToolbarModule
  ],
  templateUrl: './registration-form-dialog.component.html',
  styleUrl: './registration-form-dialog.component.css'
})
export class RegistrationFormDialogComponent implements OnInit {
  registrationForm!: FormGroup;
  isEditMode = false;
  departments: Department[] = [];
  workShifts: WorkShift[] = [];
  routes: Route[] = [];
  availableRoutes: any[] = [];
  selectedRouteStations: RouteDetail[] = [];
  allRouteDetails: RouteDetail[] = []; // Store all route details from Firebase

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RegistrationFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private routeDetailService: RouteDetailService
  ) {
    this.departments = data.departments;
    this.workShifts = data.workShifts;
    this.routes = data.routes;
    this.isEditMode = !!data.registration;
    
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadAllRouteDetails();
    if (this.isEditMode && this.data.registration) {
      this.populateForm(this.data.registration);
    }
  }

  private initializeForm(): void {
    this.registrationForm = this.fb.group({
      maNhanVien: ['', [Validators.required, Validators.minLength(3)]],
      hoTen: ['', [Validators.required, Validators.minLength(2)]],
      dienThoai: ['', [Validators.required, Validators.pattern(/^[0-9\s\-\+\(\)]+$/)]],
      ngayDangKy: ['', Validators.required],
      loaiCa: ['', Validators.required],
      thoiGianBatDau: ['', Validators.required],
      thoiGianKetThuc: ['', Validators.required],
      maTuyenXe: ['', Validators.required],
      tramXe: ['', Validators.required],
      noiDungCongViec: [''],
      dangKyCom: [false]
    });
  }

  private populateForm(registration: Registration): void {
    this.registrationForm.patchValue({
      maNhanVien: registration.maNhanVien,
      hoTen: registration.hoTen,
      dienThoai: registration.dienThoai,
      ngayDangKy: registration.ngayDangKy,
      loaiCa: registration.loaiCa,
      thoiGianBatDau: registration.thoiGianBatDau,
      thoiGianKetThuc: registration.thoiGianKetThuc,
      maTuyenXe: registration.maTuyenXe,
      tramXe: registration.tramXe,
      noiDungCongViec: registration.noiDungCongViec,
      dangKyCom: registration.dangKyCom
    });

    // Load stations for the selected route
    if (registration.maTuyenXe) {
      this.loadStationsForRoute(registration.maTuyenXe);
    }
  }

  onWorkShiftChange(): void {
    const loaiCa = this.registrationForm.get('loaiCa')?.value;
    const workShift = this.workShifts.find(ws => ws.value === loaiCa);
    
    if (workShift) {
      // Extract time from the label (e.g., "08:00 - 17:00")
      const timeMatch = workShift.label.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
      if (timeMatch) {
        this.registrationForm.patchValue({
          thoiGianBatDau: timeMatch[1],
          thoiGianKetThuc: timeMatch[2]
        });
      }
    }
  }

  onRouteChange(): void {
    const selectedRoute = this.registrationForm.get('maTuyenXe')?.value;
    console.log('Route changed to:', selectedRoute);
    
    // Clear the station selection first
    this.registrationForm.patchValue({ tramXe: '' });
    this.selectedRouteStations = [];
    
    if (selectedRoute) {
      this.loadStationsForRoute(selectedRoute);
    }
  }

  private loadAllRouteDetails(): void {
    console.log('=== LOADING ALL ROUTE DETAILS FROM FIREBASE ===');
    this.routeDetailService.getRouteDetails().subscribe({
      next: (routeDetails) => {
        console.log('Raw route details from Firebase:', routeDetails);
        this.allRouteDetails = routeDetails;
        
        // Get unique routes from route details
        const uniqueRoutes = new Map();
        routeDetails.forEach(detail => {
          console.log('Processing route detail:', detail);
          if (!uniqueRoutes.has(detail.maTuyenXe)) {
            uniqueRoutes.set(detail.maTuyenXe, {
              maTuyenXe: detail.maTuyenXe,
              tenTuyenXe: `Tuyến ${detail.maTuyenXe}` // You can customize this based on your data structure
            });
          }
        });
        this.availableRoutes = Array.from(uniqueRoutes.values());
        console.log('Available routes for dropdown:', this.availableRoutes);
        console.log('Total route details loaded:', this.allRouteDetails.length);
        console.log('=== ALL DATA LOADED SUCCESSFULLY ===');
      },
      error: (error) => {
        console.error('Error loading route details from Firebase:', error);
        this.availableRoutes = [];
        this.allRouteDetails = [];
      }
    });
  }

  private loadStationsForRoute(routeCode: string): void {
    console.log('=== LOADING STATIONS FOR ROUTE:', routeCode, '===');
    
    if (!this.allRouteDetails || this.allRouteDetails.length === 0) {
      console.log('No route details loaded yet, waiting...');
      this.selectedRouteStations = [];
      return;
    }
    
    // Filter stations by route code from already loaded data
    const stations = this.allRouteDetails.filter(detail => detail.maTuyenXe === routeCode);
    console.log('Filtered stations for route', routeCode, ':', stations);
    
    if (stations && stations.length > 0) {
      // Sort stations by thuTu (order) and assign to selectedRouteStations
      this.selectedRouteStations = stations.sort((a, b) => a.thuTu - b.thuTu);
      console.log('Successfully loaded', this.selectedRouteStations.length, 'stations for route:', routeCode);
      console.log('Sorted stations:', this.selectedRouteStations);
      console.log('=== STATIONS LOADED SUCCESSFULLY ===');
    } else {
      console.log('No stations found for route:', routeCode);
      console.log('=== NO STATIONS FOUND ===');
      this.selectedRouteStations = [];
    }
  }


  trackByStation(index: number, station: RouteDetail): string {
    return station.id || station.tenDiemDon;
  }

  getStationCountForRoute(routeCode: string): number {
    return this.allRouteDetails.filter(d => d.maTuyenXe === routeCode).length;
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      const formData: RegistrationFormData = this.registrationForm.value;
      this.dialogRef.close(formData);
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registrationForm.controls).forEach(key => {
      const control = this.registrationForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.registrationForm.get(controlName);
    if (control?.hasError('required')) {
      return 'Trường này là bắt buộc';
    }
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength'].requiredLength;
      return `Tối thiểu ${requiredLength} ký tự`;
    }
    if (control?.hasError('pattern')) {
      return 'Định dạng không hợp lệ';
    }
    return '';
  }

  isFieldInvalid(controlName: string): boolean {
    const control = this.registrationForm.get(controlName);
    return !!(control && control.invalid && control.touched);
  }
}
