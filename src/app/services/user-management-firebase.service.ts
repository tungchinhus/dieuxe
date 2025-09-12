import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { User, Role, Permission, UserRole, UserPermission, PREDEFINED_ROLES, PREDEFINED_PERMISSIONS } from '../models/user.model';
import { FirebaseUserManagementService } from './firebase-user-management.service';

@Injectable({
  providedIn: 'root'
})
export class UserManagementFirebaseService {
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
    // Subscribe to Firebase data
    this.firebaseUserService.users$.subscribe(users => {
      this.usersSubject.next(users);
    });

    this.firebaseUserService.roles$.subscribe(roles => {
      this.rolesSubject.next(roles);
    });

    this.firebaseUserService.permissions$.subscribe(permissions => {
      this.permissionsSubject.next(permissions);
    });
  }

  // ==================== USER METHODS ====================
  getUsers(): Observable<User[]> {
    return this.users$;
  }

  getUserById(id: string): Observable<User | undefined> {
    return new Observable(observer => {
      this.users$.subscribe(users => {
        const user = users.find(u => u.id === id);
        observer.next(user);
        observer.complete();
      });
    });
  }

  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Observable<User> {
    return new Observable(observer => {
      this.firebaseUserService.createUser(userData).then(user => {
        observer.next(user);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  updateUser(id: string, userData: Partial<User>): Observable<User | null> {
    return new Observable(observer => {
      this.firebaseUserService.updateUser(id, userData).then(user => {
        observer.next(user);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  deleteUser(id: string): Observable<boolean> {
    return new Observable(observer => {
      this.firebaseUserService.deleteUser(id).then(success => {
        observer.next(success);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  // ==================== ROLE METHODS ====================
  getRoles(): Observable<Role[]> {
    return this.roles$;
  }

  getRoleById(id: string): Observable<Role | undefined> {
    return new Observable(observer => {
      this.roles$.subscribe(roles => {
        const role = roles.find(r => r.id === id);
        observer.next(role);
        observer.complete();
      });
    });
  }

  createRole(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Observable<Role> {
    return new Observable(observer => {
      this.firebaseUserService.createRole(roleData).then(role => {
        observer.next(role);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  updateRole(id: string, roleData: Partial<Role>): Observable<Role | null> {
    return new Observable(observer => {
      this.firebaseUserService.updateRole(id, roleData).then(role => {
        observer.next(role);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  deleteRole(id: string): Observable<boolean> {
    return new Observable(observer => {
      this.firebaseUserService.deleteRole(id).then(success => {
        observer.next(success);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  // ==================== PERMISSION METHODS ====================
  getPermissions(): Observable<Permission[]> {
    return this.permissions$;
  }

  getPermissionById(id: string): Observable<Permission | undefined> {
    return new Observable(observer => {
      this.permissions$.subscribe(permissions => {
        const permission = permissions.find(p => p.id === id);
        observer.next(permission);
        observer.complete();
      });
    });
  }

  // ==================== USER ROLES & PERMISSIONS ====================
  hasRole(userId: string, roleName: string): Observable<boolean> {
    return new Observable(observer => {
      this.firebaseUserService.hasRole(userId, roleName).then(hasRole => {
        observer.next(hasRole);
        observer.complete();
      }).catch(error => {
        console.error('Error checking user role:', error);
        observer.next(false);
        observer.complete();
      });
    });
  }

  hasPermission(userId: string, permissionName: string): Observable<boolean> {
    return new Observable(observer => {
      this.firebaseUserService.hasPermission(userId, permissionName).then(hasPermission => {
        observer.next(hasPermission);
        observer.complete();
      }).catch(error => {
        console.error('Error checking user permission:', error);
        observer.next(false);
        observer.complete();
      });
    });
  }

  // ==================== HELPER METHODS ====================
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
      { id: '6', name: PREDEFINED_PERMISSIONS.DANG_KY_XE_IMPORT, displayName: 'Nhập đăng ký xe', module: 'dang_ky_xe', action: 'import', isActive: true },
      { id: '7', name: PREDEFINED_PERMISSIONS.DANG_KY_XE_APPROVE, displayName: 'Duyệt đăng ký xe', module: 'dang_ky_xe', action: 'approve', isActive: true },
      { id: '8', name: PREDEFINED_PERMISSIONS.DANG_KY_XE_REJECT, displayName: 'Từ chối đăng ký xe', module: 'dang_ky_xe', action: 'reject', isActive: true },
      { id: '9', name: PREDEFINED_PERMISSIONS.USER_VIEW, displayName: 'Xem người dùng', module: 'user', action: 'view', isActive: true },
      { id: '10', name: PREDEFINED_PERMISSIONS.USER_CREATE, displayName: 'Tạo người dùng', module: 'user', action: 'create', isActive: true },
      { id: '11', name: PREDEFINED_PERMISSIONS.USER_UPDATE, displayName: 'Sửa người dùng', module: 'user', action: 'update', isActive: true },
      { id: '12', name: PREDEFINED_PERMISSIONS.USER_DELETE, displayName: 'Xóa người dùng', module: 'user', action: 'delete', isActive: true },
      { id: '13', name: PREDEFINED_PERMISSIONS.ROLE_VIEW, displayName: 'Xem vai trò', module: 'role', action: 'view', isActive: true },
      { id: '14', name: PREDEFINED_PERMISSIONS.ROLE_CREATE, displayName: 'Tạo vai trò', module: 'role', action: 'create', isActive: true },
      { id: '15', name: PREDEFINED_PERMISSIONS.ROLE_UPDATE, displayName: 'Sửa vai trò', module: 'role', action: 'update', isActive: true },
      { id: '16', name: PREDEFINED_PERMISSIONS.ROLE_DELETE, displayName: 'Xóa vai trò', module: 'role', action: 'delete', isActive: true },
      { id: '17', name: PREDEFINED_PERMISSIONS.ROLE_ASSIGN, displayName: 'Phân quyền vai trò', module: 'role', action: 'assign', isActive: true },
      { id: '18', name: PREDEFINED_PERMISSIONS.REPORT_VIEW, displayName: 'Xem báo cáo', module: 'report', action: 'view', isActive: true },
      { id: '19', name: PREDEFINED_PERMISSIONS.REPORT_EXPORT, displayName: 'Xuất báo cáo', module: 'report', action: 'export', isActive: true },
      { id: '20', name: PREDEFINED_PERMISSIONS.SYSTEM_CONFIG, displayName: 'Cấu hình hệ thống', module: 'system', action: 'config', isActive: true }
    ];
  }
}
