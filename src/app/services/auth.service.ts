import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { User } from '../models/user.model';
import { UserManagementFirebaseService } from './user-management-firebase.service';
import { FirebaseService } from './firebase.service';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';

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
    private router: Router,
    private firebaseService: FirebaseService
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    // Load from storage for initial paint (will be reconciled by onAuthStateChanged)
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

    // Subscribe Firebase auth state
    onAuthStateChanged(this.firebaseService.getAuth(), async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          this.tokenSubject.next(token);
          this.isAuthenticatedSubject.next(true);

          // Try to map Firebase user to app user by email
          const users = await this.userManagementService.getUsers().pipe(take(1)).toPromise();
          const matchedUser = (users || []).find(u => u.email?.toLowerCase() === (fbUser.email || '').toLowerCase() || u.username?.toLowerCase() === (fbUser.email || '').toLowerCase());

          if (matchedUser) {
            this.currentUserSubject.next(matchedUser);
            localStorage.setItem('currentUser', JSON.stringify(matchedUser));
            localStorage.setItem('authToken', token);
          } else {
            // Check if we have a stored user with roles - preserve them
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
              try {
                const parsedStoredUser = JSON.parse(storedUser);
                // Only create minimal user if stored user doesn't have roles or is different user
                if (parsedStoredUser.email?.toLowerCase() !== (fbUser.email || '').toLowerCase() || 
                    !parsedStoredUser.roles || parsedStoredUser.roles.length === 0) {
                  // Minimal fallback mapping if no profile found
                  const minimalUser: User = {
                    id: fbUser.uid,
                    username: fbUser.email || fbUser.uid,
                    email: fbUser.email || '',
                    fullName: fbUser.displayName || (fbUser.email || ''),
                    isActive: true,
                    roles: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                  };
                  this.currentUserSubject.next(minimalUser);
                  localStorage.setItem('currentUser', JSON.stringify(minimalUser));
                  localStorage.setItem('authToken', token);
                } else {
                  // Keep the stored user with roles, just update token
                  localStorage.setItem('authToken', token);
                }
              } catch (parseError) {
                console.error('Error parsing stored user:', parseError);
                // Minimal fallback mapping if no profile found
                const minimalUser: User = {
                  id: fbUser.uid,
                  username: fbUser.email || fbUser.uid,
                  email: fbUser.email || '',
                  fullName: fbUser.displayName || (fbUser.email || ''),
                  isActive: true,
                  roles: [],
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
                this.currentUserSubject.next(minimalUser);
                localStorage.setItem('currentUser', JSON.stringify(minimalUser));
                localStorage.setItem('authToken', token);
              }
            } else {
              // Minimal fallback mapping if no profile found
              const minimalUser: User = {
                id: fbUser.uid,
                username: fbUser.email || fbUser.uid,
                email: fbUser.email || '',
                fullName: fbUser.displayName || (fbUser.email || ''),
                isActive: true,
                roles: [],
                createdAt: new Date(),
                updatedAt: new Date()
              };
              this.currentUserSubject.next(minimalUser);
              localStorage.setItem('currentUser', JSON.stringify(minimalUser));
              localStorage.setItem('authToken', token);
            }
          }
        } catch (err) {
          console.error('Error handling auth state change:', err);
          this.clearAuthData();
        }
      } else {
        this.clearAuthData();
      }
    });
  }

  async login(usernameOrEmail: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      // Allow login by username OR email
      const input = (usernameOrEmail || '').trim();

      let signInEmail = input;
      if (!input.includes('@')) {
        // Treat as username → find corresponding email from user directory
        try {
          const users = await this.userManagementService.getUsers().pipe(take(1)).toPromise() || [];
          const matchedByUsername = users.find(u => (u.username || '').toLowerCase().trim() === input.toLowerCase());
          if (matchedByUsername?.email) {
            signInEmail = matchedByUsername.email;
          }
        } catch (userLookupError) {
          console.warn('Could not lookup user by username, proceeding with original input:', userLookupError);
          // If we can't lookup users, try the input as email anyway
        }
      }

      // Check if auth instance is available
      const auth = this.firebaseService.getAuth();
      if (!auth) {
        throw new Error('Firebase Auth not initialized');
      }

      // Use Firebase Auth with resolved email
      console.log('Attempting login with email:', signInEmail);
      const credential = await signInWithEmailAndPassword(auth, signInEmail, password);
      const fbUser = credential.user;
      const token = await fbUser.getIdToken();

      // Map Firebase user to app user by email/username
      const users = await this.userManagementService.getUsers().pipe(take(1)).toPromise() || [];
      const appUser = users.find(u =>
        (u.email || '').toLowerCase() === (fbUser.email || '').toLowerCase() ||
        (u.username || '').toLowerCase() === input.toLowerCase()
      );

      if (!appUser) {
        // Allow login but with minimal user; optional: restrict if no profile
        const minimalUser: User = {
          id: fbUser.uid,
          username: fbUser.email || fbUser.uid,
          email: fbUser.email || '',
          fullName: fbUser.displayName || (fbUser.email || ''),
          isActive: true,
          roles: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this.setAuthData(minimalUser, token);
        this.router.navigate(['/dangkyxe']);
        return { success: true, message: 'Đăng nhập thành công', user: minimalUser };
      }

      // Update last login (best-effort)
      try {
        await this.userManagementService.updateUser(appUser.id, { lastLogin: new Date() }).pipe(take(1)).toPromise();
      } catch (updateError) {
        console.warn('Could not update last login:', updateError);
      }

      this.setAuthData(appUser, token);
      this.router.navigate(['/dangkyxe']);
      return { success: true, message: 'Đăng nhập thành công', user: appUser };
    } catch (error: any) {
      console.error('Firebase login error:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      
      let message = this.translateFirebaseError(error?.code);
      
      // Handle network-request-failed specifically
      if (error?.code === 'auth/network-request-failed') {
        message = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.';
        console.error('Network request failed - possible causes:');
        console.error('1. No internet connection');
        console.error('2. Firebase API keys blocked');
        console.error('3. App Check blocking requests');
        console.error('4. CORS issues');
        console.error('5. Firebase project configuration issues');
      }
      
      return { success: false, message: message || 'Tên đăng nhập hoặc mật khẩu không đúng' };
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const auth = this.firebaseService.getAuth();
      const fbUser = auth.currentUser;
      if (!fbUser || !fbUser.email) {
        return { success: false, message: 'Không xác định được người dùng hiện tại' };
      }

      const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
      await reauthenticateWithCredential(fbUser, credential);
      await updatePassword(fbUser, newPassword);

      return { success: true, message: 'Đổi mật khẩu thành công' };
    } catch (error: any) {
      console.error('Change password error:', error);
      let message = 'Không thể đổi mật khẩu';
      switch (error?.code) {
        case 'auth/weak-password':
          message = 'Mật khẩu mới quá yếu';
          break;
        case 'auth/wrong-password':
          message = 'Mật khẩu hiện tại không đúng';
          break;
        case 'auth/too-many-requests':
          message = 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau';
          break;
        default:
          break;
      }
      return { success: false, message };
    }
  }

  logout(): void {
    signOut(this.firebaseService.getAuth()).finally(() => {
      this.clearAuthData();
      this.router.navigate(['/dang-nhap']);
    });
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

  /**
   * Ensure user has valid roles, refresh from Firebase if needed
   */
  async ensureUserRoles(): Promise<void> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !currentUser.roles || currentUser.roles.length === 0) {
      console.log('User has no roles, attempting to refresh from Firebase...');
      await this.refreshUserData();
    }
  }

  /**
   * Check if current user has any of the specified roles
   */
  hasAnyRoleSync(roleNames: string[]): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !currentUser.roles) {
      return false;
    }
    return currentUser.roles.some(userRole => {
      const roleName = typeof userRole === 'string' ? userRole : (userRole as any).name;
      return roleNames.includes(roleName);
    });
  }

  // Token validity handled by Firebase; keep 24h fallback for stored token
  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1] || ''));
      const nowSeconds = Math.floor(Date.now() / 1000);
      return tokenData && tokenData.exp && nowSeconds < tokenData.exp;
    } catch (error) {
      return false;
    }
  }

  async refreshUserData(): Promise<void> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;
    
    try {
      // Try to get fresh user data from Firebase
      const users = await this.userManagementService.getUsers().pipe(take(1)).toPromise();
      const freshUser = (users || []).find(u => u.id === currentUser.id || u.email?.toLowerCase() === currentUser.email?.toLowerCase());
      
      if (freshUser) {
        // Update with fresh data from Firebase
        this.currentUserSubject.next(freshUser);
        localStorage.setItem('currentUser', JSON.stringify(freshUser));
      } else {
        // If not found in Firebase, keep current user data (preserve roles)
        console.warn('User not found in Firebase, keeping current data');
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      // Keep current user data on error
    }
  }

  private setAuthData(user: User, token: string): void {
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
    this.tokenSubject.next(token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('authToken', token);
  }

  private clearAuthData(): void {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.tokenSubject.next(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
  }

  private translateFirebaseError(code?: string): string | null {
    switch (code) {
      case 'auth/invalid-email':
        return 'Email không hợp lệ';
      case 'auth/user-disabled':
        return 'Tài khoản đã bị vô hiệu hóa';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Tên đăng nhập hoặc mật khẩu không đúng';
      case 'auth/too-many-requests':
        return 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau';
      case 'auth/network-request-failed':
        return 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.';
      case 'auth/invalid-api-key':
        return 'API key không hợp lệ. Vui lòng liên hệ quản trị viên.';
      case 'auth/app-not-authorized':
        return 'Ứng dụng chưa được ủy quyền. Vui lòng liên hệ quản trị viên.';
      default:
        return null;
    }
  }
}
