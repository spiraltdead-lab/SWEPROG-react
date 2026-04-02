import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ROLE_PERMISSIONS, Permission } from '../models/permissions';
import { TranslationService } from './translation.service';

export type UserRole = 'guest' | 'user' | 'admin' | 'super_admin';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  company?: string;
  createdAt?: string;
  lastLogin?: string;
  isActive?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl + 'api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private translation: TranslationService) {
    this.loadStoredUser();
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get token(): string | null {
    return localStorage.getItem('token');
  }

  get isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // ── Role helpers ───────────────────────────────────────────────────────────

  isAdmin(): boolean {
    const role = this.currentUserSubject.value?.role;
    return role === 'admin' || role === 'super_admin';
  }

  isSuperAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'super_admin';
  }

  isGuest(): boolean {
    return this.currentUserSubject.value?.role === 'guest';
  }

  // ── PBAC ──────────────────────────────────────────────────────────────────

  hasPermission(permission: Permission): boolean {
    const role = this.currentUserSubject.value?.role;
    if (!role) return false;
    return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
  }

  // ── Auth actions ──────────────────────────────────────────────────────────

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(response => {
        if (response.token && response.user) {
          this.setSession(response.token, response.user);
        }
      })
    );
  }

  registerGuest(userData: RegisterData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register/guest`, {
      name:        userData.name,
      email:       userData.email,
      password:    userData.password,
      acceptTerms: String(userData.acceptTerms),
      lang:        this.translation.currentLanguage
    }).pipe(
      tap(response => {
        if (response.token && response.user) {
          this.setSession(response.token, response.user);
        }
      })
    );
  }

  logout(): void {
    this.clearStorage();
    this.currentUserSubject.next(null);
  }

  // Kept for backward-compatibility with header component
  manualLogout(): void {
    this.logout();
  }

  updateCurrentUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private loadStoredUser(): void {
    const token   = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        this.currentUserSubject.next(JSON.parse(userStr));
      } catch {
        this.clearStorage();
      }
    }
  }

  private setSession(token: string, user: User): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private clearStorage(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}
