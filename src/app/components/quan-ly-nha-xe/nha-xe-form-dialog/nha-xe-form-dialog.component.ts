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
import { NhaXe, TrangThaiNhaXe, NhaXeFormData } from '../../../models/garage.model';

@Component({
  selector: 'app-nha-xe-form-dialog',
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
  templateUrl: './nha-xe-form-dialog.component.html',
  styleUrl: './nha-xe-form-dialog.component.css'
})
export class NhaXeFormDialogComponent implements OnInit {
  formData: Partial<NhaXe> = {};
  isEditMode = false;
  
  // TrangThai options
  trangThaiOptions = [
    { value: TrangThaiNhaXe.HOAT_DONG, label: 'Hoạt động' },
    { value: TrangThaiNhaXe.TAM_DUNG, label: 'Tạm dừng' },
    { value: TrangThaiNhaXe.NGUNG_HOAT_DONG, label: 'Ngừng hoạt động' }
  ];

  constructor(
    public dialogRef: MatDialogRef<NhaXeFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NhaXeFormData
  ) {}

  ngOnInit(): void {
    if (this.data.nhaXe) {
      this.isEditMode = true;
      this.formData = { ...this.data.nhaXe };
    } else {
      this.initializeForm();
    }
  }

  private initializeForm(): void {
    this.formData = {
      TenNhaXe: '',
      DiaChi: '',
      SoDienThoai: '',
      Email: '',
      NguoiDaiDien: '',
      SoDienThoaiNguoiDaiDien: '',
      GhiChu: '',
      TrangThai: TrangThaiNhaXe.HOAT_DONG
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
    if (!this.formData.TenNhaXe?.trim()) {
      alert('Vui lòng nhập tên nhà xe');
      return false;
    }

    if (!this.formData.DiaChi?.trim()) {
      alert('Vui lòng nhập địa chỉ');
      return false;
    }

    if (!this.formData.SoDienThoai?.trim()) {
      alert('Vui lòng nhập số điện thoại');
      return false;
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(this.formData.SoDienThoai.replace(/\s/g, ''))) {
      alert('Số điện thoại phải có 10-11 chữ số');
      return false;
    }

    if (!this.formData.NguoiDaiDien?.trim()) {
      alert('Vui lòng nhập tên người đại diện');
      return false;
    }

    if (!this.formData.SoDienThoaiNguoiDaiDien?.trim()) {
      alert('Vui lòng nhập số điện thoại người đại diện');
      return false;
    }

    // Validate representative phone number format
    if (!phoneRegex.test(this.formData.SoDienThoaiNguoiDaiDien.replace(/\s/g, ''))) {
      alert('Số điện thoại người đại diện phải có 10-11 chữ số');
      return false;
    }

    if (!this.formData.TrangThai) {
      alert('Vui lòng chọn trạng thái');
      return false;
    }

    return true;
  }

  getTitle(): string {
    return this.isEditMode ? 'Chỉnh sửa nhà xe' : 'Thêm nhà xe mới';
  }

  getSaveButtonText(): string {
    return this.isEditMode ? 'Cập nhật' : 'Thêm mới';
  }

  formatPhoneNumber(event: any, field: string): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 11) {
      value = value.substring(0, 11);
    }
    this.formData[field as keyof NhaXe] = value as any;
  }

  formatEmail(event: any): void {
    let value = event.target.value.toLowerCase().trim();
    this.formData.Email = value;
  }

  getTrangThaiIcon(trangThai: string): string {
    const iconMap: { [key: string]: string } = {
      [TrangThaiNhaXe.HOAT_DONG]: 'check_circle',
      [TrangThaiNhaXe.TAM_DUNG]: 'pause_circle',
      [TrangThaiNhaXe.NGUNG_HOAT_DONG]: 'cancel'
    };
    
    return iconMap[trangThai] || 'info';
  }
}
