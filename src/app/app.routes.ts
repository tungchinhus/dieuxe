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
  }
];
