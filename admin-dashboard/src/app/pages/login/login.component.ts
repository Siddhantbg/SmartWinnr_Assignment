import { Component, AfterViewInit, ViewChild, ElementRef, signal } from '@angular/core';
import lottie from 'lottie-web';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { FloatingLinesComponent } from '../../components/floating-lines/floating-lines.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, FloatingLinesComponent, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements AfterViewInit {
  @ViewChild('lottieIcon') lottieIcon?: ElementRef<HTMLDivElement>;

  email = '';
  password = '';
  readonly isLoading = signal(false);
  readonly showPassword = signal(false);

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
    if (!this.email.trim() || !this.password) {
      this.toast.error('Please enter your email and password.');
      return;
    }

    this.isLoading.set(true);

    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Signed in successfully. Welcome back!');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Login failed. Please check your credentials.');
      },
    });
  }

  ngAfterViewInit(): void {
    if (this.lottieIcon) {
      lottie.loadAnimation({
        container: this.lottieIcon.nativeElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/assets/wired-outline-926-roadblock-hover-pinch.json',
      });
    }
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }
}
