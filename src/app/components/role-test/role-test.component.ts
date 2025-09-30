import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-role-test',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="role-test-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>🔧 Role Persistence Test</mat-card-title>
          <mat-card-subtitle>Kiểm tra việc duy trì quyền super_admin sau khi reload page</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="test-info">
            <h3>Thông tin User hiện tại:</h3>
            <div class="user-info">
              <p><strong>Email:</strong> {{ getCurrentUserEmail() }}</p>
              <p><strong>Tên:</strong> {{ getCurrentUserName() }}</p>
              <p><strong>Roles:</strong> {{ getCurrentUserRoles() }}</p>
              <p><strong>Is Super Admin:</strong> 
                <span [class]="hasSuperAdminRole() ? 'success' : 'error'">
                  {{ hasSuperAdminRole() ? '✅ YES' : '❌ NO' }}
                </span>
              </p>
              <p><strong>Has Admin Role:</strong> 
                <span [class]="hasAdminRole() ? 'success' : 'error'">
                  {{ hasAdminRole() ? '✅ YES' : '❌ NO' }}
                </span>
              </p>
            </div>
            
            <div class="test-actions">
              <h3>Test Actions:</h3>
              <button mat-raised-button color="primary" (click)="refreshUserData()">
                <mat-icon>refresh</mat-icon>
                Refresh User Data
              </button>
              
              <button mat-raised-button color="accent" (click)="ensureUserRoles()">
                <mat-icon>security</mat-icon>
                Ensure User Roles
              </button>
              
              <button mat-raised-button color="warn" (click)="reloadPage()">
                <mat-icon>refresh</mat-icon>
                Reload Page (Test)
              </button>
            </div>
            
            <div class="localStorage-info">
              <h3>LocalStorage Data:</h3>
              <pre>{{ getLocalStorageData() }}</pre>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .role-test-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .test-info {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .user-info {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
    }
    
    .user-info p {
      margin: 8px 0;
    }
    
    .success {
      color: #4caf50;
      font-weight: bold;
    }
    
    .error {
      color: #f44336;
      font-weight: bold;
    }
    
    .test-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .test-actions button {
      margin: 5px;
    }
    
    .localStorage-info {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 8px;
    }
    
    .localStorage-info pre {
      background: #fff;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #ddd;
      font-size: 12px;
      max-height: 200px;
      overflow-y: auto;
    }
  `]
})
export class RoleTestComponent implements OnInit {
  
  constructor(private authService: AuthService) {}
  
  ngOnInit(): void {
    console.log('Role Test Component initialized');
    console.log('Current user:', this.authService.getCurrentUser());
  }
  
  getCurrentUserEmail(): string {
    const user = this.authService.getCurrentUser();
    return user?.email || 'N/A';
  }
  
  getCurrentUserName(): string {
    const user = this.authService.getCurrentUser();
    return user?.fullName || user?.username || 'N/A';
  }
  
  getCurrentUserRoles(): string {
    const user = this.authService.getCurrentUser();
    if (!user || !user.roles) return 'No roles';
    return user.roles.join(', ');
  }
  
  hasSuperAdminRole(): boolean {
    return this.authService.hasAnyRoleSync(['super_admin']);
  }
  
  hasAdminRole(): boolean {
    return this.authService.hasAnyRoleSync(['admin', 'super_admin']);
  }
  
  async refreshUserData(): Promise<void> {
    console.log('Refreshing user data...');
    await this.authService.refreshUserData();
    console.log('User data refreshed:', this.authService.getCurrentUser());
  }
  
  async ensureUserRoles(): Promise<void> {
    console.log('Ensuring user roles...');
    await this.authService.ensureUserRoles();
    console.log('User roles ensured:', this.authService.getCurrentUser());
  }
  
  reloadPage(): void {
    console.log('Reloading page to test role persistence...');
    window.location.reload();
  }
  
  getLocalStorageData(): string {
    const currentUser = localStorage.getItem('currentUser');
    const authToken = localStorage.getItem('authToken');
    
    return JSON.stringify({
      currentUser: currentUser ? JSON.parse(currentUser) : null,
      authToken: authToken ? 'Present' : 'Missing'
    }, null, 2);
  }
}
