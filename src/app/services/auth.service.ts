import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators'; // Added map

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser$: Observable<User | null>;

  constructor(private auth: Auth) {
    this.currentUser$ = new Observable(observer => {
      const unsubscribe = onAuthStateChanged(auth,
        (user) => observer.next(user),
        (error) => observer.error(error),
        () => observer.complete()
      );
      // Unsubscribe when the observable is unsubscribed
      return unsubscribe;
    });
  }

  login(email: string, password: string):Promise<any> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  // Example of getting the current user's ID, if needed
  getCurrentUserId(): Observable<string | null> {
    return this.currentUser$.pipe(
      map(user => user ? user.uid : null)
    );
  }
}
