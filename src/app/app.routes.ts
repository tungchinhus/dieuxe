import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dangkyxe',
    pathMatch: 'full'
  },
  {
    path: 'dangkyxe',
    loadComponent: () => import('./components/dangkyxe/dangkyxe.component').then(m => m.DangKyXeComponent)
  },
  {
    path: 'data-viewer',
    loadComponent: () => import('./components/data-viewer/data-viewer.component').then(m => m.DataViewerComponent)
  },
  {
    path: 'quan-ly-tuyen-duong',
    loadComponent: () => import('./components/quan-ly-tuyen-duong/quan-ly-tuyen-duong.component').then(m => m.QuanLyTuyenDuongComponent)
  },
  {
    path: 'quan-ly-xe-dua-don',
    loadComponent: () => import('./components/quan-ly-xe-dua-don/quan-ly-xe-dua-don.component').then(m => m.QuanLyXeDuaDonComponent)
  },
  {
    path: 'quan-ly-nhan-vien',
    loadComponent: () => import('./components/quan-ly-nhan-vien/quan-ly-nhan-vien.component').then(m => m.QuanLyNhanVienComponent)
  },
  {
    path: 'firebase-test',
    loadComponent: () => import('./components/firebase-test/firebase-test.component').then(m => m.FirebaseTestComponent)
  }
];
