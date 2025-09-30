import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-ai-test',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ],
  template: `
    <div style="padding: 20px; text-align: center;">
      <mat-card style="max-width: 600px; margin: 0 auto;">
        <mat-card-header>
          <mat-card-title>🤖 AI Demo Test</mat-card-title>
          <mat-card-subtitle>Trang test AI Demo</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <p>Chúc mừng! Bạn đã truy cập thành công trang AI Demo.</p>
          <p>Đây là trang test để đảm bảo routing hoạt động đúng.</p>
          
          <div style="margin: 20px 0;">
            <button mat-raised-button color="primary" (click)="goToFullAiDemo()">
              <mat-icon>psychology</mat-icon>
              Đi đến AI Demo đầy đủ
            </button>
          </div>
          
          <div style="margin: 20px 0;">
            <button mat-button (click)="goBack()">
              <mat-icon>arrow_back</mat-icon>
              Quay lại
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class AiTestComponent {
  constructor(private router: Router) {}

  goToFullAiDemo(): void {
    this.router.navigate(['/ai-demo']);
  }

  goBack(): void {
    this.router.navigate(['/dangkyxe']);
  }
}
