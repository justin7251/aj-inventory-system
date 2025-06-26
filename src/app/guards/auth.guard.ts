import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service'; // Adjusted path

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.authService.currentUser$.pipe(
      take(1), // Take the first emission and complete
      map(user => !!user), // Map to boolean: true if user exists, false otherwise
      tap(loggedIn => {
        if (!loggedIn) {
          console.log('Access denied - redirecting to login');
          this.router.navigate(['/login']); // Redirect to login page if not logged in
        }
      })
    );
  }
}
