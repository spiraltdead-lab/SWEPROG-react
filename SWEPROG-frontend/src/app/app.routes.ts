import { Routes } from '@angular/router';
import { HomeComponent }          from './home/home';
import { Login }                  from './auth/login/login';
import { DashboardComponent }     from './dashboard/dashboard';
import { ProjectsComponent }      from './projects/projects';
import { ProjectDetailComponent } from './projects/project-detail/project-detail';
import { ProjectFormComponent }   from './projects/project-form/project-form';
import { ProfileComponent }       from './profile/profile';
import { OffersComponent }        from './offers/offers';
import { authGuard }              from './guards/auth.guard';
import { adminGuard }             from './guards/admin.guard';
import { permissionGuard }        from './guards/permission.guard';

export const routes: Routes = [
  // Public
  { path: '',               component: HomeComponent },
  { path: 'login',          component: Login },
  { path: 'offers',         component: OffersComponent },
  {
    path: 'reset-password',
    loadComponent: () => import('./auth/reset-password/reset-password').then(m => m.ResetPasswordComponent)
  },

  // Protected
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'projects',  component: ProjectsComponent,  canActivate: [authGuard] },
  {
    path: 'projects/new',
    component: ProjectFormComponent,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'projects/:id',
    component: ProjectDetailComponent,
    canActivate: [authGuard]
  },
  {
    path: 'projects/:id/edit',
    component: ProjectFormComponent,
    canActivate: [authGuard, adminGuard]
  },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },

  // Admin
  { path: 'admin/dashboard', redirectTo: 'dashboard' },
  {
    path: 'admin/users',
    loadComponent: () => import('./admin/users/user').then(m => m.UsersComponent),
    canActivate: [authGuard, permissionGuard('access_admin')]
  },

  // Catch-all
  { path: '**', redirectTo: '' }
];
