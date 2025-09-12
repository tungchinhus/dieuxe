import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Role, Permission } from '../../../models/user.model';

export interface RolePermissionData {
  role: Role;
  permissions: Permission[];
}

@Component({
  selector: 'app-role-permission-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatIconModule,
    MatTabsModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './role-permission-dialog.component.html',
  styleUrl: './role-permission-dialog.component.css'
})
export class RolePermissionDialogComponent implements OnInit {
  selectedPermissions: string[] = [];

  constructor(
    private dialogRef: MatDialogRef<RolePermissionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RolePermissionData
  ) {
    this.selectedPermissions = this.data.role.permissions?.map(p => p.id) || [];
  }

  ngOnInit(): void {
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

  onSubmit(): void {
    const selectedPermissionObjects = this.data.permissions.filter(p => 
      this.selectedPermissions.includes(p.id)
    );
    
    const result = {
      roleId: this.data.role.id,
      permissions: selectedPermissionObjects
    };
    
    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  selectAllInModule(module: string): void {
    const modulePermissions = this.getPermissionsByModule(module);
    modulePermissions.forEach(permission => {
      if (!this.selectedPermissions.includes(permission.id)) {
        this.selectedPermissions.push(permission.id);
      }
    });
  }

  deselectAllInModule(module: string): void {
    const modulePermissions = this.getPermissionsByModule(module);
    modulePermissions.forEach(permission => {
      this.selectedPermissions = this.selectedPermissions.filter(id => id !== permission.id);
    });
  }

  isAllSelectedInModule(module: string): boolean {
    const modulePermissions = this.getPermissionsByModule(module);
    return modulePermissions.every(permission => this.selectedPermissions.includes(permission.id));
  }

  isSomeSelectedInModule(module: string): boolean {
    const modulePermissions = this.getPermissionsByModule(module);
    const selectedCount = modulePermissions.filter(permission => 
      this.selectedPermissions.includes(permission.id)
    ).length;
    return selectedCount > 0 && selectedCount < modulePermissions.length;
  }
}
