import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth';

type FlowMode = 'login' | 'register' | 'contact';

@Component({
  selector: 'app-contact-flow',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './contact-flow.html',
  styleUrls: ['./contact-flow.css']
})
export class ContactFlowComponent implements OnInit {
  currentMode: FlowMode = 'login';
  isAnimating = false;
  isLoading = false;

  formData = {
    loginEmail: '',
    loginPassword: '',
    regName: '',
    regEmail: '',
    regPassword: '',
    regConfirmPassword: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactMessage: ''
  };

  errors: string[] = [];
  successMessage = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.setMode('login');
  }

  setMode(mode: FlowMode) {
    if (this.currentMode === mode || this.isAnimating) return;

    this.isAnimating = true;
    this.errors = [];
    this.successMessage = '';

    setTimeout(() => {
      this.currentMode = mode;
      setTimeout(() => { this.isAnimating = false; }, 300);
    }, 200);
  }

  getContainerClass() {
    return {
      'flow-container': true,
      [`mode-${this.currentMode}`]: true,
      'animating': this.isAnimating
    };
  }

  getButtonText(): string {
    if (this.isLoading) return '...';
    const labels: Record<FlowMode, string> = {
      login: 'Logga in',
      register: 'Skapa konto',
      contact: 'Skicka meddelande'
    };
    return labels[this.currentMode];
  }

  getModeTitle(): string {
    const titles: Record<FlowMode, string> = {
      login: 'Logga in',
      register: 'Skapa konto',
      contact: 'Kontakta oss'
    };
    return titles[this.currentMode];
  }

  getModeDescription(): string {
    const descriptions: Record<FlowMode, string> = {
      login: 'Logga in för att fortsätta',
      register: 'Skapa ett gästkonto på 30 sekunder',
      contact: 'Vi svarar inom 24 timmar'
    };
    return descriptions[this.currentMode];
  }

  onSubmit() {
    this.errors = [];
    this.successMessage = '';

    switch (this.currentMode) {
      case 'login': this.handleLogin(); break;
      case 'register': this.handleRegister(); break;
      case 'contact': this.handleContact(); break;
    }
  }

  private handleLogin() {
    const { loginEmail, loginPassword } = this.formData;

    if (!loginEmail || !loginPassword) {
      this.errors.push('Fyll i både e-post och lösenord');
      return;
    }
    if (!this.isValidEmail(loginEmail)) {
      this.errors.push('Ogiltig e-postadress');
      return;
    }

    this.isLoading = true;

    this.authService.login(loginEmail, loginPassword).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const role = response.user?.role;
        if (role === 'admin' || role === 'super_admin') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.errors.push('Felaktig e-post eller lösenord');
        } else if (err.status === 0) {
          this.errors.push('Kunde inte nå servern. Kontrollera att backend körs.');
        } else {
          this.errors.push(err.error?.error || 'Inloggningen misslyckades');
        }
      }
    });
  }

  private handleRegister() {
    const { regName, regEmail, regPassword, regConfirmPassword } = this.formData;

    if (!regName || !regEmail || !regPassword || !regConfirmPassword) {
      this.errors.push('Fyll i alla fält');
      return;
    }
    if (!this.isValidEmail(regEmail)) {
      this.errors.push('Ogiltig e-postadress');
      return;
    }
    if (regPassword.length < 8) {
      this.errors.push('Lösenordet måste vara minst 8 tecken');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      this.errors.push('Lösenorden matchar inte');
      return;
    }

    this.isLoading = true;

    this.authService.registerGuest({
      name: regName,
      email: regEmail,
      password: regPassword,
      acceptTerms: true
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errors.push(err.error?.error || 'Registreringen misslyckades');
      }
    });
  }

  private handleContact() {
    const { contactName, contactEmail, contactMessage } = this.formData;

    if (!contactName || !contactEmail || !contactMessage) {
      this.errors.push('Fyll i namn, e-post och meddelande');
      return;
    }
    if (!this.isValidEmail(contactEmail)) {
      this.errors.push('Ogiltig e-postadress');
      return;
    }

    // TODO: koppla till kontakt-API när det finns
    this.successMessage = 'Tack! Vi återkommer inom kort.';
    this.formData.contactName = '';
    this.formData.contactEmail = '';
    this.formData.contactPhone = '';
    this.formData.contactMessage = '';
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
