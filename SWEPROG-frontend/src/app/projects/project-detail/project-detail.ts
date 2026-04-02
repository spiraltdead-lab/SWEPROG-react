import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjectService, Project } from '../../services/project';
import { AuthService } from '../../services/auth';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './project-detail.html',
  styleUrls: ['./project-detail.css']
})
export class ProjectDetailComponent implements OnInit {
  project: Project | null = null;
  loading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    public authService: AuthService,
    public translation: TranslationService
  ) {}

  t(key: string): string {
    return this.translation.instant(key);
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/projects']);
      return;
    }

    this.projectService.getProject(id).subscribe({
      next: (data) => {
        this.project = data;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Kunde inte hämta projektet';
        this.loading = false;
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'new': return 'status-new';
      case 'ongoing': return 'status-active';
      case 'completed': return 'status-completed';
      default: return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'new':       return 'Nytt';
      case 'ongoing':   return 'Pågående';
      case 'completed': return 'Avslutat';
      default: return status;
    }
  }

  getClientTypeLabel(type: string): string {
    switch (type) {
      case 'company': return '🏢 Företag';
      case 'private': return '👤 Privat';
      case 'org':     return '🤝 Organisation';
      case 'gov':     return '🏛️ Myndighet';
      default: return type;
    }
  }
}
