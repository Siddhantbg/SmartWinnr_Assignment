import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, signal, effect } from '@angular/core';
import lottie from 'lottie-web';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService, UserPayload } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { FormsModule } from '@angular/forms';
import { DatePipe, TitleCasePipe } from '@angular/common';

interface UserRecord {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, DatePipe, TitleCasePipe, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('lottieContainer') lottieContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('totalUsersLottie') totalUsersLottie?: ElementRef<HTMLDivElement>;
  @ViewChild('adminsLottie') adminsLottie?: ElementRef<HTMLDivElement>;
  @ViewChild('newWeekLottie') newWeekLottie?: ElementRef<HTMLDivElement>;
  @ViewChild('newMonthLottie') newMonthLottie?: ElementRef<HTMLDivElement>;

  readonly currentUser = signal<UserPayload | null>(null);
  readonly users = signal<UserRecord[]>([]);
  readonly isLoadingUsers = signal(false);

  newEmail = '';
  newPassword = '';
  newName = '';
  newRole: 'admin' | 'user' = 'user';
  readonly isCreating = signal(false);
  readonly showCreateForm = signal(false);

  readonly joinedDate = new Date('2026-02-11');

 
  readonly quizQuestions = [
    'Did you like the website?',
    'Am I selected?',
    'Should you hire me?',
  ];
  readonly quizStep = signal(0);
  readonly quizDone = signal(false);

  answerQuiz(_answer: boolean): void {
    if (this.quizStep() < this.quizQuestions.length - 1) {
      this.quizStep.update((s) => s + 1);
    } else {
      this.quizDone.set(true);
    }
  }

  private readonly API = 'http://localhost:3000/api';

  constructor(
    private readonly auth: AuthService,
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {
    effect(() => {
      if (this.quizDone()) {
        setTimeout(() => this.loadLottie(), 0);
      }
    });
  }

  private loadLottie(): void {
    if (!this.lottieContainer) return;
    lottie.loadAnimation({
      container: this.lottieContainer.nativeElement,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      path: '/assets/wired-outline-37-approve-checked-simple-hover-wobble.json',
    });
  }

  ngOnInit(): void {
    this.currentUser.set(this.auth.user());
    if (this.auth.isAdmin()) {
      this.loadUsers();
    }
  }

  ngAfterViewInit(): void {
    if (this.isAdmin) {
      this.loadStatLotties();
    }
  }

  private loadStatLotties(): void {
    const animations: { container?: ElementRef<HTMLDivElement>; path: string }[] = [
      { container: this.totalUsersLottie, path: '/assets/wired-outline-2701-logo-square-odnoklassniki-hover-pinch.json' },
      { container: this.adminsLottie, path: '/assets/wired-outline-21-avatar-hover-jumping.json' },
      { container: this.newWeekLottie, path: '/assets/wired-outline-3089-bar-chart-diversified-hover-pinch.json' },
      { container: this.newMonthLottie, path: '/assets/wired-outline-2947-calendar-christmas-eve-hover-pinch.json' },
    ];
    for (const anim of animations) {
      if (anim.container) {
        lottie.loadAnimation({
          container: anim.container.nativeElement,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: anim.path,
        });
      }
    }
  }

  get newThisWeek(): number {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return this.users().filter((u) => new Date(u.createdAt) >= weekAgo).length;
  }

  get newThisMonth(): number {
    const now = new Date();
    return this.users().filter((u) => {
      const d = new Date(u.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }

  loadUsers(): void {
    this.isLoadingUsers.set(true);
    this.http.get<{ users: UserRecord[] }>(`${this.API}/admin/users`).subscribe({
      next: (res) => {
        this.users.set(res.users);
        this.isLoadingUsers.set(false);
      },
      error: () => {
        this.toast.error('Failed to load users.');
        this.isLoadingUsers.set(false);
      },
    });
  }

  createUser(): void {
    if (!this.newEmail || !this.newPassword) {
      this.toast.error('Email and password are required.');
      return;
    }
    this.isCreating.set(true);
    this.http
      .post<{ user: UserRecord }>(`${this.API}/admin/users`, {
        email: this.newEmail,
        password: this.newPassword,
        name: this.newName,
        role: this.newRole,
      })
      .subscribe({
        next: () => {
          this.newEmail = '';
          this.newPassword = '';
          this.newName = '';
          this.newRole = 'user';
          this.showCreateForm.set(false);
          this.isCreating.set(false);
          this.toast.success('User created successfully.');
          this.loadUsers();
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to create user.');
          this.isCreating.set(false);
        },
      });
  }

  deleteUser(id: string, email: string): void {
    if (!confirm(`Are you sure you want to delete "${email}"?`)) return;
    this.http.delete(`${this.API}/admin/users/${id}`).subscribe({
      next: () => {
        this.toast.success('User deleted successfully.');
        this.loadUsers();
      },
      error: () => this.toast.error('Failed to delete user.'),
    });
  }

  toggleRole(user: UserRecord): void {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    this.http
      .patch<{ user: UserRecord }>(`${this.API}/admin/users/${user._id}/role`, { role: newRole })
      .subscribe({
        next: () => {
          this.toast.success(`Role updated to "${newRole}" for ${user.email}.`);
          this.loadUsers();
        },
        error: () => this.toast.error('Failed to update role.'),
      });
  }

  toggleCreateForm(): void {
    this.showCreateForm.update((v) => !v);
  }

  logout(): void {
    this.toast.info('You have been signed out.');
    this.auth.logout();
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  get visibleUsers(): UserRecord[] {
    const selfId = this.currentUser()?.id;
    return this.users().filter((u) => u._id !== selfId);
  }

  get adminCount(): number {
    return this.users().filter((u) => u.role === 'admin').length;
  }
}
