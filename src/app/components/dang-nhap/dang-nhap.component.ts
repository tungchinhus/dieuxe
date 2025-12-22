import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dang-nhap',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatDividerModule
  ],
  templateUrl: './dang-nhap.component.html',
  styleUrl: './dang-nhap.component.css'
})
export class DangNhapComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  isLoading = false;
  hidePassword = true;
  rememberMe = false;
  private authSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      usernameOrEmail: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Load rememberMe preference from localStorage
    const rememberMePreference = localStorage.getItem('rememberMe') === 'true';
    if (rememberMePreference) {
      this.loginForm.patchValue({ rememberMe: true });
      this.rememberMe = true;
    }

    // Check if user is already logged in (with a small delay to allow auth state to restore)
    setTimeout(() => {
      if (this.authService.isAuthenticated()) {
        this.router.navigate(['/dangkyxe']);
      }
    }, 100);

    // Also subscribe to auth state changes for immediate redirect
    this.authSubscription = this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.router.navigate(['/dangkyxe']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { usernameOrEmail, password, rememberMe } = this.loginForm.value;
      
      this.authService.login(usernameOrEmail, password, rememberMe).then(result => {
        this.isLoading = false;
        
        if (result.success) {
          this.snackBar.open(result.message, 'Đóng', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
          
          // Store remember me preference
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          } else {
            localStorage.removeItem('rememberMe');
          }
          
          // Redirect to main page
          this.router.navigate(['/dangkyxe']);
        } else {
          this.snackBar.open(result.message, 'Đóng', {
            duration: 5000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      }).catch(error => {
        this.isLoading = false;
        console.error('Login error:', error);
        this.snackBar.open('Có lỗi xảy ra khi đăng nhập', 'Đóng', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.hasError('required')) {
      return 'Trường này là bắt buộc';
    }
    if (field?.hasError('minlength')) {
      const requiredLength = field.errors?.['minlength'].requiredLength;
      return `Tối thiểu ${requiredLength} ký tự`;
    }
    return '';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  // Demo accounts for testing
  fillDemoAccount(accountType: 'admin' | 'manager' | 'user'): void {
    const accounts = {
      admin: { usernameOrEmail: 'admin', password: 'admin123' },
      manager: { usernameOrEmail: 'manager1@thibidi.com', password: 'manager123' },
      user: { usernameOrEmail: 'user1@thibidi.com', password: 'user123' }
    };
    
    const account = accounts[accountType];
    this.loginForm.patchValue(account);
  }
}
