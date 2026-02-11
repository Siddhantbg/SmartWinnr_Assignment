import {
  Component,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  signal,
  effect,
} from '@angular/core';
import lottie from 'lottie-web';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';
import {
  Chart,
  LineController,
  BarController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

Chart.register(
  LineController,
  BarController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

interface AnalyticsOverview {
  totalUsers: number;
  adminCount: number;
  userCount: number;
  newThisMonth: number;
  newThisWeek: number;
}

interface MonthlySignup {
  label: string;
  count: number;
}

interface AnalyticsData {
  overview: AnalyticsOverview;
  monthlySignups: MonthlySignup[];
  roleDistribution: { admin: number; user: number };
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css',
})
export class AnalyticsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('lineCanvas') lineCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutCanvas') doughnutCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('totalUsersLottie') totalUsersLottie?: ElementRef<HTMLDivElement>;
  @ViewChild('adminsLottie') adminsLottie?: ElementRef<HTMLDivElement>;
  @ViewChild('newWeekLottie') newWeekLottie?: ElementRef<HTMLDivElement>;
  @ViewChild('newMonthLottie') newMonthLottie?: ElementRef<HTMLDivElement>;

  readonly isLoading = signal(true);
  readonly overview = signal<AnalyticsOverview | null>(null);
  readonly lastUpdated = signal<Date | null>(null);

  private lineChart: Chart | null = null;
  private barChart: Chart | null = null;
  private doughnutChart: Chart | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private statLottiesLoaded = false;

  private readonly API = environment.apiUrl;
  readonly POLL_INTERVAL_MS = 30_000;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly auth: AuthService,
    private readonly toast: ToastService,
  ) {
    effect(() => {
      if (this.overview() && !this.statLottiesLoaded) {
        setTimeout(() => this.loadStatLotties(), 0);
      }
    });
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
    this.statLottiesLoaded = true;
  }

  ngAfterViewInit(): void {
    this.fetchData();
    this.pollTimer = setInterval(() => this.fetchData(), this.POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollTimer !== null) clearInterval(this.pollTimer);
    this.lineChart?.destroy();
    this.barChart?.destroy();
    this.doughnutChart?.destroy();
  }

  fetchData(): void {
    this.isLoading.set(true);
    this.http.get<AnalyticsData>(`${this.API}/analytics`).subscribe({
      next: (data) => {
        this.overview.set(data.overview);
        this.lastUpdated.set(new Date());
        this.isLoading.set(false);
        this.renderCharts(data);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load analytics data.');
      },
    });
  }

  manualRefresh(): void {
    this.fetchData();
  }

  logout(): void {
    this.toast.info('You have been signed out.');
    this.auth.logout();
  }

  private renderCharts(data: AnalyticsData): void {
    const labels = data.monthlySignups.map((m) => m.label);
    const signupCounts = data.monthlySignups.map((m) => m.count);

    const totalBefore =
      (this.overview()?.totalUsers ?? 0) - signupCounts.reduce((a, b) => a + b, 0);
    const cumulativeCounts = signupCounts.reduce<number[]>((acc, count, i) => {
      acc.push((i === 0 ? totalBefore : acc[i - 1]) + count);
      return acc;
    }, []);

    this.buildLineChart(labels, cumulativeCounts);
    this.buildBarChart(labels, signupCounts);
    this.buildDoughnutChart(data.roleDistribution);
  }

  private buildLineChart(labels: string[], data: number[]): void {
    if (this.lineChart) {
      this.lineChart.data.labels = labels;
      (this.lineChart.data.datasets[0] as { data: number[] }).data = data;
      this.lineChart.update('none');
      return;
    }
    this.lineChart = new Chart(this.lineCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Users',
            data,
            borderColor: '#7dd3fc',
            backgroundColor: 'rgba(125, 211, 252, 0.12)',
            borderWidth: 2,
            pointBackgroundColor: '#7dd3fc',
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: {
            ticks: { color: 'rgba(255,255,255,0.55)', maxRotation: 30, font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,0.07)' },
          },
          y: {
            beginAtZero: true,
            ticks: { color: 'rgba(255,255,255,0.55)', font: { size: 11 }, stepSize: 1 },
            grid: { color: 'rgba(255,255,255,0.07)' },
          },
        },
      },
    });
  }

  private buildBarChart(labels: string[], data: number[]): void {
    if (this.barChart) {
      this.barChart.data.labels = labels;
      (this.barChart.data.datasets[0] as { data: number[] }).data = data;
      this.barChart.update('none');
      return;
    }
    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'New Signups',
            data,
            backgroundColor: 'rgba(125, 211, 252, 0.7)',
            borderColor: '#7dd3fc',
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: {
            ticks: { color: 'rgba(255,255,255,0.55)', maxRotation: 30, font: { size: 11 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: 'rgba(255,255,255,0.55)', font: { size: 11 }, stepSize: 1 },
            grid: { color: 'rgba(255,255,255,0.07)' },
          },
        },
      },
    });
  }

  private buildDoughnutChart(distribution: { admin: number; user: number }): void {
    const chartData = [distribution.admin, distribution.user];
    if (this.doughnutChart) {
      (this.doughnutChart.data.datasets[0] as { data: number[] }).data = chartData;
      this.doughnutChart.update('none');
      return;
    }
    this.doughnutChart = new Chart(this.doughnutCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Admin', 'User'],
        datasets: [
          {
            data: chartData,
            backgroundColor: ['rgba(125, 211, 252, 0.8)', 'rgba(125, 211, 252, 0.45)'],
            borderColor: ['#7dd3fc', '#7dd3fc'],
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: 'rgba(255,255,255,0.7)',
              padding: 16,
              font: { size: 13 },
            },
          },
          tooltip: { mode: 'index' },
        },
      },
    });
  }
}
