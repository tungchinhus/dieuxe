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
    path: 'firebase-test',
    loadComponent: () => import('./components/firebase-test/firebase-test.component').then(m => m.FirebaseTestComponent)
  }
];
