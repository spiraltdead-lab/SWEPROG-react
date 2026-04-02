import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment.prod';

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  newProjects: number;
  totalRevenue: number;
  averageProjectValue: number;
  projectsByStatus: { status: string; count: number; color: string }[];
  projectsByMonth: { month: string; count: number; revenue: number }[];
  topTechnologies: { name: string; count: number; percentage: number }[];
  recentActivities: Activity[];
}

export type ActivityType = 'project_created' | 'project_updated' | 'project_completed' | 'user_login';

export interface Activity {
  id: number;
  type: ActivityType;
  description: string;
  timestamp: Date;
  user: string;
  icon: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardStatsService {
  private apiUrl = environment.apiUrl + 'api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getDashboardStats(): Observable<DashboardStats> {
    // Alla användare hämtar data från respektive tabell via API:et
    // Backend bestämmer vilken tabell som används baserat på roll
    console.log('📊 Hämtar dashboard-statistik från API');
    
    return this.http.get<any[]>(`${this.apiUrl}/projects`, {
      headers: { 'Authorization': `Bearer ${this.authService.token}` }
    }).pipe(
      map(projects => {
        console.log(`📊 Hämtade ${projects.length} projekt från API`);
        return this.calculateStats(projects);
      })
    );
  }

  private calculateStats(projects: any[]): DashboardStats {
    console.log('🔍 Beräknar statistik från', projects.length, 'projekt');
    
    // Grundläggande statistik
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'ongoing').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const newProjects = projects.filter(p => p.status === 'new').length;
    
    // Räkna total intäkt
    const totalRevenue = projects.reduce((sum, p) => {
      const price = p.price ? Number(p.price) : 0;
      return sum + price;
    }, 0);
    
    const averageProjectValue = totalProjects > 0 ? Math.round(totalRevenue / totalProjects) : 0;

    // Projekt per status
    const projectsByStatus = [
      { status: 'Nya projekt', count: newProjects, color: '#3b82f6' },
      { status: 'Pågående', count: activeProjects, color: '#f59e0b' },
      { status: 'Avslutade', count: completedProjects, color: '#10b981' }
    ];

    // Projekt per månad (senaste 6 månaderna)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
    const projectsByMonth = [];
    
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(today.getMonth() - i);
      
      const monthName = months[date.getMonth()];
      const year = date.getFullYear();
      const monthStr = `${monthName} ${year}`;
      
      const monthProjects = projects.filter(p => {
        if (!p.created_at) return false;
        const created = new Date(p.created_at);
        return created.getMonth() === date.getMonth() && 
               created.getFullYear() === date.getFullYear();
      });
      
      const monthRevenue = monthProjects.reduce((sum, p) => {
        const price = p.price ? Number(p.price) : 0;
        return sum + price;
      }, 0);
      
      projectsByMonth.push({
        month: monthStr,
        count: monthProjects.length,
        revenue: monthRevenue
      });
    }

    // Toppteknologier
    const techCount = new Map<string, number>();
    projects.forEach(p => {
      if (p.technologies) {
        const techs = Array.isArray(p.technologies) 
          ? p.technologies 
          : (typeof p.technologies === 'string' ? p.technologies.split(',') : []);
        
        techs.forEach((tech: string) => {
          const trimmed = tech.trim();
          if (trimmed) {
            techCount.set(trimmed, (techCount.get(trimmed) || 0) + 1);
          }
        });
      }
    });

    const topTechnologies = Array.from(techCount.entries())
      .map(([name, count]) => ({
        name,
        count: count as number,
        percentage: totalProjects > 0 ? Math.round((count as number / totalProjects) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Skapa aktiviteter från projekten
    const recentActivities = projects
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((p, index) => {
        let type: ActivityType;
        let icon: string;
        let action: string;
        
        if (p.status === 'completed') {
          type = 'project_completed';
          icon = '✅';
          action = 'slutfört';
        } else if (p.status === 'ongoing') {
          type = 'project_updated';
          icon = '📝';
          action = 'uppdaterat';
        } else {
          type = 'project_created';
          icon = '🚀';
          action = 'skapat';
        }
        
        return {
          id: index,
          type: type,
          description: `${p.title_sv} ${action}`,
          timestamp: new Date(p.created_at),
          user: 'Admin',
          icon: icon
        };
      });

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      newProjects,
      totalRevenue,
      averageProjectValue,
      projectsByStatus,
      projectsByMonth,
      topTechnologies,
      recentActivities
    };
  }
}