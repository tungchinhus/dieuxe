import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { User, PREDEFINED_ROLES } from '../../models/user.model';

@Component({
  selector: 'app-app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
    MatBadgeModule,
    MatTooltipModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDividerModule,
    MatDialogModule
  ],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.css'
})
export class AppHeaderComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  openChangePassword(): void {
    import('../change-password/change-password.dialog').then(m => {
      this.dialog.open(m.ChangePasswordDialog, {
        width: '420px'
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    this.authService.logout();
    this.snackBar.open('Đã đăng xuất thành công!', 'Đóng', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
    this.router.navigate(['/dang-nhap']);
  }

  goToProfile(): void {
    // Navigate to user profile page (if exists)
    this.router.navigate(['/quan-ly-user']);
  }

  goToSettings(): void {
    // Navigate to settings page (if exists)
    this.router.navigate(['/quan-ly-phan-quyen']);
  }

  goToAiDemo(): void {
    this.router.navigate(['/ai-demo']);
  }

  getRoleDisplayName(roleName: string): string {
    const roleMap: { [key: string]: string } = {
      [PREDEFINED_ROLES.SUPER_ADMIN]: 'Super Admin',
      [PREDEFINED_ROLES.ADMIN]: 'Admin',
      [PREDEFINED_ROLES.MANAGER]: 'Manager',
      [PREDEFINED_ROLES.USER]: 'User',
      [PREDEFINED_ROLES.VIEWER]: 'Viewer'
    };
    return roleMap[roleName] || roleName;
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

  getInitials(fullName: string): string {
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
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
}
