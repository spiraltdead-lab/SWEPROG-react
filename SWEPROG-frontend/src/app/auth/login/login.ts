import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { TranslationService } from '../../services/translation.service';
import { environment } from '../../../environments/environment';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  mode: AuthMode = 'login';

  // Login fields
  loginEmail = '';
  loginPassword = '';

  // Register fields (endast för gäster)
  regName = '';
  regEmail = '';
  regPassword = '';
  regConfirmPassword = '';
  acceptTerms = false;

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Forgot-password modal
  showForgotModal  = false;
  forgotEmail      = '';
  forgotLoading    = false;
  forgotError      = '';
  forgotSuccess    = false;

  private apiUrl = environment.apiUrl + 'api';

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    public translation: TranslationService
  ) {}

  switchMode(mode: AuthMode): void {
    this.mode = mode;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onSubmit(): void {
    if (this.mode === 'login') {
      this.handleLogin();
    } else {
      this.handleRegister();
    }
  }

  private handleLogin(): void {
    // Validera login
    if (!this.loginEmail || !this.loginPassword) {
      this.errorMessage = this.translation.instant('auth.errors.required') || 'Fyll i både e-post och lösenord';
      return;
    }

    if (!this.isValidEmail(this.loginEmail)) {
      this.errorMessage = this.translation.instant('auth.errors.invalidEmail') || 'Ogiltig e-postadress';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginEmail, this.loginPassword).subscribe({
      next: (response) => {
        console.log('✅ Inloggning lyckades:', response);
        this.isLoading = false;
        
        // Navigera baserat på användarens roll
        const user = response.user;
        if (user.role === 'admin' || user.role === 'super_admin') {
          this.router.navigate(['/admin/dashboard']);
        } else if (user.role === 'user') {
          this.router.navigate(['/dashboard']);
        } else {
          // Gästanvändare - se dummy-data
          this.router.navigate(['/dashboard'], { queryParams: { demo: 'true' } });
        }
      },
      error: (error) => {
        console.error('❌ Inloggning misslyckades:', error);
        this.isLoading = false;
        
        if (error.status === 401) {
          this.errorMessage = this.translation.instant('auth.errors.invalidCredentials') || 'Felaktig e-post eller lösenord';
        } else if (error.status === 0) {
          this.errorMessage = this.translation.instant('auth.errors.serverError') || 'Kunde inte nå servern. Kontrollera att backend körs.';
        } else {
          this.errorMessage = error.error?.error || this.translation.instant('auth.errors.unknown') || 'Inloggningen misslyckades';
        }
      }
    });
  }

  private handleRegister(): void {
    // Validera registrering
    if (!this.regName || !this.regEmail || !this.regPassword || !this.regConfirmPassword) {
      this.errorMessage = this.translation.instant('auth.errors.registerRequired') || 'Fyll i alla fält';
      return;
    }

    if (!this.isValidEmail(this.regEmail)) {
      this.errorMessage = this.translation.instant('auth.errors.invalidEmail') || 'Ogiltig e-postadress';
      return;
    }

    if (this.regPassword.length < 8) {
      this.errorMessage = this.translation.instant('auth.errors.passwordLength') || 'Lösenordet måste vara minst 8 tecken';
      return;
    }

    if (this.regPassword !== this.regConfirmPassword) {
      this.errorMessage = this.translation.instant('auth.errors.passwordMismatch') || 'Lösenorden matchar inte';
      return;
    }

    if (!this.acceptTerms) {
      this.errorMessage = this.translation.instant('auth.errors.termsRequired') || 'Du måste godkänna villkoren';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Registrera som GÄST (automatiskt roll = guest)
    this.authService.registerGuest({
      name: this.regName,
      email: this.regEmail,
      password: this.regPassword,
      acceptTerms: this.acceptTerms
    }).subscribe({
      next: (response) => {
        console.log('✅ Gäst-registrering lyckades:', response);
        this.isLoading = false;
        this.successMessage = this.translation.instant('auth.registerSuccess') || 'Konto skapat! Välkommen som gäst.';
        
        // Autologin sker i servicen, navigera till dashboard med demo-param
        setTimeout(() => {
          this.router.navigate(['/dashboard'], { queryParams: { demo: 'true' } });
        }, 1500);
      },
      error: (error) => {
        console.error('❌ Registrering misslyckades:', error);
        this.isLoading = false;
        
        if (error.status === 409) {
          this.errorMessage = this.translation.instant('auth.errors.emailExists') || 'E-postadressen finns redan';
        } else if (error.status === 0) {
          this.errorMessage = this.translation.instant('auth.errors.serverError') || 'Kunde inte nå servern';
        } else {
          this.errorMessage = error.error?.error || this.translation.instant('auth.errors.registerFailed') || 'Registreringen misslyckades';
        }
      }
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // LÄGG TILL DENNA METOD - den används i template
  getButtonText(): string {
    if (this.isLoading) {
      return this.mode === 'login' 
        ? (this.translation.instant('auth.loggingIn') || 'Loggar in...')
        : (this.translation.instant('auth.registering') || 'Skapar konto...');
    }
    return this.mode === 'login' 
      ? (this.translation.instant('auth.login') || 'Logga in')
      : (this.translation.instant('auth.register') || 'Skapa gästkonto');
  }

  // ── Forgot-password modal ─────────────────────────────────────────────────

  openForgotModal(): void {
    this.forgotEmail   = this.loginEmail;
    this.forgotError   = '';
    this.forgotSuccess = false;
    this.forgotLoading = false;
    this.showForgotModal = true;
  }

  closeForgotModal(): void {
    this.showForgotModal = false;
  }

  submitForgot(): void {
    this.forgotError = '';

    if (!this.forgotEmail || !this.isValidEmail(this.forgotEmail)) {
      this.forgotError = this.t('auth.errors.invalidEmail');
      return;
    }

    this.forgotLoading = true;

    this.http.post(`${this.apiUrl}/password/forgot`, {
      email: this.forgotEmail,
      lang:  this.translation.currentLanguage
    }).subscribe({
      next: () => {
        this.forgotLoading = false;
        this.forgotSuccess = true;
      },
      error: () => {
        this.forgotLoading = false;
        // Backend always returns 200 on forgot — any error is network-level
        this.forgotError = this.t('auth.errors.serverError');
      }
    });
  }

  t(key: string): string {
    return this.translation.instant(key);
  }
}