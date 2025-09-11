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
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Observable, map, startWith } from 'rxjs';

import { Registration, Department, WorkShift, Route, RegistrationFormData } from '../../../models/registration.model';
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
    MatToolbarModule,
    MatAutocompleteModule
  ],
  providers: [
    // Add datepicker providers
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' }
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
  
  // Autocomplete properties
  allStations: string[] = [];
  filteredStations!: Observable<string[]>;

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
    this.loadStations();
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.registration) {
      this.populateForm(this.data.registration);
    }
    
    // Setup autocomplete for stations
    this.setupStationAutocomplete();
  }

  private initializeForm(): void {
    // Get today's date in Vietnam timezone
    const today = new Date();
    const vietnamDate = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
    const todayString = vietnamDate.toISOString().split('T')[0];
    
    this.registrationForm = this.fb.group({
      maNhanVien: ['', [Validators.required, Validators.minLength(3)]],
      hoTen: ['', [Validators.required, Validators.minLength(2)]],
      dienThoai: ['', [Validators.required, Validators.pattern(/^[0-9\s\-\+\(\)]+$/)]],
      ngayDangKy: [todayString, Validators.required],
      loaiCa: ['', Validators.required],
      thoiGianBatDau: ['', Validators.required],
      thoiGianKetThuc: ['', Validators.required],
      maTuyenXe: [''],
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
      thoiGianBatDau: this.convertToExcelFormat(registration.thoiGianBatDau),
      thoiGianKetThuc: this.convertToExcelFormat(registration.thoiGianKetThuc),
      maTuyenXe: registration.maTuyenXe,
      tramXe: registration.tramXe,
      noiDungCongViec: registration.noiDungCongViec,
      dangKyCom: registration.dangKyCom
    });

  }




  onSubmit(): void {
    if (this.registrationForm.valid) {
      const formData: RegistrationFormData = this.registrationForm.value;
      
      // Ensure time fields are properly formatted
      if (formData.thoiGianBatDau) {
        formData.thoiGianBatDau = this.formatTimeForSubmission(formData.thoiGianBatDau);
      }
      if (formData.thoiGianKetThuc) {
        formData.thoiGianKetThuc = this.formatTimeForSubmission(formData.thoiGianKetThuc);
      }
      
      this.dialogRef.close(formData);
    } else {
      this.markFormGroupTouched();
    }
  }

  /**
   * Format time for submission to ensure consistent Excel format
   */
  private formatTimeForSubmission(timeString: string): string {
    if (!timeString) return '';
    
    // Convert to Excel format (15h45, 19h)
    return this.convertToExcelFormat(timeString);
  }

  /**
   * Convert time to Excel format (15h45, 19h)
   */
  private convertToExcelFormat(timeString: string): string {
    if (!timeString) return '';
    
    // Handle different time formats and convert to Excel format
    if (timeString.includes('h')) {
      // Already in Excel format
      return timeString;
    } else if (timeString.includes(':')) {
      // Convert from "15:45" format to "15h45"
      return timeString.replace(':', 'h');
    } else if (timeString.length === 4 && !isNaN(Number(timeString))) {
      // Convert from "1545" format to "15h45"
      return timeString.substring(0, 2) + 'h' + timeString.substring(2);
    }
    
    return timeString;
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

  /**
   * Load stations from chiTietTuyenDuong
   */
  private async loadStations(): Promise<void> {
    try {
      this.routeDetailService.getRouteDetails().subscribe(routeDetails => {
        this.allStations = routeDetails.map(rd => rd.tenDiemDon).filter((station, index, self) => 
          station && self.indexOf(station) === index
        ).sort();
        console.log('Loaded stations:', this.allStations);
      });
    } catch (error) {
      console.error('Error loading stations:', error);
      this.allStations = [];
    }
  }

  /**
   * Setup autocomplete for stations
   */
  private setupStationAutocomplete(): void {
    this.filteredStations = this.registrationForm.get('tramXe')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterStations(value || ''))
    );
  }

  /**
   * Filter stations based on input
   */
  private _filterStations(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.allStations.filter(station => 
      station.toLowerCase().includes(filterValue)
    );
  }

  /**
   * Display function for autocomplete
   */
  displayStation(station: string): string {
    return station || '';
  }

}
