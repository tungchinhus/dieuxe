import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { User } from '../models/user.model';
import { UserManagementFirebaseService } from './user-management-firebase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();

  constructor(
    private userManagementService: UserManagementFirebaseService,
    private router: Router
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    // Check for stored authentication data
    const storedUser = localStorage.getItem('currentUser');
    const storedToken = localStorage.getItem('authToken');
    
    if (storedUser && storedToken) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        this.tokenSubject.next(storedToken);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.clearAuthData();
      }
    }
  }

  async login(username: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      // Try Firebase first
      let users: User[] = [];
      try {
        users = await this.userManagementService.getUsers().pipe(take(1)).toPromise() || [];
        console.log('Users from Firebase:', users);
      } catch (firebaseError) {
        console.log('Firebase error, trying localStorage:', firebaseError);
        // Fallback to localStorage
        const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
        users = localUsers.map((u: any) => ({
          ...u,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
          lastLogin: u.lastLogin ? new Date(u.lastLogin) : undefined
        }));
        console.log('Users from localStorage:', users);
      }
      
      if (!users || users.length === 0) {
        return { success: false, message: 'Không thể tải danh sách người dùng' };
      }

      const user = users.find(u => 
        u.username === username && 
        u.isActive &&
        this.validatePassword(username, password)
      );

      if (!user) {
        return { 
          success: false, 
          message: 'Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản đã bị vô hiệu hóa' 
        };
      }

      // Generate a simple token (in real app, this would come from server)
      const token = this.generateToken(user);
      
      // Update last login (try Firebase first, fallback to localStorage)
      try {
        await this.userManagementService.updateUser(user.id, { 
          lastLogin: new Date() 
        }).pipe(take(1)).toPromise();
      } catch (updateError) {
        console.log('Could not update last login in Firebase, updating localStorage');
        const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = localUsers.findIndex((u: any) => u.id === user.id);
        if (userIndex !== -1) {
          localUsers[userIndex].lastLogin = new Date();
          localStorage.setItem('users', JSON.stringify(localUsers));
        }
      }

      // Store authentication data
      this.setAuthData(user, token);
      
      // Navigate to dashboard after successful login
      this.router.navigate(['/dangkyxe']);
      
      return { success: true, message: 'Đăng nhập thành công', user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Có lỗi xảy ra khi đăng nhập' };
    }
  }

  logout(): void {
    this.clearAuthData();
    // Navigate to login page after logout
    this.router.navigate(['/dang-nhap']);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  hasPermission(permission: string): Observable<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return of(false);
    }
    return this.userManagementService.hasPermission(currentUser.id, permission);
  }

  hasRole(roleName: string): Observable<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return of(false);
    }
    return this.userManagementService.hasRole(currentUser.id, roleName);
  }

  hasAnyRole(roleNames: string[]): Observable<boolean> {
    const currentUser = this.getCurrentUser();
    console.log('hasAnyRole - currentUser:', currentUser);
    console.log('hasAnyRole - roleNames:', roleNames);
    
    if (!currentUser || !currentUser.roles) {
      console.log('hasAnyRole - no current user or roles');
      return of(false);
    }
    
    // Check if user has any of the required roles directly from user object
    const hasAnyRole = currentUser.roles.some(userRole => {
      const roleName = typeof userRole === 'string' ? userRole : (userRole as any).name;
      return roleNames.includes(roleName);
    });
    
    console.log('hasAnyRole - final result:', hasAnyRole);
    return of(hasAnyRole);
  }

  private validatePassword(username: string, password: string): boolean {
    // Simple password validation for demo
    // In a real application, this would be handled by a secure backend
    const passwordMap: { [key: string]: string } = {
      'admin': 'admin123',
      'manager1': 'manager123',
      'user1': 'user123',
      'chinhdo': 'chinhdo123'
    };
    
    return passwordMap[username] === password;
  }

  private generateToken(user: User): string {
    // Simple token generation for demo
    // In a real application, this would be a JWT from the server
    const tokenData = {
      userId: user.id,
      username: user.username,
      roles: user.roles,
      timestamp: Date.now()
    };
    
    return btoa(JSON.stringify(tokenData));
  }

  private setAuthData(user: User, token: string): void {
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
    this.tokenSubject.next(token);
    
    // Store in localStorage
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('authToken', token);
  }

  private clearAuthData(): void {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.tokenSubject.next(null);
    
    // Clear localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
  }

  // Check if token is still valid
  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const tokenData = JSON.parse(atob(token));
      const now = Date.now();
      const tokenAge = now - tokenData.timestamp;
      
      // Token expires after 24 hours
      const maxAge = 24 * 60 * 60 * 1000;
      return tokenAge < maxAge;
    } catch (error) {
      return false;
    }
  }

  // Refresh user data
  async refreshUserData(): Promise<void> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;
    
    try {
      const user = await this.userManagementService.getUserById(currentUser.id).toPromise();
      if (user) {
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }
}
