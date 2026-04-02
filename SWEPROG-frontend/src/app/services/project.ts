import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

export interface Project {
  id?: number;
  title_sv: string;
  description_sv?: string;
  status: 'new' | 'ongoing' | 'completed';
  price?: number;
  start_date?: string;
  deadline?: string;
  completed_date?: string;
  contact_person?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  internal_comment?: string;
  technologies?: string[];
  project_type?: string;
  client_type?: string;
  is_paid?: boolean;
  has_hosting?: boolean;
  domain?: string;
  media?: any[];
  created_at?: string;
  is_demo?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = environment.apiUrl + 'api/projects';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.token}`
    });
  }

  getProjects(status?: string, search?: string): Observable<Project[]> {
    let url = this.apiUrl;
    const params: string[] = [];
    
    if (status && status !== 'alla') {
      params.push(`status=${status}`);
    }
    if (search) {
      params.push(`search=${encodeURIComponent(search)}`);
    }
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    
    return this.http.get<Project[]>(url, { headers: this.getHeaders() });
  }

  getProject(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  createProject(project: Project): Observable<any> {
    return this.http.post(this.apiUrl, project, { headers: this.getHeaders() });
  }

  updateProject(id: number, project: Project): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, project, { headers: this.getHeaders() });
  }

  deleteProject(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}