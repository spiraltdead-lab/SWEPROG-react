import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { AuthService } from '../services/auth';
import { TranslationService } from '../services/translation.service';
import { DashboardStatsService, DashboardStats } from '../services/dashboard-stats';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('statusChart') statusChartRef!: ElementRef;
  @ViewChild('trendChart') trendChartRef!: ElementRef;
  @ViewChild('techChart') techChartRef!: ElementRef;

  stats: DashboardStats | null = null;
  loading = true;
  currentDate = new Date();
  currentLanguage = 'sv';
  
  private statsSubscription!: Subscription;
  private langSubscription!: Subscription;
  
  // Färger för diagram
  colors = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
    pink: '#ec4899'
  };

  constructor(
    public authService: AuthService,
    public translation: TranslationService,
    private statsService: DashboardStatsService
  ) {}

  ngOnInit(): void {
    // Prenumerera på språkändringar för att uppdatera UI
    this.langSubscription = this.translation.currentLanguage$.subscribe(lang => {
      this.currentLanguage = lang;
      if (this.stats) {
        // Uppdatera diagram med nytt språk
        this.updateChartsLanguage();
      }
    });

    this.loadStats();
  }

  ngAfterViewInit(): void {
    // Vänta på att DOM är redo
    setTimeout(() => {
      if (this.stats) {
        this.createCharts();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.statsSubscription) {
      this.statsSubscription.unsubscribe();
    }
    if (this.langSubscription) {
      this.langSubscription.unsubscribe();
    }
  }

  loadStats(): void {
    this.loading = true;
    this.statsSubscription = this.statsService.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
        setTimeout(() => this.createCharts(), 0);
      },
      error: (error) => {
        console.error('Fel vid laddning av statistik:', error);
        this.loading = false;
      }
    });
  }

  createCharts(): void {
    if (!this.stats) return;

    // Status-diagram (cirkeldiagram)
    if (this.statusChartRef) {
      new Chart(this.statusChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: this.stats.projectsByStatus.map(s => s.status),
          datasets: [{
            data: this.stats.projectsByStatus.map(s => s.count),
            backgroundColor: this.stats.projectsByStatus.map(s => s.color),
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.raw as number;
                  const total = this.stats!.totalProjects;
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${context.label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }

    // Trend-diagram (linjediagram)
    if (this.trendChartRef) {
      new Chart(this.trendChartRef.nativeElement, {
        type: 'line',
        data: {
          labels: this.stats.projectsByMonth.map(m => m.month),
          datasets: [
            {
              label: this.translation.instant('dashboard.charts.newProjects') || 'Nya projekt',
              data: this.stats.projectsByMonth.map(m => m.count),
              borderColor: this.colors.primary,
              backgroundColor: this.colors.primary + '20',
              tension: 0.4,
              fill: true
            },
            {
              label: this.translation.instant('dashboard.charts.revenue') || 'Intäkter (kSEK)',
              data: this.stats.projectsByMonth.map(m => m.revenue / 1000),
              borderColor: this.colors.success,
              backgroundColor: this.colors.success + '20',
              tension: 0.4,
              fill: true,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              position: 'top'
            }
          },
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: this.translation.instant('dashboard.charts.projectCount') || 'Antal projekt'
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: this.translation.instant('dashboard.charts.revenueKSEK') || 'Intäkter (kSEK)'
              },
              grid: {
                drawOnChartArea: false
              }
            }
          }
        }
      });
    }

    // Teknologi-diagram (stapeldiagram)
    if (this.techChartRef && this.stats.topTechnologies.length > 0) {
      new Chart(this.techChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: this.stats.topTechnologies.map(t => t.name),
          datasets: [{
            label: this.translation.instant('dashboard.charts.usageCount') || 'Användningar',
            data: this.stats.topTechnologies.map(t => t.count),
            backgroundColor: [
              this.colors.primary,
              this.colors.success,
              this.colors.warning,
              this.colors.purple,
              this.colors.pink
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }
  }

  updateChartsLanguage(): void {
    // Återskapa diagram med nytt språk
    if (this.stats) {
      this.createCharts();
    }
  }

  formatCurrency(value: number): string {
    if (!value || isNaN(value)) {
      return '0 ' + (this.translation.instant('common.currency') || 'kr');
    }
    return new Intl.NumberFormat(this.currentLanguage === 'sv' ? 'sv-SE' : 
                                 this.currentLanguage === 'en' ? 'en-US' : 'ar-SA', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return this.translation.instant('common.today') || 'Idag';
    if (diffDays === 1) return this.translation.instant('common.yesterday') || 'Igår';
    if (diffDays < 7) return `${diffDays} ${this.translation.instant('common.daysAgo') || 'dagar sedan'}`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} ${this.translation.instant('common.weeksAgo') || 'veckor sedan'}`;
    return `${Math.floor(diffDays / 30)} ${this.translation.instant('common.monthsAgo') || 'månader sedan'}`;
  }

  // Hjälpmetod för översättningar i template
  t(key: string): string {
    return this.translation.instant(key);
  }
}