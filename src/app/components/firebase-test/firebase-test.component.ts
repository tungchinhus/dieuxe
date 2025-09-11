import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { RouteDetailService } from '../../services/route-detail.service';
import { RouteDetailCreate } from '../../models/route-detail.model';

@Component({
  selector: 'app-firebase-test',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="test-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Firebase Connection Test</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Testing Firebase connection and route details service...</p>
          <div class="test-results">
            <p *ngIf="connectionStatus">{{ connectionStatus }}</p>
            <p *ngIf="dataCount !== null">Total records: {{ dataCount }}</p>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="testConnection()">
            Test Connection
          </button>
          <button [disabled]="true" mat-raised-button color="accent" (click)="addTestData()">
            Add Test Data
          </button>
          <button [disabled]="true" mat-raised-button color="warn" (click)="clearData()">
            Clear Data
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .test-container {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }
    .test-results {
      margin: 16px 0;
      padding: 12px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }
  `]
})
export class FirebaseTestComponent implements OnInit {
  connectionStatus: string | null = null;
  dataCount: number | null = null;

  constructor(
    private routeDetailService: RouteDetailService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.testConnection();
  }

  testConnection() {
    this.connectionStatus = 'Testing connection...';
    
    this.routeDetailService.getRouteDetails().subscribe({
      next: (data) => {
        this.connectionStatus = '✅ Firebase connection successful!';
        this.dataCount = data.length;
        this.snackBar.open('Firebase connection test passed!', 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        this.connectionStatus = '❌ Firebase connection failed: ' + error.message;
        this.snackBar.open('Firebase connection test failed!', 'Close', {
          duration: 5000
        });
        console.error('Firebase connection error:', error);
      }
    });
  }

  addTestData() {
    const testData: RouteDetailCreate[] = [
      {
        maTuyenXe: 'HCM_HC_1',
        tenDiemDon: 'Bệnh viện Hòa Hảo',
        thuTu: 1
      },
      {
        maTuyenXe: 'HCM_HC_1',
        tenDiemDon: 'Điện Biên Phủ - Hai Bà Trưng',
        thuTu: 2
      },
      {
        maTuyenXe: 'BH_HC_1',
        tenDiemDon: 'Ngã 3 Long Bình Tân',
        thuTu: 1
      }
    ];

    this.routeDetailService.addMultipleRouteDetails(testData).then(() => {
      this.snackBar.open('Test data added successfully!', 'Close', {
        duration: 3000
      });
      this.testConnection(); // Refresh the count
    }).catch((error) => {
      this.snackBar.open('Failed to add test data!', 'Close', {
        duration: 3000
      });
      console.error('Error adding test data:', error);
    });
  }

  clearData() {
    if (confirm('Are you sure you want to clear all route details data?')) {
      this.routeDetailService.getRouteDetails().subscribe(data => {
        const ids = data.map(item => item.id).filter(id => id) as string[];
        if (ids.length > 0) {
          this.routeDetailService.deleteMultipleRouteDetails(ids).then(() => {
            this.snackBar.open('Data cleared successfully!', 'Close', {
              duration: 3000
            });
            this.testConnection(); // Refresh the count
          });
        } else {
          this.snackBar.open('No data to clear!', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }
}
