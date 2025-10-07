import { Injectable } from '@angular/core';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  Firestore
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { User, Role, Permission, UserRole, UserPermission, PREDEFINED_ROLES, PREDEFINED_PERMISSIONS } from '../models/user.model';
import { BehaviorSubject, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseUserManagementService {
  private firestore: Firestore;
  private usersSubject = new BehaviorSubject<User[]>([]);
  private rolesSubject = new BehaviorSubject<Role[]>([]);
  private permissionsSubject = new BehaviorSubject<Permission[]>([]);

  public users$ = this.usersSubject.asObservable();
  public roles$ = this.rolesSubject.asObservable();
  public permissions$ = this.permissionsSubject.asObservable();

  // Collection names
  private readonly COLLECTIONS = {
    USERS: 'users',
    ROLES: 'roles',
    PERMISSIONS: 'permissions',
    USER_ROLES: 'userRoles',
    USER_PERMISSIONS: 'userPermissions'
  };

  constructor(private firebaseService: FirebaseService) {
    this.firestore = this.firebaseService.getFirestore();
    this.initializeData();
  }

  private async initializeData(): Promise<void> {
    try {
      console.log('Initializing Firebase data...');
      console.log('Firestore instance:', this.firestore);
      
      // Test Firestore connectivity first
      const testQuery = collection(this.firestore, 'test');
      console.log('Testing Firestore connectivity...');
      
      // Load data from Firebase
      await this.loadUsers();
      await this.loadRoles();
      await this.loadPermissions();
      
      console.log('Firebase data initialization completed successfully');
    } catch (error) {
      console.error('Error initializing Firebase data:', error);
      console.error('Error details:', {
        code: (error as any).code,
        message: (error as any).message,
        stack: (error as any).stack
      });
      
      // Initialize with default data if Firebase fails
      this.initializeDefaultData();
    }
  }

  private initializeDefaultData(): void {
    // Initialize with empty arrays for now
    // Roles and permissions will be loaded from Firebase
    this.rolesSubject.next([]);
    this.permissionsSubject.next([]);
  }

  // ==================== USERS ====================
  async loadUsers(): Promise<void> {
    try {
      console.log('Loading users from Firebase...');
      console.log('Firestore instance:', this.firestore);
      console.log('Collection name:', this.COLLECTIONS.USERS);
      
      const usersCollection = collection(this.firestore, this.COLLECTIONS.USERS);
      console.log('Users collection reference:', usersCollection);
      
      const querySnapshot = await getDocs(usersCollection);
      console.log('Query snapshot:', querySnapshot);
      console.log('Number of docs:', querySnapshot.docs.length);
      
      const users = querySnapshot.docs.map(doc => {
        console.log('Processing doc:', doc.id, doc.data());
        return this.convertFirestoreDocToUser(doc);
      });
      
      console.log('Converted users:', users);
      this.usersSubject.next(users);
    } catch (error) {
      console.error('Error loading users:', error);
      console.error('Error details:', {
        code: (error as any).code,
        message: (error as any).message,
        stack: (error as any).stack
      });
      
      // Check if it's a network connectivity issue
      if ((error as any).code === 'unavailable' || (error as any).message?.includes('Could not reach Cloud Firestore backend')) {
        console.warn('Firestore backend is unavailable, operating in offline mode');
      }
      
      this.usersSubject.next([]);
    }
  }

  getUsers(): Observable<User[]> {
    return this.users$;
  }

  async refreshUsers(): Promise<void> {
    await this.loadUsers();
  }

  getFirestoreInstance(): Firestore {
    return this.firestore;
  }

  getCollections(): typeof this.COLLECTIONS {
    return this.COLLECTIONS;
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const docRef = doc(this.firestore, this.COLLECTIONS.USERS, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return this.convertFirestoreDocToUser(docSnap);
      }
      return null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      console.log('Creating user with data:', userData);
      const now = new Date();
      const data = {
        ...userData,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      };
      
      console.log('Data to save to Firebase:', data);
      console.log('Firestore instance:', this.firestore);
      console.log('Collection name:', this.COLLECTIONS.USERS);
      
      const docRef = await addDoc(collection(this.firestore, this.COLLECTIONS.USERS), data);
      console.log('Document created with ID:', docRef.id);
      
      const newUser: User = {
        ...userData,
        id: docRef.id,
        createdAt: now,
        updatedAt: now
      };
      
      console.log('New user object:', newUser);
      
      // Update local state
      const currentUsers = this.usersSubject.value;
      console.log('Current users before update:', currentUsers);
      this.usersSubject.next([...currentUsers, newUser]);
      console.log('Users updated in local state');
      
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    try {
      const docRef = doc(this.firestore, this.COLLECTIONS.USERS, id);
      const updateData = {
        ...userData,
        updatedAt: Timestamp.fromDate(new Date())
      };
      
      await updateDoc(docRef, updateData);
      
      // Update local state
      const currentUsers = this.usersSubject.value;
      const userIndex = currentUsers.findIndex(u => u.id === id);
      if (userIndex !== -1) {
        const updatedUser = { ...currentUsers[userIndex], ...userData, updatedAt: new Date() };
        currentUsers[userIndex] = updatedUser;
        this.usersSubject.next([...currentUsers]);
        return updatedUser;
      }
      
      return null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const docRef = doc(this.firestore, this.COLLECTIONS.USERS, id);
      await deleteDoc(docRef);
      
      // Update local state
      const currentUsers = this.usersSubject.value;
      const filteredUsers = currentUsers.filter(u => u.id !== id);
      this.usersSubject.next(filteredUsers);
      
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // ==================== ROLES ====================
  async loadRoles(): Promise<void> {
    try {
      const querySnapshot = await getDocs(collection(this.firestore, this.COLLECTIONS.ROLES));
      const roles = querySnapshot.docs.map(doc => this.convertFirestoreDocToRole(doc));
      
      // If no roles in Firebase, initialize with predefined roles
      if (roles.length === 0) {
        await this.initializePredefinedRoles();
      } else {
        this.rolesSubject.next(roles);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      this.rolesSubject.next([]);
    }
  }

  private async initializePredefinedRoles(): Promise<void> {
    try {
      const predefinedRoles = [
        { name: 'super_admin', displayName: 'Super Admin', description: 'Full system access', isActive: true },
        { name: 'admin', displayName: 'Admin', description: 'Administrative access', isActive: true },
        { name: 'manager', displayName: 'Manager', description: 'Management access', isActive: true },
        { name: 'user', displayName: 'User', description: 'Standard user access', isActive: true },
        { name: 'viewer', displayName: 'Viewer', description: 'Read-only access', isActive: true }
      ];
      const roles: Role[] = [];
      
      for (const role of predefinedRoles) {
        const docRef = await addDoc(collection(this.firestore, this.COLLECTIONS.ROLES), {
          ...role,
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date())
        });
        roles.push({ ...role, id: docRef.id, createdAt: new Date(), updatedAt: new Date(), permissions: [] });
      }
      
      this.rolesSubject.next(roles);
    } catch (error) {
      console.error('Error initializing predefined roles:', error);
      this.rolesSubject.next([]);
    }
  }

  getRoles(): Observable<Role[]> {
    return this.roles$;
  }

  async getRoleById(id: string): Promise<Role | null> {
    try {
      const docRef = doc(this.firestore, this.COLLECTIONS.ROLES, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return this.convertFirestoreDocToRole(docSnap);
      }
      return null;
    } catch (error) {
      console.error('Error getting role by ID:', error);
      return null;
    }
  }

  async createRole(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    try {
      const now = new Date();
      const data = {
        ...roleData,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      };
      
      const docRef = await addDoc(collection(this.firestore, this.COLLECTIONS.ROLES), data);
      const newRole: Role = {
        ...roleData,
        id: docRef.id,
        createdAt: now,
        updatedAt: now
      };
      
      // Update local state
      const currentRoles = this.rolesSubject.value;
      this.rolesSubject.next([...currentRoles, newRole]);
      
      return newRole;
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  async updateRole(id: string, roleData: Partial<Role>): Promise<Role | null> {
    try {
      const docRef = doc(this.firestore, this.COLLECTIONS.ROLES, id);
      const updateData = {
        ...roleData,
        updatedAt: Timestamp.fromDate(new Date())
      };
      
      await updateDoc(docRef, updateData);
      
      // Update local state
      const currentRoles = this.rolesSubject.value;
      const roleIndex = currentRoles.findIndex(r => r.id === id);
      if (roleIndex !== -1) {
        const updatedRole = { ...currentRoles[roleIndex], ...roleData, updatedAt: new Date() };
        currentRoles[roleIndex] = updatedRole;
        this.rolesSubject.next([...currentRoles]);
        return updatedRole;
      }
      
      return null;
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  async deleteRole(id: string): Promise<boolean> {
    try {
      const docRef = doc(this.firestore, this.COLLECTIONS.ROLES, id);
      await deleteDoc(docRef);
      
      // Update local state
      const currentRoles = this.rolesSubject.value;
      const filteredRoles = currentRoles.filter(r => r.id !== id);
      this.rolesSubject.next(filteredRoles);
      
      return true;
    } catch (error) {
      console.error('Error deleting role:', error);
      return false;
    }
  }

  // ==================== PERMISSIONS ====================
  async loadPermissions(): Promise<void> {
    try {
      const querySnapshot = await getDocs(collection(this.firestore, this.COLLECTIONS.PERMISSIONS));
      const permissions = querySnapshot.docs.map(doc => this.convertFirestoreDocToPermission(doc));
      
      // If no permissions in Firebase, initialize with predefined permissions
      if (permissions.length === 0) {
        await this.initializePredefinedPermissions();
      } else {
        this.permissionsSubject.next(permissions);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      this.permissionsSubject.next([]);
    }
  }

  private async initializePredefinedPermissions(): Promise<void> {
    try {
      const predefinedPermissions = [
        { name: 'dang_ky_xe_view', displayName: 'Xem đăng ký xe', module: 'dang_ky_xe', action: 'view', isActive: true },
        { name: 'dang_ky_xe_create', displayName: 'Tạo đăng ký xe', module: 'dang_ky_xe', action: 'create', isActive: true },
        { name: 'dang_ky_xe_update', displayName: 'Sửa đăng ký xe', module: 'dang_ky_xe', action: 'update', isActive: true },
        { name: 'dang_ky_xe_delete', displayName: 'Xóa đăng ký xe', module: 'dang_ky_xe', action: 'delete', isActive: true },
        { name: 'user_view', displayName: 'Xem người dùng', module: 'user', action: 'view', isActive: true },
        { name: 'user_create', displayName: 'Tạo người dùng', module: 'user', action: 'create', isActive: true },
        { name: 'user_update', displayName: 'Sửa người dùng', module: 'user', action: 'update', isActive: true },
        { name: 'user_delete', displayName: 'Xóa người dùng', module: 'user', action: 'delete', isActive: true },
        { name: 'role_view', displayName: 'Xem vai trò', module: 'role', action: 'view', isActive: true },
        { name: 'role_create', displayName: 'Tạo vai trò', module: 'role', action: 'create', isActive: true },
        { name: 'role_update', displayName: 'Sửa vai trò', module: 'role', action: 'update', isActive: true },
        { name: 'role_delete', displayName: 'Xóa vai trò', module: 'role', action: 'delete', isActive: true }
      ];
      const permissions: Permission[] = [];
      
      for (const permission of predefinedPermissions) {
        const docRef = await addDoc(collection(this.firestore, this.COLLECTIONS.PERMISSIONS), {
          ...permission,
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date())
        });
        permissions.push({ ...permission, id: docRef.id });
      }
      
      this.permissionsSubject.next(permissions);
    } catch (error) {
      console.error('Error initializing predefined permissions:', error);
      this.permissionsSubject.next([]);
    }
  }

  getPermissions(): Observable<Permission[]> {
    return this.permissions$;
  }

  // ==================== USER ROLES & PERMISSIONS ====================
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user || !user.roles) return false;
      
      return user.roles.some(role => {
        const roleNameToCheck = typeof role === 'string' ? role : (role as any).name;
        return roleNameToCheck === roleName;
      });
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }

  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    // Permissions are handled through roles, not directly on users
    // This method can be implemented based on role-based permissions
    return false;
  }

  // ==================== HELPER METHODS ====================
  private convertFirestoreDocToUser(doc: DocumentSnapshot): User {
    const data = doc.data();
    return {
      id: doc.id,
      username: data?.['username'] || '',
      email: data?.['email'] || '',
      fullName: data?.['fullName'] || '',
      phone: data?.['phone'] || '',
      department: data?.['department'] || '',
      position: data?.['position'] || '',
      isActive: data?.['isActive'] ?? true,
      roles: data?.['roles'] || [],
      createdAt: data?.['createdAt']?.toDate() || new Date(),
      updatedAt: data?.['updatedAt']?.toDate() || new Date(),
      lastLogin: data?.['lastLogin']?.toDate(),
      createdBy: data?.['createdBy'] || 'system',
      updatedBy: data?.['updatedBy'] || 'system'
    };
  }

  private convertFirestoreDocToRole(doc: DocumentSnapshot): Role {
    const data = doc.data();
    return {
      id: doc.id,
      name: data?.['name'] || '',
      displayName: data?.['displayName'] || '',
      description: data?.['description'] || '',
      isActive: data?.['isActive'] ?? true,
      permissions: data?.['permissions'] || [],
      createdAt: data?.['createdAt']?.toDate() || new Date(),
      updatedAt: data?.['updatedAt']?.toDate() || new Date()
    };
  }

  private convertFirestoreDocToPermission(doc: DocumentSnapshot): Permission {
    const data = doc.data();
    return {
      id: doc.id,
      name: data?.['name'] || '',
      displayName: data?.['displayName'] || '',
      module: data?.['module'] || '',
      action: data?.['action'] || '',
      isActive: data?.['isActive'] ?? true
    };
  }
}
