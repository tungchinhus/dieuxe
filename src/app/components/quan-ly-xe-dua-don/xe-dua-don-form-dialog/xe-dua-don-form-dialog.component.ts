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
import { XeDuaDon, LoaiXe } from '../../../models/vehicle.model';
import { NhaXe } from '../../../models/garage.model';

export interface XeDuaDonFormData {
  xeDuaDon?: XeDuaDon;
  loaiXeOptions: { value: LoaiXe; label: string }[];
  nhaXeOptions: { value: string; label: string }[];
}

@Component({
  selector: 'app-xe-dua-don-form-dialog',
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
    MatCardModule
  ],
  templateUrl: './xe-dua-don-form-dialog.component.html',
  styleUrl: './xe-dua-don-form-dialog.component.css'
})
export class XeDuaDonFormDialogComponent implements OnInit {
  formData: Partial<XeDuaDon> = {};
  isEditMode = false;
  loaiXeOptions: { value: LoaiXe; label: string }[] = [];
  nhaXeOptions: { value: string; label: string }[] = [];

  constructor(
    public dialogRef: MatDialogRef<XeDuaDonFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: XeDuaDonFormData
  ) {
    this.loaiXeOptions = data.loaiXeOptions;
    this.nhaXeOptions = data.nhaXeOptions;
  }

  ngOnInit(): void {
    if (this.data.xeDuaDon) {
      this.isEditMode = true;
      this.formData = { ...this.data.xeDuaDon };
    } else {
      this.initializeForm();
    }
  }

  private initializeForm(): void {
    this.formData = {
      BienSoXe: '',
      TenTaiXe: '',
      SoDienThoaiTaiXe: '',
      LoaiXe: LoaiXe.XE_16_CHO,
      MaNhaXe: '',
      GhiChu: ''
    };
  }

  onSave(): void {
    if (this.validateForm()) {
      this.dialogRef.close(this.formData);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private validateForm(): boolean {
    if (!this.formData.BienSoXe?.trim()) {
      alert('Vui lòng nhập biển số xe');
      return false;
    }

    if (!this.formData.TenTaiXe?.trim()) {
      alert('Vui lòng nhập tên tài xế');
      return false;
    }

    if (!this.formData.SoDienThoaiTaiXe?.trim()) {
      alert('Vui lòng nhập số điện thoại tài xế');
      return false;
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(this.formData.SoDienThoaiTaiXe.replace(/\s/g, ''))) {
      alert('Số điện thoại phải có 10-11 chữ số');
      return false;
    }

    if (!this.formData.LoaiXe) {
      alert('Vui lòng chọn loại xe');
      return false;
    }

    return true;
  }

  getTitle(): string {
    return this.isEditMode ? 'Chỉnh sửa xe đưa đón' : 'Thêm xe đưa đón mới';
  }

  getSaveButtonText(): string {
    return this.isEditMode ? 'Cập nhật' : 'Thêm mới';
  }

  formatPhoneNumber(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 11) {
      value = value.substring(0, 11);
    }
    this.formData.SoDienThoaiTaiXe = value;
  }

  formatBienSoXe(event: any): void {
    let value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length > 10) {
      value = value.substring(0, 10);
    }
    this.formData.BienSoXe = value;
  }

  getLoaiXeIcon(loaiXe: LoaiXe): string {
    const iconMap: { [key: string]: string } = {
      [LoaiXe.XE_4_CHO]: 'directions_car',
      [LoaiXe.XE_7_CHO]: 'local_taxi',
      [LoaiXe.XE_16_CHO]: 'airport_shuttle',
      [LoaiXe.XE_29_CHO]: 'directions_bus',
      [LoaiXe.XE_45_CHO]: 'directions_bus',
      [LoaiXe.XE_TAXI_7_CHO]: 'local_taxi'
    };
    
    return iconMap[loaiXe] || 'directions_car';
  }
}
