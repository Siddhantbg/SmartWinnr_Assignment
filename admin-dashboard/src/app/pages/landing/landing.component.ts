import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import lottie from 'lottie-web';
import { RouterLink } from '@angular/router';
import { FloatingLinesComponent } from '../../components/floating-lines/floating-lines.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [FloatingLinesComponent, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent implements AfterViewInit {
  @ViewChild('lottieAdminDashboard', { static: false }) lottieAdminDashboard?: ElementRef<HTMLSpanElement>;
  @ViewChild('lottiePencilPaper', { static: false }) lottiePencilPaper?: ElementRef<HTMLSpanElement>;
  @ViewChild('lottiePencil', { static: false }) lottiePencil?: ElementRef<HTMLSpanElement>;

  ngAfterViewInit(): void {
    const animations: { container?: ElementRef<HTMLSpanElement>; path: string }[] = [
      { container: this.lottieAdminDashboard, path: '/assets/wired-outline-970-video-conference-hover-pinch.json' },
      { container: this.lottiePencilPaper, path: '/assets/pencil_paper.json' },
      { container: this.lottiePencil, path: '/assets/pencil.json' },
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
}
