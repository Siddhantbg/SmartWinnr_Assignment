import { Component, AfterViewInit, ViewChild, ElementRef, signal } from '@angular/core';
import lottie from 'lottie-web';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { FloatingLinesComponent } from '../../components/floating-lines/floating-lines.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, FloatingLinesComponent, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements AfterViewInit {
  @ViewChild('lottieIcon') lottieIcon?: ElementRef<HTMLDivElement>;

  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  readonly isLoading = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirm = signal(false);

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (!this.name.trim()) {
      this.toast.error('Please enter your full name.');
      return;
    }
    if (!this.email.trim()) {
      this.toast.error('Please enter your email address.');
      return;
    }
    if (this.password.length < 6) {
      this.toast.error('Password must be at least 6 characters.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.toast.error('Passwords do not match.');
      return;
    }

    this.isLoading.set(true);
    this.auth.register(this.name.trim(), this.email.trim(), this.password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Account created successfully. Welcome!');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message ?? 'Registration failed. Please try again.');
      },
    });
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  ngAfterViewInit(): void {
    if (this.lottieIcon) {
      lottie.loadAnimation({
        container: this.lottieIcon.nativeElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/assets/wired-outline-1062-disco-ball-hover-pinch.json',
      });
    }
  }

  toggleConfirm(): void {
    this.showConfirm.update((v) => !v);
  }
}
