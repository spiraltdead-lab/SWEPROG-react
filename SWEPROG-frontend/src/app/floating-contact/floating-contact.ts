import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-floating-contact',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './floating-contact.html',
  styleUrls: ['./floating-contact.css']
})
export class FloatingContactComponent implements OnInit {
  isVisible = false;
  scrollProgress = 0;
  private scrollY = 0;

  constructor(private router: Router) {}

  @HostListener('window:scroll')
  onScroll() {
    this.scrollY = window.scrollY;
    this.isVisible = this.scrollY > 300;
    
    const winScroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    this.scrollProgress = height > 0 ? (winScroll / height) * 100 : 0;
  }

  @HostListener('window:resize')
  onResize() {
    this.onScroll();
  }

  ngOnInit() {
    this.onScroll();
  }

  getTransform(): string {
    const sinkAmount = Math.min(this.scrollY * 0.05, 50);
    return `translateY(${sinkAmount}px)`;
  }

  goToRegister() {
    this.router.navigate(['/login/register']);
  }
}