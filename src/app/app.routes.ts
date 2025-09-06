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
  }
];
