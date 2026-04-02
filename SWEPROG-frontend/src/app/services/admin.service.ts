import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';
import { TranslationService } from './translation.service';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'guest' | 'user' | 'admin' | 'super_admin';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: 'guest' | 'user' | 'admin' | 'super_admin';
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: 'guest' | 'user' | 'admin' | 'super_admin';
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = environment.apiUrl + 'api/admin';

  constructor(
    private http:        HttpClient,
    private auth:        AuthService,
    private translation: TranslationService
  ) {}

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` });
  }

  getUsers(): Observable<AdminUser[]> {
    return this.http
      .get<{ success: boolean; data: AdminUser[] }>(`${this.apiUrl}/users`, { headers: this.headers })
      .pipe(map(r => r.data));
  }

  createUser(payload: CreateUserPayload): Observable<{ id: number }> {
    return this.http
      .post<{ success: boolean; data: { id: number } }>(`${this.apiUrl}/users`, payload, { headers: this.headers })
      .pipe(map(r => r.data));
  }

  updateUser(id: number, payload: UpdateUserPayload): Observable<void> {
    return this.http
      .put<void>(`${this.apiUrl}/users/${id}`, payload, { headers: this.headers });
  }

  setUserStatus(id: number, status: 'active' | 'inactive' | 'suspended'): Observable<void> {
    return this.http
      .patch<void>(`${this.apiUrl}/users/${id}/status`, { status }, { headers: this.headers });
  }

  deleteUser(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/users/${id}`, { headers: this.headers });
  }

  resetPassword(id: number): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.apiUrl}/users/${id}/reset-password`, {}, { headers: this.headers });
  }

  setUserPassword(id: number, newPassword: string): Observable<void> {
    const url = environment.apiUrl + `api/password/admin/change/${id}`;
    return this.http.post<void>(
      url,
      { newPassword, lang: this.translation.currentLanguage },
      { headers: this.headers }
    );
  }
}
