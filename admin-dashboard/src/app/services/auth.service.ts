import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserPayload {
  id: string;
  email: string;
  role: 'admin' | 'user';
  name: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: UserPayload;
}

/** @deprecated Use AuthResponse */
export type LoginResponse = AuthResponse;

const TOKEN_KEY = 'auth_token';
const API_URL = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUser = signal<UserPayload | null>(this.loadUserFromToken());

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/register`, { name, email, password }).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        this.currentUser.set(res.user);
      }),
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/login`, { email, password }).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        this.currentUser.set(res.user);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private loadUserFromToken(): UserPayload | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Check expiry
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(TOKEN_KEY);
        return null;
      }
      return { id: payload.id, email: payload.email, role: payload.role, name: payload.name };
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
  }
}
