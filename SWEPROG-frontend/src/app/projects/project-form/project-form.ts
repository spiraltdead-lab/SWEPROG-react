import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjectService, Project } from '../../services/project';
import { TranslationService } from '../../services/translation.service';

interface TechItem {
  name: string;
  icon: string;
  category: string;
}

interface ClientType {
  value: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './project-form.html',
  styleUrls: ['./project-form.css']
})
export class ProjectFormComponent implements OnInit {
  isEditMode = false;
  projectId: number | null = null;
  loading = false;
  saving = false;
  errorMessage = '';

  hours: number | null = null;
  hourlyRate: number | null = null;

  project: Project = {
    title_sv: '',
    description_sv: '',
    status: 'new',
    price: undefined,
    start_date: '',
    deadline: '',
    contact_person: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    internal_comment: '',
    technologies: [],
    project_type: '',
    client_type: 'company',
    is_paid: false,
    has_hosting: false,
    domain: ''
  };

  projectTypes = [
    'Webb', 'App', 'Intranät', 'CRM', 'API', 'Skräddarsytt', 'Övrigt'
  ];

  clientTypes: ClientType[] = [
    { value: 'company',  label: 'Företag',       icon: '🏢' },
    { value: 'private',  label: 'Privat',         icon: '👤' },
    { value: 'org',      label: 'Organisation',   icon: '🤝' },
    { value: 'gov',      label: 'Myndighet',      icon: '🏛️' }
  ];

  techGroups: { category: string; techs: TechItem[] }[] = [
    {
      category: 'Frontend',
      techs: [
        { name: 'React',       icon: '⚛️', category: 'Frontend' },
        { name: 'Angular',     icon: '🅰️', category: 'Frontend' },
        { name: 'Vue.js',      icon: '💚', category: 'Frontend' },
        { name: 'TypeScript',  icon: '📘', category: 'Frontend' },
        { name: 'Next.js',     icon: '◆',  category: 'Frontend' },
        { name: 'Tailwind',    icon: '🎨', category: 'Frontend' }
      ]
    },
    {
      category: 'Backend',
      techs: [
        { name: 'Node.js',  icon: '🟢', category: 'Backend' },
        { name: 'Python',   icon: '🐍', category: 'Backend' },
        { name: 'PHP',      icon: '🐘', category: 'Backend' },
        { name: 'Java',     icon: '☕', category: 'Backend' },
        { name: 'Go',       icon: '🐹', category: 'Backend' },
        { name: '.NET',     icon: '🔷', category: 'Backend' }
      ]
    },
    {
      category: 'Databas',
      techs: [
        { name: 'MySQL',      icon: '🐬', category: 'Databas' },
        { name: 'PostgreSQL', icon: '🐘', category: 'Databas' },
        { name: 'MongoDB',    icon: '🍃', category: 'Databas' },
        { name: 'Redis',      icon: '⚡', category: 'Databas' },
        { name: 'Firebase',   icon: '🔥', category: 'Databas' }
      ]
    },
    {
      category: 'Hosting',
      techs: [
        { name: 'AWS',          icon: '☁️', category: 'Hosting' },
        { name: 'Azure',        icon: '🔵', category: 'Hosting' },
        { name: 'Google Cloud', icon: '🌐', category: 'Hosting' },
        { name: 'Vercel',       icon: '▲',  category: 'Hosting' },
        { name: 'DigitalOcean', icon: '🌊', category: 'Hosting' }
      ]
    },
    {
      category: 'DevOps',
      techs: [
        { name: 'Docker',     icon: '🐳', category: 'DevOps' },
        { name: 'Kubernetes', icon: '☸️', category: 'DevOps' },
        { name: 'CI/CD',      icon: '🔄', category: 'DevOps' },
        { name: 'Nginx',      icon: '🔀', category: 'DevOps' }
      ]
    },
    {
      category: 'CMS',
      techs: [
        { name: 'WordPress',  icon: '🖊️', category: 'CMS' },
        { name: 'Strapi',     icon: '🎯', category: 'CMS' },
        { name: 'Contentful', icon: '📋', category: 'CMS' },
        { name: 'Sanity',     icon: '✏️', category: 'CMS' }
      ]
    }
  ];

  errors: { [key: string]: string } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    public translation: TranslationService
  ) {}

  t(key: string): string {
    return this.translation.instant(key);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.projectId = Number(id);
      this.loadProject(this.projectId);
    }
  }

  loadProject(id: number): void {
    this.loading = true;
    this.projectService.getProject(id).subscribe({
      next: (data) => {
        this.project = {
          ...data,
          start_date: data.start_date ? data.start_date.substring(0, 10) : '',
          deadline:   data.deadline   ? data.deadline.substring(0, 10)   : '',
          technologies: data.technologies ?? []
        };
        if (data.price) {
          this.hourlyRate = 1000;
          this.hours = data.price / this.hourlyRate;
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Kunde inte ladda projektet';
        this.loading = false;
      }
    });
  }

  isTechSelected(name: string): boolean {
    return this.project.technologies?.includes(name) ?? false;
  }

  toggleTech(name: string): void {
    const techs = this.project.technologies ?? [];
    this.project.technologies = techs.includes(name)
      ? techs.filter(t => t !== name)
      : [...techs, name];
  }

  get calculatedPrice(): number {
    return (this.hours ?? 0) * (this.hourlyRate ?? 0);
  }

  onPriceChange(): void {
    this.project.price = this.calculatedPrice || undefined;
  }

  get progress(): number {
    let filled = 0;
    if (this.project.title_sv?.trim())       filled++;
    if (this.project.project_type)            filled++;
    if (this.project.description_sv?.trim()) filled++;
    if ((this.project.technologies?.length ?? 0) > 0) filled++;
    if (this.project.client_name?.trim())    filled++;
    if (this.project.start_date)             filled++;
    if (this.project.deadline)               filled++;
    if (this.hours && this.hourlyRate)       filled++;
    return Math.round((filled / 8) * 100);
  }

  get progressColor(): string {
    if (this.progress < 30) return '#ef4444';
    if (this.progress < 70) return '#f59e0b';
    return '#667eea';
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'new':       return 'Nytt';
      case 'ongoing':   return 'Pågående';
      case 'completed': return 'Avslutat';
      default: return status;
    }
  }

  validate(): boolean {
    this.errors = {};
    if (!this.project.title_sv?.trim())    this.errors['title']  = 'Projektnamn är obligatoriskt';
    if (!this.project.client_name?.trim()) this.errors['client'] = 'Kundnamn är obligatoriskt';
    return Object.keys(this.errors).length === 0;
  }

  submit(): void {
    if (!this.validate()) return;

    this.project.price = this.calculatedPrice || undefined;
    this.saving = true;
    this.errorMessage = '';

    const action = this.isEditMode
      ? this.projectService.updateProject(this.projectId!, this.project)
      : this.projectService.createProject(this.project);

    action.subscribe({
      next: (res) => {
        const targetId = this.isEditMode ? this.projectId : res.id;
        this.router.navigate(['/projects', targetId]);
      },
      error: () => {
        this.errorMessage = 'Kunde inte spara projektet. Försök igen.';
        this.saving = false;
      }
    });
  }
}
