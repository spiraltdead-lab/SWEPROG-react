import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ProjectService, Project } from '../services/project';
import { AuthService } from '../services/auth';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './projects.html',
  styleUrls: ['./projects.css']
})
export class ProjectsComponent implements OnInit {
  projects: Project[] = [];
  filteredProjects: Project[] = [];
  loading = true;
  errorMessage = '';

  // Filter
  selectedStatus: string = 'alla';
  searchTerm: string = '';

  constructor(
    private projectService: ProjectService,
    public authService: AuthService,
    public translation: TranslationService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['status']) {
        this.selectedStatus = params['status'];
      }
      this.loadProjects();
    });
  }

  loadProjects(): void {
    this.loading = true;
    this.projectService.getProjects(this.selectedStatus, this.searchTerm).subscribe({
      next: (data) => {
        this.projects = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Fel vid laddning av projekt:', error);
        this.errorMessage = 'Kunde inte ladda projekt';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = this.projects;

    if (this.selectedStatus !== 'alla') {
      filtered = filtered.filter(p => p.status === this.selectedStatus);
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.title_sv.toLowerCase().includes(term) ||
        p.client_name?.toLowerCase().includes(term)
      );
    }

    this.filteredProjects = filtered;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSearch(): void {
    this.applyFilters();
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'new': return 'status-new';
      case 'ongoing': return 'status-active';
      case 'completed': return 'status-completed';
      default: return '';
    }
  }

  getStatusText(status: string): string {
    switch(status) {
      case 'new': return this.t('projects.status.new');
      case 'ongoing': return this.t('projects.status.ongoing');
      case 'completed': return this.t('projects.status.completed');
      default: return status;
    }
  }

  deleteProject(id: number, event: Event): void {
    event.stopPropagation();
    if (confirm('Är du säker på att du vill ta bort detta projekt?')) {
      this.projectService.deleteProject(id).subscribe({
        next: () => {
          this.projects = this.projects.filter(p => p.id !== id);
          this.applyFilters();
        },
        error: (error) => {
          console.error('Fel vid borttagning:', error);
          alert('Kunde inte ta bort projektet');
        }
      });
    }
  }

  t(key: string): string {
    return this.translation.instant(key);
  }
}