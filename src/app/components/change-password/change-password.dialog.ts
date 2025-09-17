import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
  <h2 mat-dialog-title>Đổi mật khẩu</h2>
  <div mat-dialog-content>
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Mật khẩu hiện tại</mat-label>
        <input matInput [type]="hideCurrent ? 'password' : 'text'" formControlName="currentPassword" autocomplete="current-password" />
        <button mat-icon-button matSuffix type="button" (click)="hideCurrent = !hideCurrent">
          <mat-icon>{{ hideCurrent ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Mật khẩu mới</mat-label>
        <input matInput [type]="hideNew ? 'password' : 'text'" formControlName="newPassword" autocomplete="new-password" />
        <button mat-icon-button matSuffix type="button" (click)="hideNew = !hideNew">
          <mat-icon>{{ hideNew ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nhập lại mật khẩu mới</mat-label>
        <input matInput [type]="hideConfirm ? 'password' : 'text'" formControlName="confirmPassword" autocomplete="new-password" />
        <button mat-icon-button matSuffix type="button" (click)="hideConfirm = !hideConfirm">
          <mat-icon>{{ hideConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
      </mat-form-field>
    </form>
  </div>
  <div mat-dialog-actions align="end">
    <button mat-stroked-button (click)="close()">Hủy</button>
    <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="loading">{{ loading ? 'Đang lưu...' : 'Lưu' }}</button>
  </div>
  `,
  styles: [
    `.full-width{width:100%}`
  ]
})
export class ChangePasswordDialog {
  form: FormGroup;
  loading = false;
  hideCurrent = true;
  hideNew = true;
  hideConfirm = true;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ChangePasswordDialog>,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ){
    this.form = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword, confirmPassword } = this.form.value;
    if (newPassword !== confirmPassword) {
      this.snackBar.open('Xác nhận mật khẩu không khớp', 'Đóng', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'top' });
      return;
    }
    this.loading = true;
    const result = await this.authService.changePassword(currentPassword, newPassword);
    this.loading = false;
    if (result.success) {
      this.snackBar.open(result.message, 'Đóng', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'top' });
      this.dialogRef.close(true);
    } else {
      this.snackBar.open(result.message, 'Đóng', { duration: 4000, horizontalPosition: 'right', verticalPosition: 'top' });
    }
  }
}


