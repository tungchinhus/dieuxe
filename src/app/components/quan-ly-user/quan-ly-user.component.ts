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
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { SidenavService } from '../../services/sidenav.service';
import { UserManagementFirebaseService } from '../../services/user-management-firebase.service';
import { User, Role, PREDEFINED_ROLES } from '../../models/user.model';
import { UserFormDialogComponent } from './user-form-dialog/user-form-dialog.component';
import { UserRoleDialogComponent } from './user-role-dialog/user-role-dialog.component';

@Component({
  selector: 'app-quan-ly-user',
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
    MatSelectModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatTabsModule,
    MatExpansionModule,
    MatDividerModule
  ],
  templateUrl: './quan-ly-user.component.html',
  styleUrl: './quan-ly-user.component.css'
})
export class QuanLyUserComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  // Table data
  dataSource = new MatTableDataSource<User>([]);
  displayedColumns: string[] = [
    'select',
    'username',
    'fullName',
    'email',
    'department',
    'position',
    'roles',
    'isActive',
    'lastLogin',
    'actions'
  ];
  
  selectedUsers = new Set<string>();
  roles: Role[] = [];
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
    this.loadUsers();
    this.loadRoles();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private loadUsers(): void {
    this.userManagementService.getUsers().subscribe(users => {
      this.dataSource.data = users;
    });
  }

  private loadRoles(): void {
    this.userManagementService.getRoles().subscribe(roles => {
      this.roles = roles;
    });
  }

  // Search functionality
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  // Dialog methods
  openAddUserDialog(): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '600px',
      data: {
        roles: this.roles,
        isEdit: false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.userManagementService.createUser(result).subscribe(newUser => {
          this.loadUsers();
          this.snackBar.open('Người dùng đã được tạo thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
        });
      }
    });
  }

  editUser(user: User): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '600px',
      data: {
        user: user,
        roles: this.roles,
        isEdit: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.userManagementService.updateUser(user.id, result).subscribe(updatedUser => {
          if (updatedUser) {
            this.loadUsers();
            this.snackBar.open('Người dùng đã được cập nhật thành công!', 'Đóng', {
              duration: 3000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            });
          }
        });
      }
    });
  }

  manageUserRoles(user: User): void {
    const dialogRef = this.dialog.open(UserRoleDialogComponent, {
      width: '700px',
      data: {
        user: user,
        roles: this.roles
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadUsers();
        this.snackBar.open('Vai trò người dùng đã được cập nhật thành công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    });
  }

  deleteUser(user: User): void {
    if (confirm(`Bạn có chắc chắn muốn xóa người dùng ${user.fullName}?`)) {
      this.userManagementService.deleteUser(user.id).subscribe(success => {
        if (success) {
          this.loadUsers();
          this.snackBar.open('Người dùng đã được xóa thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
        }
      });
    }
  }

  deleteSelectedUsers(): void {
    if (this.selectedUsers.size === 0) {
      this.snackBar.open('Vui lòng chọn ít nhất một người dùng để xóa!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    const selectedCount = this.selectedUsers.size;
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedCount} người dùng đã chọn?`)) {
      const selectedUsers = this.dataSource.data.filter(u => this.selectedUsers.has(u.id));
      let deletedCount = 0;

      selectedUsers.forEach(user => {
        this.userManagementService.deleteUser(user.id).subscribe(success => {
          if (success) {
            deletedCount++;
            if (deletedCount === selectedUsers.length) {
              this.loadUsers();
              this.selectedUsers.clear();
              this.snackBar.open(`Đã xóa thành công ${deletedCount} người dùng!`, 'Đóng', {
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

  toggleUserStatus(user: User): void {
    const newStatus = !user.isActive;
    this.userManagementService.updateUser(user.id, { isActive: newStatus }).subscribe(updatedUser => {
      if (updatedUser) {
        this.loadUsers();
        this.snackBar.open(
          `Người dùng đã được ${newStatus ? 'kích hoạt' : 'vô hiệu hóa'} thành công!`, 
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
    return this.dataSource.data.length > 0 && this.selectedUsers.size === this.dataSource.data.length;
  }

  isIndeterminate(): boolean {
    return this.selectedUsers.size > 0 && this.selectedUsers.size < this.dataSource.data.length;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selectedUsers.clear();
    } else {
      this.dataSource.data.forEach(user => this.selectedUsers.add(user.id));
    }
  }

  toggleSelection(user: User): void {
    if (this.selectedUsers.has(user.id)) {
      this.selectedUsers.delete(user.id);
    } else {
      this.selectedUsers.add(user.id);
    }
  }

  isSelected(user: User): boolean {
    return this.selectedUsers.has(user.id);
  }

  getSelectedCount(): number {
    return this.selectedUsers.size;
  }

  checkboxLabel(): string {
    return 'Chọn tất cả';
  }

  // Helper methods
  getRoleDisplayName(roleName: string): string {
    const role = this.roles.find(r => r.name === roleName);
    return role ? role.displayName : roleName;
  }

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

  formatLastLogin(lastLogin: Date | undefined): string {
    if (!lastLogin) return 'Chưa đăng nhập';
    
    const now = new Date();
    const diffMs = now.getTime() - lastLogin.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return lastLogin.toLocaleDateString('vi-VN');
  }

  getStatusColor(isActive: boolean): string {
    return isActive ? 'primary' : 'warn';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Hoạt động' : 'Vô hiệu hóa';
  }
}
