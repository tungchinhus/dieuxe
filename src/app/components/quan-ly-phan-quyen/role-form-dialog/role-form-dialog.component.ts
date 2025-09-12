import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Role, Permission } from '../../../models/user.model';

export interface RoleFormData {
  role?: Role;
  permissions: Permission[];
  isEdit: boolean;
}

@Component({
  selector: 'app-role-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatChipsModule,
    MatIconModule,
    ReactiveFormsModule
  ],
  templateUrl: './role-form-dialog.component.html',
  styleUrl: './role-form-dialog.component.css'
})
export class RoleFormDialogComponent implements OnInit {
  roleForm: FormGroup;
  selectedPermissions: string[] = [];
  isEdit: boolean = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RoleFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RoleFormData
  ) {
    this.isEdit = data.isEdit;
    this.selectedPermissions = data.role?.permissions?.map(p => p.id) || [];
    
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    if (this.isEdit && this.data.role) {
      this.roleForm.patchValue({
        name: this.data.role.name,
        displayName: this.data.role.displayName,
        description: this.data.role.description || '',
        isActive: this.data.role.isActive
      });
    }
  }

  onPermissionSelectionChange(permissionId: string, isSelected: boolean): void {
    if (isSelected) {
      if (!this.selectedPermissions.includes(permissionId)) {
        this.selectedPermissions.push(permissionId);
      }
    } else {
      this.selectedPermissions = this.selectedPermissions.filter(id => id !== permissionId);
    }
  }

  isPermissionSelected(permissionId: string): boolean {
    return this.selectedPermissions.includes(permissionId);
  }

  getPermissionsByModule(module: string): Permission[] {
    return this.data.permissions.filter(p => p.module === module);
  }

  getModuleDisplayName(module: string): string {
    const moduleNames: { [key: string]: string } = {
      'dang_ky_xe': 'Đăng ký xe',
      'quan_ly_nhan_vien': 'Quản lý nhân viên',
      'quan_ly_tuyen_duong': 'Quản lý tuyến đường',
      'quan_ly_xe_dua_don': 'Quản lý xe đưa đón',
      'quan_ly_user': 'Quản lý người dùng',
      'quan_ly_phan_quyen': 'Quản lý phân quyền',
      'bao_cao': 'Báo cáo',
      'cai_dat': 'Cài đặt'
    };
    return moduleNames[module] || module;
  }

  getActionDisplayName(action: string): string {
    const actionNames: { [key: string]: string } = {
      'view': 'Xem',
      'create': 'Tạo',
      'update': 'Sửa',
      'delete': 'Xóa',
      'export': 'Xuất',
      'import': 'Import',
      'approve': 'Duyệt',
      'reject': 'Từ chối'
    };
    return actionNames[action] || action;
  }

  getUniqueModules(): string[] {
    const modules = this.data.permissions.map(p => p.module);
    return [...new Set(modules)].sort();
  }

  onSubmit(): void {
    if (this.roleForm.valid && this.selectedPermissions.length > 0) {
      const formValue = this.roleForm.value;
      const selectedPermissionObjects = this.data.permissions.filter(p => 
        this.selectedPermissions.includes(p.id)
      );
      
      const roleData = {
        ...formValue,
        permissions: selectedPermissionObjects
      };
      
      this.dialogRef.close(roleData);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const field = this.roleForm.get(fieldName);
    if (field?.hasError('required')) {
      return 'Trường này là bắt buộc';
    }
    if (field?.hasError('minlength')) {
      const requiredLength = field.errors?.['minlength'].requiredLength;
      return `Tối thiểu ${requiredLength} ký tự`;
    }
    return '';
  }

  getPermissionIcon(action: string): string {
    const iconMap: { [key: string]: string } = {
      'view': 'visibility',
      'create': 'add',
      'update': 'edit',
      'delete': 'delete',
      'export': 'download',
      'import': 'upload',
      'approve': 'check_circle',
      'reject': 'cancel'
    };
    return iconMap[action] || 'security';
  }
}
