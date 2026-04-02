import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../services/auth';
import { TranslationService } from '../services/translation.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {
  user: any = null;
  editMode    = false;
  isSaving    = false;
  saveError   = '';
  saveSuccess = false;

  profileForm = { name: '', email: '', phone: '', company: '' };

  // Change-password section
  showPwSection = false;
  pwForm        = { current: '', newPw: '', confirm: '' };
  pwLoading     = false;
  pwError       = '';
  pwSuccess     = false;

  private apiUrl = environment.apiUrl + 'api';

  constructor(
    public authService: AuthService,
    public translation: TranslationService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        this.profileForm = {
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          company: user.company || ''
        };
      }
    });
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.token}`
    });
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    this.saveError = '';
    this.saveSuccess = false;

    // Återställ formuläret om man avbryter
    if (!this.editMode && this.user) {
      this.profileForm = {
        name: this.user.name || '',
        email: this.user.email || '',
        phone: this.user.phone || '',
        company: this.user.company || ''
      };
    }
  }

  saveProfile() {
    if (!this.profileForm.name) {
      this.saveError = 'Namn är obligatoriskt';
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    this.http.put(
      `${this.apiUrl}/users/profile`,
      {
        name: this.profileForm.name,
        phone: this.profileForm.phone,
        company: this.profileForm.company
      },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (updatedUser: any) => {
        this.isSaving = false;
        this.saveSuccess = true;
        this.editMode = false;

        // Uppdatera via AuthService — inte direkt till localStorage
        this.authService.updateCurrentUser(updatedUser.user || updatedUser);

        setTimeout(() => { this.saveSuccess = false; }, 3000);
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = err.error?.error || 'Kunde inte spara profilen';
        console.error('Profilsparning misslyckades:', err);
      }
    });
  }

  togglePwSection(): void {
    this.showPwSection = !this.showPwSection;
    this.pwForm     = { current: '', newPw: '', confirm: '' };
    this.pwError    = '';
    this.pwSuccess  = false;
  }

  changePassword(): void {
    this.pwError   = '';
    this.pwSuccess = false;

    if (!this.pwForm.current) {
      this.pwError = this.t('profile.currentPasswordRequired') || 'Ange nuvarande lösenord';
      return;
    }
    if (this.pwForm.newPw.length < 8) {
      this.pwError = this.t('auth.errors.passwordLength') || 'Minst 8 tecken';
      return;
    }
    if (this.pwForm.newPw !== this.pwForm.confirm) {
      this.pwError = this.t('auth.errors.passwordMismatch') || 'Lösenorden matchar inte';
      return;
    }

    this.pwLoading = true;

    this.http.post(
      `${this.apiUrl}/password/change`,
      {
        currentPassword: this.pwForm.current,
        newPassword:     this.pwForm.newPw,
        lang:            this.translation.currentLanguage
      },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.pwLoading = false;
        this.pwSuccess = true;
        this.pwForm    = { current: '', newPw: '', confirm: '' };
        setTimeout(() => { this.pwSuccess = false; }, 4000);
      },
      error: (err) => {
        this.pwLoading = false;
        this.pwError   = err.error?.message || this.t('auth.errors.serverError');
      }
    });
  }

  t(key: string): string {
    return this.translation.instant(key);
  }
}
