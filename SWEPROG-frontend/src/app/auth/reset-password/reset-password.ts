import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TranslationService } from '../../services/translation.service';
import { environment } from '../../../environments/environment';

type PageState = 'validating' | 'invalid' | 'form' | 'success';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css']
})
export class ResetPasswordComponent implements OnInit {
  state: PageState = 'validating';

  token       = '';
  newPassword = '';
  confirmPw   = '';

  isLoading   = false;
  errorMessage = '';

  private apiUrl = environment.apiUrl + 'api';

  constructor(
    private route:       ActivatedRoute,
    private router:      Router,
    private http:        HttpClient,
    public  translation: TranslationService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || '';

    if (!this.token) {
      this.state = 'invalid';
      return;
    }

    const params = new HttpParams().set('lang', this.translation.currentLanguage);
    this.http.get(`${this.apiUrl}/password/reset/validate/${this.token}`, { params }).subscribe({
      next:  () => { this.state = 'form'; },
      error: () => { this.state = 'invalid'; }
    });
  }

  submit(): void {
    this.errorMessage = '';

    if (!this.newPassword || this.newPassword.length < 8) {
      this.errorMessage = this.t('auth.errors.passwordLength');
      return;
    }
    if (this.newPassword !== this.confirmPw) {
      this.errorMessage = this.t('auth.errors.passwordMismatch');
      return;
    }

    this.isLoading = true;

    this.http.post(`${this.apiUrl}/password/reset`, {
      token:       this.token,
      newPassword: this.newPassword,
      lang:        this.translation.currentLanguage
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.state = 'success';
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || this.t('auth.errors.serverError');
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  t(key: string): string {
    return this.translation.instant(key);
  }
}
