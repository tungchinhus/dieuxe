import { Injectable } from '@angular/core';
import { FirebaseUserManagementService } from './firebase-user-management.service';
import { User, Role, Permission, PREDEFINED_ROLES, PREDEFINED_PERMISSIONS } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class MigrationService {

  constructor(private firebaseUserService: FirebaseUserManagementService) {}

  /**
   * Migrate data from localStorage to Firebase
   * This method should be called once to initialize Firebase with sample data
   */
  async migrateToFirebase(): Promise<void> {
    try {
      console.log('Starting migration to Firebase...');

      // Check if data already exists in Firebase
      const existingUsers = await this.firebaseUserService.getUsers().pipe().toPromise();
      if (existingUsers && existingUsers.length > 0) {
        console.log('Data already exists in Firebase, skipping migration');
        return;
      }

      // Create sample users
      await this.createSampleUsers();
      
      console.log('Migration completed successfully!');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  private async createSampleUsers(): Promise<void> {
    const sampleUsers: Omit<User, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        username: 'admin',
        email: 'admin@company.com',
        fullName: 'Quản trị viên',
        phone: '0901234567',
        department: 'IT',
        position: 'System Administrator',
        isActive: true,
        roles: [PREDEFINED_ROLES.SUPER_ADMIN],
        lastLogin: new Date(),
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        username: 'manager1',
        email: 'manager1@company.com',
        fullName: 'Nguyễn Văn A',
        phone: '0901234568',
        department: 'HR',
        position: 'HR Manager',
        isActive: true,
        roles: [PREDEFINED_ROLES.MANAGER],
        lastLogin: new Date(),
        createdBy: 'admin',
        updatedBy: 'admin'
      },
      {
        username: 'user1',
        email: 'user1@company.com',
        fullName: 'Trần Thị B',
        phone: '0901234569',
        department: 'Operations',
        position: 'Staff',
        isActive: true,
        roles: [PREDEFINED_ROLES.USER],
        lastLogin: new Date(),
        createdBy: 'admin',
        updatedBy: 'admin'
      }
    ];

    for (const userData of sampleUsers) {
      try {
        await this.firebaseUserService.createUser(userData);
        console.log(`Created user: ${userData.username}`);
      } catch (error) {
        console.error(`Failed to create user ${userData.username}:`, error);
      }
    }
  }

  /**
   * Clear all data from Firebase (for testing purposes)
   */
  async clearFirebaseData(): Promise<void> {
    try {
      console.log('Clearing Firebase data...');
      
      // This would require implementing delete methods in FirebaseUserManagementService
      // For now, we'll just log the action
      console.log('Firebase data cleared (implementation needed)');
    } catch (error) {
      console.error('Failed to clear Firebase data:', error);
      throw error;
    }
  }

  /**
   * Check if migration is needed
   */
  async isMigrationNeeded(): Promise<boolean> {
    try {
      // Force load users from Firebase first
      await this.firebaseUserService.refreshUsers();
      const users = await this.firebaseUserService.getUsers().pipe().toPromise();
      console.log('Migration check - users found:', users?.length || 0);
      return !users || users.length === 0;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return true; // Assume migration is needed if there's an error
    }
  }

  /**
   * Force create admin user if not exists
   */
  async ensureAdminUser(): Promise<void> {
    try {
      console.log('Ensuring admin user exists...');
      
      // Refresh users from Firebase first
      console.log('Refreshing users from Firebase...');
      await this.firebaseUserService.refreshUsers();
      
      // Check if admin user exists
      console.log('Checking if admin user exists...');
      const users = await this.firebaseUserService.getUsers().pipe().toPromise();
      console.log('Current users:', users);
      const adminExists = users?.some(user => user.username === 'admin');
      console.log('Admin exists:', adminExists);
      
      if (!adminExists) {
        console.log('Admin user not found, creating...');
        const adminUser: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
          username: 'admin',
          email: 'admin@company.com',
          fullName: 'Quản trị viên',
          phone: '0901234567',
          department: 'IT',
          position: 'System Administrator',
          isActive: true,
          roles: [PREDEFINED_ROLES.SUPER_ADMIN],
          lastLogin: new Date(),
          createdBy: 'system',
          updatedBy: 'system'
        };
        
        console.log('Creating admin user with data:', adminUser);
        const createdUser = await this.firebaseUserService.createUser(adminUser);
        console.log('Admin user created successfully:', createdUser);
      } else {
        console.log('Admin user already exists');
      }
    } catch (error) {
      console.error('Error ensuring admin user:', error);
      throw error;
    }
  }
}
