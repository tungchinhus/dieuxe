import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouteDetail, RouteDetailCreate, RouteDetailUpdate } from '../../../models/route-detail.model';
import { RouteDetailService } from '../../../services/route-detail.service';

export interface DialogData {
  mode: 'add' | 'edit';
  routeDetail?: RouteDetail;
}

@Component({
  selector: 'app-route-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ReactiveFormsModule
  ],
  templateUrl: './route-detail-dialog.component.html',
  styleUrl: './route-detail-dialog.component.css'
})
export class RouteDetailDialogComponent implements OnInit {
  form: FormGroup;
  isEditMode = false;
  title = 'Thêm Chi tiết Tuyến đường';

  // Route options loaded from Firebase
  availableRoutes: any[] = [];
  allRouteDetails: RouteDetail[] = [];
  isLoading = true;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RouteDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private routeDetailService: RouteDetailService,
    private snackBar: MatSnackBar
  ) {
    this.isEditMode = data.mode === 'edit';
    this.title = this.isEditMode ? 'Chỉnh sửa Chi tiết Tuyến đường' : 'Thêm Chi tiết Tuyến đường';
    this.form = this.createForm();
  }

  ngOnInit() {
    this.loadAllRouteDetails();
    if (this.isEditMode && this.data.routeDetail) {
      this.populateForm(this.data.routeDetail);
    }
    
    // Add real-time validation
    this.setupRealTimeValidation();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      maTuyenXe: ['', [Validators.required]],
      tenDiemDon: ['', [Validators.required, Validators.maxLength(100)]],
      thuTu: [1, [Validators.required, Validators.min(1), Validators.max(1000)]]
    });
  }

  /**
   * Load all route details from Firebase to get unique routes
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
          if (!uniqueRoutes.has(detail.maTuyenXe)) {
            uniqueRoutes.set(detail.maTuyenXe, {
              maTuyenXe: detail.maTuyenXe,
              tenTuyenXe: `Tuyến ${detail.maTuyenXe}`
            });
          }
        });
        this.availableRoutes = Array.from(uniqueRoutes.values());
        console.log('Available routes for dropdown:', this.availableRoutes);
        this.isLoading = false;
        console.log('=== ROUTES LOADED SUCCESSFULLY ===');
      },
      error: (error) => {
        console.error('Error loading route details from Firebase:', error);
        this.availableRoutes = [];
        this.allRouteDetails = [];
        this.isLoading = false;
      }
    });
  }

  private populateForm(routeDetail: RouteDetail) {
    console.log('=== POPULATING FORM WITH ROUTE DETAIL DATA ===');
    console.log('Route detail data:', routeDetail);
    
    this.form.patchValue({
      maTuyenXe: routeDetail.maTuyenXe,
      tenDiemDon: routeDetail.tenDiemDon,
      thuTu: routeDetail.thuTu
    });

    console.log('Form patched with values:', this.form.value);
    console.log('=== FORM POPULATION COMPLETED ===');
  }

  onSubmit() {
    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('Form valid:', this.form.valid);
    console.log('Form value:', this.form.value);
    console.log('All route details count:', this.allRouteDetails.length);
    console.log('All route details:', this.allRouteDetails);
    
    if (this.form.valid) {
      const formValue = this.form.value;
      
      // Force validation check
      this.validateDuplicates(formValue);
      
    } else {
      this.markFormGroupTouched();
      this.snackBar.open('Vui lòng điền đầy đủ thông tin bắt buộc!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar']
      });
    }
  }

  /**
   * Validate duplicates and show appropriate messages
   */
  private validateDuplicates(formValue: any): void {
    const maTuyenXe = formValue.maTuyenXe;
    const tenDiemDon = formValue.tenDiemDon;
    const thuTu = formValue.thuTu;

    console.log('Validating duplicates for:', { maTuyenXe, tenDiemDon, thuTu });

    // Check for station name duplicates
    const stationDuplicates = this.allRouteDetails.filter(detail => 
      detail.maTuyenXe === maTuyenXe && 
      detail.tenDiemDon.toLowerCase().trim() === tenDiemDon.toLowerCase().trim()
    );

    console.log('Found station duplicates:', stationDuplicates);

    // Check for order duplicates
    const orderDuplicates = this.allRouteDetails.filter(detail => 
      detail.maTuyenXe === maTuyenXe && 
      detail.thuTu === thuTu
    );

    console.log('Found order duplicates:', orderDuplicates);

    // Handle edit mode exclusions
    if (this.isEditMode && this.data.routeDetail) {
      const stationDuplicatesExcludingCurrent = stationDuplicates.filter(
        detail => detail.maChiTiet !== this.data.routeDetail!.maChiTiet
      );
      const orderDuplicatesExcludingCurrent = orderDuplicates.filter(
        detail => detail.maChiTiet !== this.data.routeDetail!.maChiTiet
      );

      console.log('Station duplicates excluding current:', stationDuplicatesExcludingCurrent);
      console.log('Order duplicates excluding current:', orderDuplicatesExcludingCurrent);

      if (stationDuplicatesExcludingCurrent.length > 0) {
        this.form.get('tenDiemDon')?.setErrors({ duplicate: true });
        this.snackBar.open('Tên điểm dừng đã tồn tại cho tuyến này!', 'Đóng', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        return;
      }

      if (orderDuplicatesExcludingCurrent.length > 0) {
        this.form.get('thuTu')?.setErrors({ duplicate: true });
        this.snackBar.open('Thứ tự này đã tồn tại cho tuyến này!', 'Đóng', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        return;
      }
    } else {
      // Add mode
      if (stationDuplicates.length > 0) {
        this.form.get('tenDiemDon')?.setErrors({ duplicate: true });
        this.snackBar.open('Tên điểm dừng đã tồn tại cho tuyến này!', 'Đóng', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        return;
      }

      if (orderDuplicates.length > 0) {
        this.form.get('thuTu')?.setErrors({ duplicate: true });
        this.snackBar.open('Thứ tự này đã tồn tại cho tuyến này!', 'Đóng', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        return;
      }
    }

    // If no duplicates, proceed with submission
    if (this.isEditMode && this.data.routeDetail) {
      const updateData: RouteDetailUpdate & { maChiTiet: number } = {
        maChiTiet: this.data.routeDetail.maChiTiet,
        ...formValue
      };
      console.log('Submitting update data:', updateData);
      this.dialogRef.close(updateData);
    } else {
      const createData: RouteDetailCreate = formValue;
      console.log('Submitting create data:', createData);
      this.dialogRef.close(createData);
    }
  }

  /**
   * Check if station name is duplicate for the same route
   */
  private isStationNameDuplicate(maTuyenXe: string, tenDiemDon: string, thuTu: number): boolean {
    console.log('=== CHECKING STATION DUPLICATE ===');
    console.log('Input - maTuyenXe:', maTuyenXe);
    console.log('Input - tenDiemDon:', tenDiemDon);
    console.log('Input - thuTu:', thuTu);
    console.log('Is edit mode:', this.isEditMode);
    
    if (!maTuyenXe || !tenDiemDon) {
      console.log('Missing required fields, returning false');
      return false;
    }

    const existingStations = this.allRouteDetails.filter(detail => 
      detail.maTuyenXe === maTuyenXe && 
      detail.tenDiemDon.toLowerCase().trim() === tenDiemDon.toLowerCase().trim()
    );
    
    console.log('Existing stations for route', maTuyenXe, ':', existingStations);
    
    if (this.isEditMode && this.data.routeDetail) {
      // Exclude current item when editing
      const isDuplicate = existingStations.some(station => station.maChiTiet !== this.data.routeDetail!.maChiTiet);
      console.log('Edit mode - is duplicate:', isDuplicate);
      return isDuplicate;
    }
    
    const isDuplicate = existingStations.length > 0;
    console.log('Add mode - is duplicate:', isDuplicate);
    return isDuplicate;
  }

  /**
   * Check if order number is duplicate for the same route
   */
  private isOrderNumberDuplicate(maTuyenXe: string, thuTu: number): boolean {
    console.log('=== CHECKING ORDER DUPLICATE ===');
    console.log('Input - maTuyenXe:', maTuyenXe);
    console.log('Input - thuTu:', thuTu);
    console.log('Is edit mode:', this.isEditMode);
    
    if (!maTuyenXe || !thuTu) {
      console.log('Missing required fields, returning false');
      return false;
    }

    const existingOrders = this.allRouteDetails.filter(detail => 
      detail.maTuyenXe === maTuyenXe && detail.thuTu === thuTu
    );
    
    console.log('Existing orders for route', maTuyenXe, 'with order', thuTu, ':', existingOrders);
    
    if (this.isEditMode && this.data.routeDetail) {
      // Exclude current item when editing
      const isDuplicate = existingOrders.some(station => station.maChiTiet !== this.data.routeDetail!.maChiTiet);
      console.log('Edit mode - is duplicate:', isDuplicate);
      return isDuplicate;
    }
    
    const isDuplicate = existingOrders.length > 0;
    console.log('Add mode - is duplicate:', isDuplicate);
    return isDuplicate;
  }

  /**
   * Setup real-time validation
   */
  private setupRealTimeValidation(): void {
    // Clear duplicate errors when user starts typing
    this.form.get('tenDiemDon')?.valueChanges.subscribe(() => {
      const control = this.form.get('tenDiemDon');
      if (control?.hasError('duplicate')) {
        control.setErrors(null);
      }
    });

    this.form.get('thuTu')?.valueChanges.subscribe(() => {
      const control = this.form.get('thuTu');
      if (control?.hasError('duplicate')) {
        control.setErrors(null);
      }
    });

    this.form.get('maTuyenXe')?.valueChanges.subscribe(() => {
      // Clear duplicate errors when route changes
      this.form.get('tenDiemDon')?.setErrors(null);
      this.form.get('thuTu')?.setErrors(null);
    });
  }


  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.hasError('required')) {
      return 'Trường này là bắt buộc';
    }
    if (field?.hasError('maxlength')) {
      return 'Độ dài tối đa là 100 ký tự';
    }
    if (field?.hasError('min')) {
      return 'Giá trị tối thiểu là 1';
    }
    if (field?.hasError('max')) {
      return 'Giá trị tối đa là 1000';
    }
    if (field?.hasError('duplicate')) {
      if (fieldName === 'tenDiemDon') {
        return 'Tên điểm dừng đã tồn tại cho tuyến này';
      }
      if (fieldName === 'thuTu') {
        return 'Thứ tự này đã tồn tại cho tuyến này';
      }
      return 'Giá trị đã tồn tại';
    }
    return '';
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field?.errors && field.touched);
  }
}
