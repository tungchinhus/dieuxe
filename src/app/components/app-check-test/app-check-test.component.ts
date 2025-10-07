import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AppCheckService } from '../../services/app-check.service';

@Component({
  selector: 'app-app-check-test',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ],
  template: `
    <mat-card class="test-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>security</mat-icon>
          Firebase App Check Test
        </mat-card-title>
      </mat-card-header>
      
      <mat-card-content>
        <div class="test-section">
          <h3>App Check Status</h3>
          <p *ngIf="isWorking === null" class="status-pending">
            <mat-icon>hourglass_empty</mat-icon>
            Chưa kiểm tra
          </p>
          <p *ngIf="isWorking === true" class="status-success">
            <mat-icon>check_circle</mat-icon>
            App Check hoạt động bình thường
          </p>
          <p *ngIf="isWorking === false" class="status-error">
            <mat-icon>error</mat-icon>
            App Check có vấn đề
          </p>
        </div>

        <div class="test-section" *ngIf="tokenInfo">
          <h3>Token Information</h3>
          <p><strong>Token:</strong> {{ tokenInfo.token.substring(0, 20) }}...</p>
          <p><strong>Status:</strong> Token retrieved successfully</p>
        </div>

        <div class="test-section">
          <h3>Actions</h3>
          <button mat-raised-button 
                  color="primary" 
                  (click)="testAppCheck()"
                  [disabled]="isLoading">
            <mat-icon>play_arrow</mat-icon>
            Test App Check
          </button>
          
          <button mat-button 
                  (click)="debugAppCheck()"
                  [disabled]="isLoading">
            <mat-icon>bug_report</mat-icon>
            Debug Info
          </button>
        </div>

        <div class="test-section" *ngIf="errorMessage">
          <h3>Error</h3>
          <p class="error-message">{{ errorMessage }}</p>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .test-card {
      max-width: 600px;
      margin: 20px auto;
    }
    
    .test-section {
      margin: 20px 0;
    }
    
    .test-section h3 {
      margin-bottom: 10px;
      color: #1976d2;
    }
    
    .status-pending {
      color: #ff9800;
    }
    
    .status-success {
      color: #4caf50;
    }
    
    .status-error {
      color: #f44336;
    }
    
    .error-message {
      color: #f44336;
      background-color: #ffebee;
      padding: 10px;
      border-radius: 4px;
    }
    
    button {
      margin-right: 10px;
    }
  `]
})
export class AppCheckTestComponent {
  isWorking: boolean | null = null;
  tokenInfo: any = null;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private appCheckService: AppCheckService) {}

  async testAppCheck(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      this.isWorking = await this.appCheckService.isAppCheckWorking();
      
      if (this.isWorking) {
        this.tokenInfo = await this.appCheckService.getAppCheckToken();
      }
    } catch (error) {
      this.errorMessage = `Error: ${error}`;
      this.isWorking = false;
    } finally {
      this.isLoading = false;
    }
  }

  async debugAppCheck(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      await this.appCheckService.debugAppCheck();
    } catch (error) {
      this.errorMessage = `Debug Error: ${error}`;
    } finally {
      this.isLoading = false;
    }
  }
}
