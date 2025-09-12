export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  department?: string;
  position?: string;
  isActive: boolean;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: Permission[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  module: string;
  action: string;
  isActive: boolean;
}

export interface UserRole {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
  isActive: boolean;
}

export interface UserPermission {
  userId: string;
  permissionId: string;
  grantedAt: Date;
  grantedBy: string;
  isActive: boolean;
}

// Enum cho các module trong hệ thống
export enum Module {
  DANG_KY_XE = 'dang_ky_xe',
  QUAN_LY_NHAN_VIEN = 'quan_ly_nhan_vien',
  QUAN_LY_TUYEN_DUONG = 'quan_ly_tuyen_duong',
  QUAN_LY_XE_DUA_DON = 'quan_ly_xe_dua_don',
  QUAN_LY_USER = 'quan_ly_user',
  QUAN_LY_PHAN_QUYEN = 'quan_ly_phan_quyen',
  BAO_CAO = 'bao_cao',
  CAI_DAT = 'cai_dat'
}

// Enum cho các hành động
export enum Action {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  IMPORT = 'import',
  APPROVE = 'approve',
  REJECT = 'reject'
}

// Predefined roles
export const PREDEFINED_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  VIEWER: 'viewer'
};

// Predefined permissions
export const PREDEFINED_PERMISSIONS = {
  // Dang ky xe permissions
  DANG_KY_XE_VIEW: 'dang_ky_xe_view',
  DANG_KY_XE_CREATE: 'dang_ky_xe_create',
  DANG_KY_XE_UPDATE: 'dang_ky_xe_update',
  DANG_KY_XE_DELETE: 'dang_ky_xe_delete',
  DANG_KY_XE_EXPORT: 'dang_ky_xe_export',
  DANG_KY_XE_IMPORT: 'dang_ky_xe_import',
  DANG_KY_XE_APPROVE: 'dang_ky_xe_approve',
  DANG_KY_XE_REJECT: 'dang_ky_xe_reject',
  
  // Quan ly nhan vien permissions
  NHAN_VIEN_VIEW: 'nhan_vien_view',
  NHAN_VIEN_CREATE: 'nhan_vien_create',
  NHAN_VIEN_UPDATE: 'nhan_vien_update',
  NHAN_VIEN_DELETE: 'nhan_vien_delete',
  
  // Quan ly tuyen duong permissions
  TUYEN_DUONG_VIEW: 'tuyen_duong_view',
  TUYEN_DUONG_CREATE: 'tuyen_duong_create',
  TUYEN_DUONG_UPDATE: 'tuyen_duong_update',
  TUYEN_DUONG_DELETE: 'tuyen_duong_delete',
  
  // Quan ly xe dua don permissions
  XE_DUA_DON_VIEW: 'xe_dua_don_view',
  XE_DUA_DON_CREATE: 'xe_dua_don_create',
  XE_DUA_DON_UPDATE: 'xe_dua_don_update',
  XE_DUA_DON_DELETE: 'xe_dua_don_delete',
  
  // User management permissions
  USER_VIEW: 'user_view',
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  
  // Role management permissions
  ROLE_VIEW: 'role_view',
  ROLE_CREATE: 'role_create',
  ROLE_UPDATE: 'role_update',
  ROLE_DELETE: 'role_delete',
  ROLE_ASSIGN: 'role_assign',
  
  // Report permissions
  REPORT_VIEW: 'report_view',
  REPORT_EXPORT: 'report_export',
  
  // System settings permissions
  SETTINGS_VIEW: 'settings_view',
  SETTINGS_UPDATE: 'settings_update',
  SYSTEM_CONFIG: 'system_config'
};
