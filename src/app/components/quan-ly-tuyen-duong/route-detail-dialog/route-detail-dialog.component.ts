import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouteDetail, RouteDetailCreate, RouteDetailUpdate } from '../../../models/route-detail.model';

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
    ReactiveFormsModule
  ],
  templateUrl: './route-detail-dialog.component.html',
  styleUrl: './route-detail-dialog.component.css'
})
export class RouteDetailDialogComponent implements OnInit {
  form: FormGroup;
  isEditMode = false;

  // Mock route options - replace with actual service call
  routeOptions = [
    { value: 'T1', label: 'Tuyến 1' },
    { value: 'T2', label: 'Tuyến 2' },
    { value: 'T3', label: 'Tuyến 3' },
    { value: 'T4', label: 'Tuyến 4' },
    { value: 'T5', label: 'Tuyến 5' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RouteDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.isEditMode = data.mode === 'edit';
    this.form = this.createForm();
  }

  ngOnInit() {
    if (this.isEditMode && this.data.routeDetail) {
      this.populateForm(this.data.routeDetail);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      maTuyenXe: ['', [Validators.required]],
      tenDiemDon: ['', [Validators.required, Validators.maxLength(50)]],
      thuTu: [1, [Validators.required, Validators.min(1), Validators.max(100)]]
    });
  }

  private populateForm(routeDetail: RouteDetail) {
    this.form.patchValue({
      maTuyenXe: routeDetail.maTuyenXe,
      tenDiemDon: routeDetail.tenDiemDon,
      thuTu: routeDetail.thuTu
    });
  }

  onSubmit() {
    if (this.form.valid) {
      const formValue = this.form.value;
      
      if (this.isEditMode && this.data.routeDetail) {
        const updateData: RouteDetailUpdate = {
          maChiTiet: this.data.routeDetail.maChiTiet,
          ...formValue
        };
        this.dialogRef.close(updateData);
      } else {
        const createData: RouteDetailCreate = formValue;
        this.dialogRef.close(createData);
      }
    }
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
      return 'Độ dài tối đa là 50 ký tự';
    }
    if (field?.hasError('min')) {
      return 'Giá trị tối thiểu là 1';
    }
    if (field?.hasError('max')) {
      return 'Giá trị tối đa là 100';
    }
    return '';
  }
}
