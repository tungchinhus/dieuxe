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
import { User, Role, Permission } from '../../../models/user.model';

export interface UserRoleData {
  user: User;
  roles: Role[];
}

@Component({
  selector: 'app-user-role-dialog',
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
  templateUrl: './user-role-dialog.component.html',
  styleUrl: './user-role-dialog.component.css'
})
export class UserRoleDialogComponent implements OnInit {
  selectedRoles: string[] = [];
  userPermissions: Permission[] = [];
  allPermissions: Permission[] = [];

  constructor(
    private dialogRef: MatDialogRef<UserRoleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserRoleData
  ) {
    this.selectedRoles = [...this.data.user.roles];
  }

  ngOnInit(): void {
    this.updateUserPermissions();
  }

  onRoleSelectionChange(roleId: string, isSelected: boolean): void {
    if (isSelected) {
      if (!this.selectedRoles.includes(roleId)) {
        this.selectedRoles.push(roleId);
      }
    } else {
      this.selectedRoles = this.selectedRoles.filter(id => id !== roleId);
    }
    this.updateUserPermissions();
  }

  isRoleSelected(roleId: string): boolean {
    return this.selectedRoles.includes(roleId);
  }

  private updateUserPermissions(): void {
    const selectedRoleObjects = this.data.roles.filter(role => 
      this.selectedRoles.includes(role.name)
    );
    
    // Collect all unique permissions from selected roles
    const permissionMap = new Map<string, Permission>();
    
    selectedRoleObjects.forEach(role => {
      role.permissions.forEach(permission => {
        if (!permissionMap.has(permission.id)) {
          permissionMap.set(permission.id, permission);
        }
      });
    });
    
    this.userPermissions = Array.from(permissionMap.values());
    
    // Collect all unique permissions for reference
    const allPermissionMap = new Map<string, Permission>();
    this.data.roles.forEach(role => {
      role.permissions.forEach(permission => {
        if (!allPermissionMap.has(permission.id)) {
          allPermissionMap.set(permission.id, permission);
        }
      });
    });
    
    this.allPermissions = Array.from(allPermissionMap.values());
  }

  getPermissionsByModule(module: string): Permission[] {
    return this.userPermissions.filter(p => p.module === module);
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
    const modules = this.userPermissions.map(p => p.module);
    return [...new Set(modules)].sort();
  }

  onSubmit(): void {
    const result = {
      userId: this.data.user.id,
      roles: this.selectedRoles
    };
    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getRoleDisplayName(roleName: string): string {
    const role = this.data.roles.find(r => r.name === roleName);
    return role ? role.displayName : roleName;
  }

  getRoleDescription(roleName: string): string {
    const role = this.data.roles.find(r => r.name === roleName);
    return role ? role.description || '' : '';
  }

  getRoleColor(roleName: string): string {
    const colorMap: { [key: string]: string } = {
      'super_admin': 'warn',
      'admin': 'accent',
      'manager': 'primary',
      'user': 'basic',
      'viewer': 'basic'
    };
    return colorMap[roleName] || 'basic';
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
