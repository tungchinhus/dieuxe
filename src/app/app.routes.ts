import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dang-nhap',
    pathMatch: 'full'
  },
  {
    path: 'dang-nhap',
    loadComponent: () => import('./components/dang-nhap/dang-nhap.component').then(m => m.DangNhapComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./components/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  {
    path: 'dangkyxe',
    loadComponent: () => import('./components/dangkyxe/dangkyxe.component').then(m => m.DangKyXeComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'quan-ly-tuyen-duong',
    loadComponent: () => import('./components/quan-ly-tuyen-duong/quan-ly-tuyen-duong.component').then(m => m.QuanLyTuyenDuongComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'quan-ly-xe-dua-don',
    loadComponent: () => import('./components/quan-ly-xe-dua-don/quan-ly-xe-dua-don.component').then(m => m.QuanLyXeDuaDonComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'quan-ly-nhan-vien',
    loadComponent: () => import('./components/quan-ly-nhan-vien/quan-ly-nhan-vien.component').then(m => m.QuanLyNhanVienComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'quan-ly-user',
    loadComponent: () => import('./components/quan-ly-user/quan-ly-user.component').then(m => m.QuanLyUserComponent),
    canActivate: [AuthGuard],
    data: { 
      roles: ['super_admin', 'admin'],
      permissions: ['user_view']
    }
  },
  {
    path: 'quan-ly-phan-quyen',
    loadComponent: () => import('./components/quan-ly-phan-quyen/quan-ly-phan-quyen.component').then(m => m.QuanLyPhanQuyenComponent),
    canActivate: [AuthGuard],
    data: { 
      roles: ['super_admin', 'admin'],
      permissions: ['role_view']
    }
  },
  {
    path: 'role-test',
    loadComponent: () => import('./components/role-test/role-test.component').then(m => m.RoleTestComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'ai-demo',
    loadComponent: () => import('./components/ai-demo/ai-demo.component').then(m => m.AiDemoComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'ai-test',
    loadComponent: () => import('./components/ai-test/ai-test.component').then(m => m.AiTestComponent)
  },
  {
    path: 'firebase-test',
    loadComponent: () => import('./components/firebase-test/firebase-test.component').then(m => m.FirebaseTestComponent)
  },
];
