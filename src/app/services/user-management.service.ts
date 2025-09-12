import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { User, Role, Permission, UserRole, UserPermission, PREDEFINED_ROLES, PREDEFINED_PERMISSIONS } from '../models/user.model';
import { FirebaseUserManagementService } from './firebase-user-management.service';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private usersSubject = new BehaviorSubject<User[]>([]);
  private rolesSubject = new BehaviorSubject<Role[]>([]);
  private permissionsSubject = new BehaviorSubject<Permission[]>([]);
  private currentUserSubject = new BehaviorSubject<User | null>(null);

  public users$ = this.usersSubject.asObservable();
  public roles$ = this.rolesSubject.asObservable();
  public permissions$ = this.permissionsSubject.asObservable();
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private firebaseUserService: FirebaseUserManagementService) {
    this.initializeData();
  }

  private initializeData(): void {
    // Initialize with sample data
    const sampleUsers: User[] = [
      {
        id: '1',
        username: 'admin',
        email: 'admin@company.com',
        fullName: 'Quản trị viên',
        phone: '0901234567',
        department: 'IT',
        position: 'System Administrator',
        isActive: true,
        roles: [PREDEFINED_ROLES.SUPER_ADMIN],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastLogin: new Date(),
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        id: '2',
        username: 'manager1',
        email: 'manager1@company.com',
        fullName: 'Nguyễn Văn A',
        phone: '0901234568',
        department: 'HR',
        position: 'HR Manager',
        isActive: true,
        roles: [PREDEFINED_ROLES.MANAGER],
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        lastLogin: new Date(),
        createdBy: 'admin',
        updatedBy: 'admin'
      },
      {
        id: '3',
        username: 'user1',
        email: 'user1@company.com',
        fullName: 'Trần Thị B',
        phone: '0901234569',
        department: 'Operations',
        position: 'Staff',
        isActive: true,
        roles: [PREDEFINED_ROLES.USER],
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-03'),
        lastLogin: new Date(),
        createdBy: 'manager1',
        updatedBy: 'manager1'
      }
    ];

    const sampleRoles: Role[] = [
      {
        id: '1',
        name: PREDEFINED_ROLES.SUPER_ADMIN,
        displayName: 'Super Administrator',
        description: 'Toàn quyền truy cập hệ thống',
        permissions: this.getAllPermissions(),
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        id: '2',
        name: PREDEFINED_ROLES.ADMIN,
        displayName: 'Administrator',
        description: 'Quản trị viên hệ thống',
        permissions: this.getAdminPermissions(),
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        id: '3',
        name: PREDEFINED_ROLES.MANAGER,
        displayName: 'Manager',
        description: 'Quản lý cấp trung',
        permissions: this.getManagerPermissions(),
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        id: '4',
        name: PREDEFINED_ROLES.USER,
        displayName: 'User',
        description: 'Người dùng thông thường',
        permissions: this.getUserPermissions(),
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        id: '5',
        name: PREDEFINED_ROLES.VIEWER,
        displayName: 'Viewer',
        description: 'Chỉ xem dữ liệu',
        permissions: this.getViewerPermissions(),
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        createdBy: 'system',
        updatedBy: 'system'
      }
    ];

    this.usersSubject.next(sampleUsers);
    this.rolesSubject.next(sampleRoles);
    this.permissionsSubject.next(this.getAllPermissions());
  }

  // User Management Methods
  getUsers(): Observable<User[]> {
    return this.users$;
  }

  getUserById(id: string): Observable<User | undefined> {
    const users = this.usersSubject.value;
    const user = users.find(u => u.id === id);
    return of(user);
  }

  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Observable<User> {
    const newUser: User = {
      ...user,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const currentUsers = this.usersSubject.value;
    this.usersSubject.next([...currentUsers, newUser]);
    
    return of(newUser);
  }

  updateUser(id: string, userData: Partial<User>): Observable<User | null> {
    const currentUsers = this.usersSubject.value;
    const userIndex = currentUsers.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return of(null);
    }

    const updatedUser: User = {
      ...currentUsers[userIndex],
      ...userData,
      updatedAt: new Date()
    };

    currentUsers[userIndex] = updatedUser;
    this.usersSubject.next([...currentUsers]);
    
    return of(updatedUser);
  }

  deleteUser(id: string): Observable<boolean> {
    const currentUsers = this.usersSubject.value;
    const filteredUsers = currentUsers.filter(u => u.id !== id);
    
    if (filteredUsers.length === currentUsers.length) {
      return of(false);
    }

    this.usersSubject.next(filteredUsers);
    return of(true);
  }

  // Role Management Methods
  getRoles(): Observable<Role[]> {
    return this.roles$;
  }

  getRoleById(id: string): Observable<Role | undefined> {
    const roles = this.rolesSubject.value;
    const role = roles.find(r => r.id === id);
    return of(role);
  }

  createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Observable<Role> {
    const newRole: Role = {
      ...role,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const currentRoles = this.rolesSubject.value;
    this.rolesSubject.next([...currentRoles, newRole]);
    
    return of(newRole);
  }

  updateRole(id: string, roleData: Partial<Role>): Observable<Role | null> {
    const currentRoles = this.rolesSubject.value;
    const roleIndex = currentRoles.findIndex(r => r.id === id);
    
    if (roleIndex === -1) {
      return of(null);
    }

    const updatedRole: Role = {
      ...currentRoles[roleIndex],
      ...roleData,
      updatedAt: new Date()
    };

    currentRoles[roleIndex] = updatedRole;
    this.rolesSubject.next([...currentRoles]);
    
    return of(updatedRole);
  }

  deleteRole(id: string): Observable<boolean> {
    const currentRoles = this.rolesSubject.value;
    const filteredRoles = currentRoles.filter(r => r.id !== id);
    
    if (filteredRoles.length === currentRoles.length) {
      return of(false);
    }

    this.rolesSubject.next(filteredRoles);
    return of(true);
  }

  // Permission Management Methods
  getPermissions(): Observable<Permission[]> {
    return this.permissions$;
  }

  // User-Role Assignment Methods
  assignRoleToUser(userId: string, roleId: string): Observable<boolean> {
    const currentUsers = this.usersSubject.value;
    const userIndex = currentUsers.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return of(false);
    }

    const user = currentUsers[userIndex];
    if (!user.roles.includes(roleId)) {
      user.roles.push(roleId);
      user.updatedAt = new Date();
      currentUsers[userIndex] = user;
      this.usersSubject.next([...currentUsers]);
    }

    return of(true);
  }

  removeRoleFromUser(userId: string, roleId: string): Observable<boolean> {
    const currentUsers = this.usersSubject.value;
    const userIndex = currentUsers.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return of(false);
    }

    const user = currentUsers[userIndex];
    user.roles = user.roles.filter(role => role !== roleId);
    user.updatedAt = new Date();
    currentUsers[userIndex] = user;
    this.usersSubject.next([...currentUsers]);

    return of(true);
  }

  // Authentication Methods
  login(username: string, password: string): Observable<User | null> {
    const users = this.usersSubject.value;
    const user = users.find(u => u.username === username && u.isActive);
    
    if (user) {
      this.currentUserSubject.next(user);
      // Update last login
      this.updateUser(user.id, { lastLogin: new Date() }).subscribe();
    }
    
    return of(user || null);
  }

  logout(): void {
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): Observable<User | null> {
    return this.currentUser$;
  }

  // Permission Check Methods
  hasPermission(userId: string, permission: string): Observable<boolean> {
    const users = this.usersSubject.value;
    const roles = this.rolesSubject.value;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return of(false);
    }

    const userRoles = roles.filter(role => user.roles.includes(role.id));
    const hasPermission = userRoles.some(role => 
      role.permissions.some(perm => perm.name === permission)
    );

    return of(hasPermission);
  }

  hasRole(userId: string, roleName: string): Observable<boolean> {
    const users = this.usersSubject.value;
    const user = users.find(u => u.id === userId);
    
    console.log('hasRole - userId:', userId, 'roleName:', roleName);
    console.log('hasRole - user:', user);
    console.log('hasRole - user.roles:', user?.roles);
    
    if (!user) {
      console.log('hasRole - user not found');
      return of(false);
    }

    const hasRole = user.roles.some(role => {
      const roleNameToCheck = typeof role === 'string' ? role : (role as any).name;
      console.log('hasRole - checking role:', roleNameToCheck, 'against:', roleName);
      return roleNameToCheck === roleName;
    });
    
    console.log('hasRole - result:', hasRole);
    return of(hasRole);
  }

  // Helper Methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getAllPermissions(): Permission[] {
    return [
      { id: '1', name: PREDEFINED_PERMISSIONS.DANG_KY_XE_VIEW, displayName: 'Xem đăng ký xe', module: 'dang_ky_xe', action: 'view', isActive: true },
      { id: '2', name: PREDEFINED_PERMISSIONS.DANG_KY_XE_CREATE, displayName: 'Tạo đăng ký xe', module: 'dang_ky_xe', action: 'create', isActive: true },
      { id: '3', name: PREDEFINED_PERMISSIONS.DANG_KY_XE_UPDATE, displayName: 'Sửa đăng ký xe', module: 'dang_ky_xe', action: 'update', isActive: true },
      { id: '4', name: PREDEFINED_PERMISSIONS.DANG_KY_XE_DELETE, displayName: 'Xóa đăng ký xe', module: 'dang_ky_xe', action: 'delete', isActive: true },
      { id: '5', name: PREDEFINED_PERMISSIONS.DANG_KY_XE_EXPORT, displayName: 'Xuất đăng ký xe', module: 'dang_ky_xe', action: 'export', isActive: true },
      { id: '6', name: PREDEFINED_PERMISSIONS.DANG_KY_XE_IMPORT, displayName: 'Import đăng ký xe', module: 'dang_ky_xe', action: 'import', isActive: true },
      { id: '7', name: PREDEFINED_PERMISSIONS.NHAN_VIEN_VIEW, displayName: 'Xem nhân viên', module: 'quan_ly_nhan_vien', action: 'view', isActive: true },
      { id: '8', name: PREDEFINED_PERMISSIONS.NHAN_VIEN_CREATE, displayName: 'Tạo nhân viên', module: 'quan_ly_nhan_vien', action: 'create', isActive: true },
      { id: '9', name: PREDEFINED_PERMISSIONS.NHAN_VIEN_UPDATE, displayName: 'Sửa nhân viên', module: 'quan_ly_nhan_vien', action: 'update', isActive: true },
      { id: '10', name: PREDEFINED_PERMISSIONS.NHAN_VIEN_DELETE, displayName: 'Xóa nhân viên', module: 'quan_ly_nhan_vien', action: 'delete', isActive: true },
      { id: '11', name: PREDEFINED_PERMISSIONS.USER_VIEW, displayName: 'Xem người dùng', module: 'quan_ly_user', action: 'view', isActive: true },
      { id: '12', name: PREDEFINED_PERMISSIONS.USER_CREATE, displayName: 'Tạo người dùng', module: 'quan_ly_user', action: 'create', isActive: true },
      { id: '13', name: PREDEFINED_PERMISSIONS.USER_UPDATE, displayName: 'Sửa người dùng', module: 'quan_ly_user', action: 'update', isActive: true },
      { id: '14', name: PREDEFINED_PERMISSIONS.USER_DELETE, displayName: 'Xóa người dùng', module: 'quan_ly_user', action: 'delete', isActive: true },
      { id: '15', name: PREDEFINED_PERMISSIONS.ROLE_VIEW, displayName: 'Xem vai trò', module: 'quan_ly_phan_quyen', action: 'view', isActive: true },
      { id: '16', name: PREDEFINED_PERMISSIONS.ROLE_CREATE, displayName: 'Tạo vai trò', module: 'quan_ly_phan_quyen', action: 'create', isActive: true },
      { id: '17', name: PREDEFINED_PERMISSIONS.ROLE_UPDATE, displayName: 'Sửa vai trò', module: 'quan_ly_phan_quyen', action: 'update', isActive: true },
      { id: '18', name: PREDEFINED_PERMISSIONS.ROLE_DELETE, displayName: 'Xóa vai trò', module: 'quan_ly_phan_quyen', action: 'delete', isActive: true }
    ];
  }

  private getAdminPermissions(): Permission[] {
    return this.getAllPermissions().filter(p => 
      !p.name.includes('user_') && !p.name.includes('role_')
    );
  }

  private getManagerPermissions(): Permission[] {
    return this.getAllPermissions().filter(p => 
      p.name.includes('view') || p.name.includes('export') || 
      (p.name.includes('dang_ky_xe') && !p.name.includes('delete'))
    );
  }

  private getUserPermissions(): Permission[] {
    return this.getAllPermissions().filter(p => 
      p.name.includes('view') || 
      (p.name.includes('dang_ky_xe') && (p.name.includes('create') || p.name.includes('update')))
    );
  }

  private getViewerPermissions(): Permission[] {
    return this.getAllPermissions().filter(p => 
      p.name.includes('view') || p.name.includes('export')
    );
  }
}
