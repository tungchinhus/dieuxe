import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MigrationService } from '../../services/migration.service';

@Component({
  selector: 'app-migration-status',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="migration-container">
      <mat-card class="migration-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>cloud_upload</mat-icon>
            Migration Status
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <div class="status-info">
            <p *ngIf="isLoading" class="loading">
              <mat-spinner diameter="20"></mat-spinner>
              {{ statusMessage }}
            </p>
            
            <div *ngIf="!isLoading" class="status-details">
              <div class="status-item">
                <mat-icon [class.success]="migrationCompleted" [class.error]="migrationError">
                  {{ migrationCompleted ? 'check_circle' : migrationError ? 'error' : 'info' }}
                </mat-icon>
                <span>{{ statusMessage }}</span>
              </div>
              
              <div *ngIf="migrationCompleted" class="success-message">
                <p>✅ Data has been successfully migrated to Firebase!</p>
                <p>You can now use the application with cloud storage.</p>
              </div>
              
              <div *ngIf="migrationError" class="error-message">
                <p>❌ Migration failed. Please try again.</p>
                <p>Error: {{ errorMessage }}</p>
              </div>
            </div>
          </div>
        </mat-card-content>
        
        <mat-card-actions *ngIf="!isLoading">
          <button mat-raised-button color="primary" (click)="runMigration()" [disabled]="migrationCompleted">
            <mat-icon>cloud_upload</mat-icon>
            Run Migration
          </button>
          
          <button mat-button (click)="clearData()" [disabled]="!migrationCompleted">
            <mat-icon>clear_all</mat-icon>
            Clear Data
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .migration-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    
    .migration-card {
      max-width: 500px;
      width: 100%;
    }
    
    .status-info {
      text-align: center;
    }
    
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    
    .status-details {
      text-align: left;
    }
    
    .status-item {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    
    .status-item mat-icon.success {
      color: #4caf50;
    }
    
    .status-item mat-icon.error {
      color: #f44336;
    }
    
    .success-message {
      background-color: #e8f5e8;
      border: 1px solid #4caf50;
      border-radius: 4px;
      padding: 15px;
      margin-top: 15px;
    }
    
    .error-message {
      background-color: #ffebee;
      border: 1px solid #f44336;
      border-radius: 4px;
      padding: 15px;
      margin-top: 15px;
    }
    
    mat-card-actions {
      justify-content: center;
      gap: 10px;
    }
  `]
})
export class MigrationStatusComponent implements OnInit {
  isLoading = false;
  migrationCompleted = false;
  migrationError = false;
  statusMessage = 'Checking migration status...';
  errorMessage = '';

  constructor(
    private migrationService: MigrationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.checkMigrationStatus();
  }

  async checkMigrationStatus(): Promise<void> {
    this.isLoading = true;
    this.statusMessage = 'Checking migration status...';
    
    try {
      const needsMigration = await this.migrationService.isMigrationNeeded();
      
      if (needsMigration) {
        this.statusMessage = 'Migration needed. Click "Run Migration" to start.';
        this.migrationCompleted = false;
        this.migrationError = false;
      } else {
        this.statusMessage = 'Data is already migrated to Firebase.';
        this.migrationCompleted = true;
        this.migrationError = false;
      }
    } catch (error) {
      this.statusMessage = 'Error checking migration status.';
      this.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.migrationError = true;
      this.migrationCompleted = false;
    } finally {
      this.isLoading = false;
    }
  }

  async runMigration(): Promise<void> {
    this.isLoading = true;
    this.statusMessage = 'Running migration...';
    this.migrationError = false;
    
    try {
      await this.migrationService.migrateToFirebase();
      this.statusMessage = 'Migration completed successfully!';
      this.migrationCompleted = true;
      this.snackBar.open('Migration completed successfully!', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      this.statusMessage = 'Migration failed.';
      this.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.migrationError = true;
      this.snackBar.open('Migration failed. Please try again.', 'Close', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } finally {
      this.isLoading = false;
    }
  }

  async clearData(): Promise<void> {
    this.isLoading = true;
    this.statusMessage = 'Clearing data...';
    
    try {
      await this.migrationService.clearFirebaseData();
      this.statusMessage = 'Data cleared successfully.';
      this.migrationCompleted = false;
      this.snackBar.open('Data cleared successfully!', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      this.statusMessage = 'Failed to clear data.';
      this.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.migrationError = true;
      this.snackBar.open('Failed to clear data.', 'Close', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } finally {
      this.isLoading = false;
    }
  }
}
