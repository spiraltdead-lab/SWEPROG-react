import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-dashboard">
      <h1>{{ t('admin.dashboard') }}</h1>
      <div class="admin-stats">
        <div class="stat-card">
          <h3>{{ t('admin.users.title') }}</h3>
          <p class="stat-number">24</p>
          <a routerLink="/admin/users">{{ t('admin.users.list') }}</a>
        </div>
        <div class="stat-card">
          <h3>{{ t('admin.projects.title') }}</h3>
          <p class="stat-number">47</p>
          <a routerLink="/admin/projects">{{ t('admin.projects.manage') }}</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard {
      padding: 2rem;
    }
    .admin-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
      margin-top: 2rem;
    }
    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .stat-number {
      font-size: 2rem;
      font-weight: bold;
      color: #4A6FA5;
      margin: 0.5rem 0;
    }
  `]
})
export class AdminDashboardComponent {
  constructor(public translation: TranslationService) {}
  
  t(key: string): string {
    return this.translation.instant(key);
  }
}