import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/dang-nhap'], { 
        queryParams: { returnUrl: state.url } 
      });
      return of(false);
    }

    // Check if token is still valid
    if (!this.authService.isTokenValid()) {
      this.authService.logout();
      this.router.navigate(['/dang-nhap'], { 
        queryParams: { returnUrl: state.url, expired: 'true' } 
      });
      return of(false);
    }

    // Ensure user has roles before checking
    this.authService.ensureUserRoles();

    // Check for required roles first
    const requiredRoles = route.data['roles'] as string[];
    const requiredPermissions = route.data['permissions'] as string[];

    if (requiredRoles && requiredRoles.length > 0) {
      return this.checkRoles(requiredRoles);
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      return this.checkPermissions(requiredPermissions);
    }

    return of(true);
  }

  private checkPermissions(permissions: string[]): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of(false);
    }

    // Check if user has any of the required permissions
    const permissionChecks = permissions.map(permission => 
      this.authService.hasPermission(permission)
    );

    return new Observable(observer => {
      let completedChecks = 0;
      let hasPermission = false;

      permissionChecks.forEach(check => {
        check.subscribe(hasPerm => {
          if (hasPerm) {
            hasPermission = true;
          }
          completedChecks++;
          
          if (completedChecks === permissionChecks.length) {
            if (!hasPermission) {
              this.router.navigate(['/unauthorized']);
            }
            observer.next(hasPermission);
            observer.complete();
          }
        });
      });
    });
  }

  private checkRoles(roles: string[]): Observable<boolean> {
    console.log('Checking roles:', roles);
    const currentUser = this.authService.getCurrentUser();
    console.log('Current user:', currentUser);
    
    if (!currentUser) {
      console.log('No current user found');
      this.router.navigate(['/unauthorized']);
      return of(false);
    }

    // Use the new synchronous method for role checking
    const hasRequiredRole = this.authService.hasAnyRoleSync(roles);

    console.log('Has required role:', hasRequiredRole);
    
    if (!hasRequiredRole) {
      this.router.navigate(['/unauthorized']);
    }
    
    return of(hasRequiredRole);
  }
}
