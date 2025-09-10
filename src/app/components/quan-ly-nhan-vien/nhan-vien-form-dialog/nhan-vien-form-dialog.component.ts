import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NhanVien, NhanVienFormData } from '../../../models/employee.model';
import { RouteDetail } from '../../../models/route-detail.model';
import { RouteDetailService } from '../../../services/route-detail.service';

export interface NhanVienFormDialogData {
  nhanVien?: NhanVien;
}

@Component({
  selector: 'app-nhan-vien-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './nhan-vien-form-dialog.component.html',
  styleUrl: './nhan-vien-form-dialog.component.css'
})
export class NhanVienFormDialogComponent implements OnInit {
  nhanVienForm: FormGroup;
  isEditMode = false;
  title = 'Thêm Nhân viên';
  
  // Route and station data
  availableRoutes: any[] = [];
  selectedRouteStations: RouteDetail[] = [];
  allRouteDetails: RouteDetail[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<NhanVienFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NhanVienFormDialogData,
    private routeDetailService: RouteDetailService
  ) {
    this.nhanVienForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadAllRouteDetails();
    if (this.data.nhanVien) {
      this.isEditMode = true;
      this.title = 'Chỉnh sửa Nhân viên';
    }
    
    // Disable TramXe field initially
    this.nhanVienForm.get('TramXe')?.disable();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      HoTen: ['', [Validators.required, Validators.maxLength(100)]],
      DienThoai: ['', [Validators.pattern(/^[0-9+\-\s()]+$/), Validators.maxLength(20)]],
      MaTuyenXe: ['', [Validators.maxLength(50)]],
      TramXe: ['', [Validators.maxLength(100)]]
    });
  }

  private populateForm(nhanVien: NhanVien): void {
    console.log('=== POPULATING FORM WITH NHAN VIEN DATA ===');
    console.log('Nhan vien data:', nhanVien);
    
    // Store the original TramXe value
    const originalTramXe = nhanVien.TramXe || '';
    
    this.nhanVienForm.patchValue({
      HoTen: nhanVien.HoTen || '',
      DienThoai: nhanVien.DienThoai || '',
      MaTuyenXe: nhanVien.MaTuyenXe || '',
      TramXe: '' // Clear first, will be set after stations load
    });

    console.log('Form patched with values:', this.nhanVienForm.value);

    // Load stations for the selected route
    if (nhanVien.MaTuyenXe) {
      console.log('Loading stations for route:', nhanVien.MaTuyenXe);
      this.loadStationsForRoute(nhanVien.MaTuyenXe);
      
      // Enable TramXe field when route is selected
      this.nhanVienForm.get('TramXe')?.enable();
      
      // Set the original TramXe value after a short delay to ensure stations are loaded
      if (originalTramXe) {
        setTimeout(() => {
          console.log('Setting TramXe value to:', originalTramXe);
          this.nhanVienForm.patchValue({ TramXe: originalTramXe });
        }, 200);
      }
    }
    
    console.log('=== FORM POPULATION COMPLETED ===');
  }

  onSubmit(): void {
    if (this.nhanVienForm.valid) {
      const formData: NhanVienFormData = this.nhanVienForm.value;
      this.dialogRef.close(formData);
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.nhanVienForm.controls).forEach(key => {
      const control = this.nhanVienForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.nhanVienForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} là bắt buộc`;
      }
      if (control.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} không được vượt quá ${control.errors['maxlength'].requiredLength} ký tự`;
      }
      if (control.errors['pattern']) {
        return `${this.getFieldLabel(fieldName)} không đúng định dạng`;
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'HoTen': 'Họ và tên',
      'DienThoai': 'Số điện thoại',
      'MaTuyenXe': 'Tuyến xe',
      'TramXe': 'Trạm/Điểm đón'
    };
    return labels[fieldName] || fieldName;
  }

  hasFieldError(fieldName: string): boolean {
    const control = this.nhanVienForm.get(fieldName);
    return !!(control?.errors && control.touched);
  }

  // ==================== ROUTE AND STATION METHODS ====================
  
  /**
   * Load all route details from Firebase
   */
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
        
        // If in edit mode, populate form after route details are loaded
        if (this.isEditMode && this.data.nhanVien) {
          this.populateForm(this.data.nhanVien);
        }
      },
      error: (error) => {
        console.error('Error loading route details from Firebase:', error);
        this.availableRoutes = [];
        this.allRouteDetails = [];
      }
    });
  }

  /**
   * Load stations for selected route
   */
  private loadStationsForRoute(routeCode: string): void {
    console.log('=== LOADING STATIONS FOR ROUTE:', routeCode, '===');
    console.log('All route details available:', this.allRouteDetails.length);
    
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
      
      // If we're in edit mode, verify the station is available in the loaded stations
      if (this.isEditMode) {
        const currentTramXe = this.nhanVienForm.get('TramXe')?.value;
        if (currentTramXe) {
          console.log('Current selected station:', currentTramXe);
          
          // Check if the current station is in the loaded stations
          const stationExists = this.selectedRouteStations.some(station => station.tenDiemDon === currentTramXe);
          if (!stationExists) {
            console.log('Warning: Current station not found in loaded stations, clearing value');
            this.nhanVienForm.patchValue({ TramXe: '' });
          } else {
            console.log('Station found in loaded stations, keeping value');
          }
          
          // Verify final form value
          setTimeout(() => {
            console.log('Final form value for TramXe:', this.nhanVienForm.get('TramXe')?.value);
          }, 100);
        }
      }
    } else {
      console.log('No stations found for route:', routeCode);
      console.log('=== NO STATIONS FOUND ===');
      this.selectedRouteStations = [];
    }
  }

  /**
   * Handle route selection change
   */
  onRouteChange(): void {
    const selectedRoute = this.nhanVienForm.get('MaTuyenXe')?.value;
    console.log('Route changed to:', selectedRoute);
    
    // Clear the station selection first
    this.nhanVienForm.patchValue({ TramXe: '' });
    this.selectedRouteStations = [];
    
    if (selectedRoute) {
      this.loadStationsForRoute(selectedRoute);
      // Enable TramXe field when route is selected
      this.nhanVienForm.get('TramXe')?.enable();
    } else {
      // Disable TramXe field when no route is selected
      this.nhanVienForm.get('TramXe')?.disable();
    }
  }

  /**
   * Track by function for stations
   */
  trackByStation(index: number, station: RouteDetail): string {
    return station.id || station.tenDiemDon;
  }

}
