import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { SidenavService } from '../../services/sidenav.service';
import { UserManagementFirebaseService } from '../../services/user-management-firebase.service';
import { Role, Permission, PREDEFINED_ROLES } from '../../models/user.model';
import { RoleFormDialogComponent } from './role-form-dialog/role-form-dialog.component';
import { RolePermissionDialogComponent } from './role-permission-dialog/role-permission-dialog.component';

@Component({
  selector: 'app-quan-ly-phan-quyen',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatToolbarModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCheckboxModule,
    MatMenuModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatTabsModule,
    MatExpansionModule,
    MatDividerModule
  ],
  templateUrl: './quan-ly-phan-quyen.component.html',
  styleUrl: './quan-ly-phan-quyen.component.css'
})
export class QuanLyPhanQuyenComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  // Table data
  dataSource = new MatTableDataSource<Role>([]);
  displayedColumns: string[] = [
    'select',
    'name',
    'displayName',
    'description',
    'permissions',
    'isActive',
    'userCount',
    'actions'
  ];
  
  selectedRoles = new Set<string>();
  permissions: Permission[] = [];
  isCollapsed = false;
  searchTerm = '';

  constructor(
    private sidenavService: SidenavService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private userManagementService: UserManagementFirebaseService
  ) {}

  toggleSidenav(): void {
    this.isCollapsed = !this.isCollapsed;
    this.sidenavService.toggle();
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadPermissions();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private loadRoles(): void {
    this.userManagementService.getRoles().subscribe(roles => {
      this.dataSource.data = roles;
    });
  }

  private loadPermissions(): void {
    this.userManagementService.getPermissions().subscribe(permissions => {
      this.permissions = permissions;
    });
  }

  // Search functionality
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  // Dialog methods
  openAddRoleDialog(): void {
    const dialogRef = this.dialog.open(RoleFormDialogComponent, {
      width: '600px',
      data: {
        permissions: this.permissions,
        isEdit: false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.userManagementService.createRole(result).subscribe(newRole => {
          this.loadRoles();
          this.snackBar.open('Vai trò đã được tạo thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
        });
      }
    });
  }

  editRole(role: Role): void {
    const dialogRef = this.dialog.open(RoleFormDialogComponent, {
      width: '600px',
      data: {
        role: role,
        permissions: this.permissions,
        isEdit: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.userManagementService.updateRole(role.id, result).subscribe(updatedRole => {
          if (updatedRole) {
            this.loadRoles();
            this.snackBar.open('Vai trò đã được cập nhật thành công!', 'Đóng', {
              duration: 3000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            });
          }
        });
      }
    });
  }

  manageRolePermissions(role: Role): void {
    const dialogRef = this.dialog.open(RolePermissionDialogComponent, {
      width: '800px',
      data: {
        role: role,
        permissions: this.permissions
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadRoles();
        this.snackBar.open('Quyền hạn vai trò đã được cập nhật thành công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    });
  }

  deleteRole(role: Role): void {
    if (role.name === PREDEFINED_ROLES.SUPER_ADMIN) {
      this.snackBar.open('Không thể xóa vai trò Super Admin!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa vai trò ${role.displayName}?`)) {
      this.userManagementService.deleteRole(role.id).subscribe(success => {
        if (success) {
          this.loadRoles();
          this.snackBar.open('Vai trò đã được xóa thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
        }
      });
    }
  }

  deleteSelectedRoles(): void {
    if (this.selectedRoles.size === 0) {
      this.snackBar.open('Vui lòng chọn ít nhất một vai trò để xóa!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    const selectedRoles = this.dataSource.data.filter(r => this.selectedRoles.has(r.id));
    const hasSuperAdmin = selectedRoles.some(r => r.name === PREDEFINED_ROLES.SUPER_ADMIN);
    
    if (hasSuperAdmin) {
      this.snackBar.open('Không thể xóa vai trò Super Admin!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    const selectedCount = this.selectedRoles.size;
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedCount} vai trò đã chọn?`)) {
      let deletedCount = 0;

      selectedRoles.forEach(role => {
        this.userManagementService.deleteRole(role.id).subscribe(success => {
          if (success) {
            deletedCount++;
            if (deletedCount === selectedRoles.length) {
              this.loadRoles();
              this.selectedRoles.clear();
              this.snackBar.open(`Đã xóa thành công ${deletedCount} vai trò!`, 'Đóng', {
                duration: 3000,
                horizontalPosition: 'right',
                verticalPosition: 'top'
              });
            }
          }
        });
      });
    }
  }

  toggleRoleStatus(role: Role): void {
    if (role.name === PREDEFINED_ROLES.SUPER_ADMIN) {
      this.snackBar.open('Không thể vô hiệu hóa vai trò Super Admin!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    const newStatus = !role.isActive;
    this.userManagementService.updateRole(role.id, { isActive: newStatus }).subscribe(updatedRole => {
      if (updatedRole) {
        this.loadRoles();
        this.snackBar.open(
          `Vai trò đã được ${newStatus ? 'kích hoạt' : 'vô hiệu hóa'} thành công!`, 
          'Đóng', 
          {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          }
        );
      }
    });
  }

  // Selection methods
  isAllSelected(): boolean {
    return this.dataSource.data.length > 0 && this.selectedRoles.size === this.dataSource.data.length;
  }

  isIndeterminate(): boolean {
    return this.selectedRoles.size > 0 && this.selectedRoles.size < this.dataSource.data.length;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selectedRoles.clear();
    } else {
      this.dataSource.data.forEach(role => this.selectedRoles.add(role.id));
    }
  }

  toggleSelection(role: Role): void {
    if (this.selectedRoles.has(role.id)) {
      this.selectedRoles.delete(role.id);
    } else {
      this.selectedRoles.add(role.id);
    }
  }

  isSelected(role: Role): boolean {
    return this.selectedRoles.has(role.id);
  }

  getSelectedCount(): number {
    return this.selectedRoles.size;
  }

  checkboxLabel(): string {
    return 'Chọn tất cả';
  }

  // Helper methods
  getRoleColor(roleName: string): string {
    const colorMap: { [key: string]: string } = {
      [PREDEFINED_ROLES.SUPER_ADMIN]: 'warn',
      [PREDEFINED_ROLES.ADMIN]: 'accent',
      [PREDEFINED_ROLES.MANAGER]: 'primary',
      [PREDEFINED_ROLES.USER]: 'basic',
      [PREDEFINED_ROLES.VIEWER]: 'basic'
    };
    return colorMap[roleName] || 'basic';
  }

  getStatusColor(isActive: boolean): string {
    return isActive ? 'primary' : 'warn';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Hoạt động' : 'Vô hiệu hóa';
  }

  getPermissionCount(role: Role): number {
    return role.permissions ? role.permissions.length : 0;
  }

  getUserCount(role: Role): number {
    // This would need to be implemented based on your user data
    // For now, return a mock count
    return Math.floor(Math.random() * 10);
  }

  isSystemRole(roleName: string): boolean {
    return Object.values(PREDEFINED_ROLES).includes(roleName as any);
  }

  getSystemRoleIcon(roleName: string): string {
    const iconMap: { [key: string]: string } = {
      [PREDEFINED_ROLES.SUPER_ADMIN]: 'security',
      [PREDEFINED_ROLES.ADMIN]: 'admin_panel_settings',
      [PREDEFINED_ROLES.MANAGER]: 'supervisor_account',
      [PREDEFINED_ROLES.USER]: 'person',
      [PREDEFINED_ROLES.VIEWER]: 'visibility'
    };
    return iconMap[roleName] || 'security';
  }
}
