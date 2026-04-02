import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslationService, Language } from '../services/translation.service';
import { AuthService, User } from '../services/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  isScrolled = false;
  mobileMenuOpen = false;
  languageMenuOpen = false;
  userMenuOpen = false;
  currentLanguage: Language = 'sv';

  isLoggedIn = false;
  userName = '';
  userEmail = '';
  userRole: string = '';
  userInitials = '';

  private authSubscription!: Subscription;

  languages = [
    { code: 'sv' as Language, name: 'Svenska', flag: '🇸🇪' },
    { code: 'en' as Language, name: 'English', flag: '🇬🇧' },
    { code: 'ar' as Language, name: 'العربية', flag: '🇮🇶' }
  ];

  constructor(
    public translation: TranslationService,
    private authService: AuthService,
    public router: Router
  ) {}

  ngOnInit() {
    this.translation.currentLanguage$.subscribe(lang => {
      this.currentLanguage = lang;
    });

    this.authSubscription = this.authService.currentUser$.subscribe((user: User | null) => {
      this.isLoggedIn = !!user;
      if (user) {
        this.userName = user.name || 'Användare';
        this.userEmail = user.email || '';
        this.userRole = user.role || 'user';
        this.userInitials = this.getInitials(this.userName);
      } else {
        this.userName = '';
        this.userEmail = '';
        this.userRole = '';
        this.userInitials = '';
      }
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-chip')) {
      this.userMenuOpen = false;
    }
    if (!target.closest('.lang-picker')) {
      this.languageMenuOpen = false;
    }
  }

  // Navigering
  navigateToDashboard(event?: Event): void {
    event?.preventDefault();
    this.closeMenus();
    this.router.navigate(['/dashboard']);
  }

  navigateToAdminDashboard(event?: Event): void {
    event?.preventDefault();
    this.closeMenus();
    this.router.navigate(['/dashboard']);
  }

  navigateToUserManagement(event?: Event): void {
    event?.preventDefault();
    this.closeMenus();
    this.router.navigate(['/admin/users']);
  }

  navigateToProfile(event?: Event): void {
    event?.preventDefault();
    this.closeMenus();
    this.router.navigate(['/profile']);
  }

  navigateToHome(event?: Event): void {
    event?.preventDefault();
    this.closeMenus();
    this.router.navigate(['/']);
  }

  // Logout är nu void — ingen .subscribe() behövs
  logout(): void {
    this.userMenuOpen = false;
    this.mobileMenuOpen = false;
    this.authService.logout();
    this.router.navigate(['/']);
  }

  // Rollhantering
  get isAdmin(): boolean {
    return this.userRole === 'admin' || this.userRole === 'super_admin';
  }

  get isSuperAdmin(): boolean {
    return this.userRole === 'super_admin';
  }

  get isUser(): boolean {
    return this.userRole === 'user';
  }

  // Språk
  setLanguage(lang: Language) {
    this.translation.setLanguage(lang);
    this.languageMenuOpen = false;
    this.mobileMenuOpen = false;
  }

  toggleLanguageMenu() {
    this.languageMenuOpen = !this.languageMenuOpen;
    if (this.languageMenuOpen) {
      this.userMenuOpen = false;
    }
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      this.userMenuOpen = false;
      this.languageMenuOpen = false;
    }
  }

  closeMenus() {
    this.mobileMenuOpen = false;
    this.userMenuOpen = false;
    this.languageMenuOpen = false;
  }

  getCurrentLanguageFlag(): string {
    const lang = this.languages.find(l => l.code === this.currentLanguage);
    return lang ? lang.flag : '🇸🇪';
  }

  showHeaderItems(): boolean {
    return false;
  }

  private getInitials(name: string): string {
    if (!name) return 'U';
    return name.split(' ').map(p => p.charAt(0)).join('').toUpperCase().substring(0, 2);
  }
}
