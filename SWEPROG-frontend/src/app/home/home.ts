import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { TranslationService } from '../services/translation.service';
import { ContactService } from '../services/contact.service';
import { AuthService, User } from '../services/auth';
import { Subscription } from 'rxjs/internal/Subscription';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  currentLanguage$: any;
  
  // Mouse for 3D effects
  mouseX: number = 0.5;
  mouseY: number = 0.5;
  window = window;
  
  // THREE.js
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private floatingSpheres: THREE.Mesh[] = [];
  private animationFrame!: number;

  floatingElements = [1, 2, 3];

  contactForm = { name: '', email: '', message: '', offer: '' };
  contactSent = false;
  contactSending = false;
  contactError = false;
  isLoggedIn = false;
  private pendingScrollToContact = false;
  private authSubscription!: Subscription;

  private colors = {
    primary: 0x4A6FA5,
    accent: 0xD4AF37
  };

  // Index för loopar
  serviceIndices = [0, 1, 2, 3];
  reasonIndices = [0, 1, 2, 3];
  offerIndices = [0, 1, 2];

  constructor(
    public translation: TranslationService,
    private route: ActivatedRoute,
        private authService: AuthService,
    
    private contactService: ContactService
  ) {
    this.currentLanguage$ = this.translation.currentLanguage$;
  }

  ngOnInit() {
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('resize', () => this.onWindowResize());
    this.route.queryParams.subscribe(params => {
      if (params['scrollTo'] === 'contact') {
        this.pendingScrollToContact = true;
      }
      if (params['offer']) {
        this.contactForm.offer = String(params['offer']);
      }
    });
    this.authSubscription = this.authService.currentUser$.subscribe((user: User | null) => {
          this.isLoggedIn = !!user;
        });
  }

  ngAfterViewInit() {
    this.initThree();
    this.createScene();
    this.animate();
    if (this.pendingScrollToContact) {
      this.pendingScrollToContact = false;
      setTimeout(() => this.scrollToContact(), 700);
    }
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('mousemove', (e) => this.onMouseMove(e));
    window.removeEventListener('resize', () => this.onWindowResize());
    if (this.renderer) this.renderer.dispose();
  }

  @HostListener('window:scroll')
  onWindowScroll() {}

  private onMouseMove(event: MouseEvent) {
    this.mouseX = event.clientX / window.innerWidth;
    this.mouseY = event.clientY / window.innerHeight;
  }

  private onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xFAFAFA);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 20);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xFAFAFA, 1);
  }

  private createScene() {
    for (let i = 0; i < 12; i++) {
      const geometry = new THREE.SphereGeometry(0.2, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: i % 3 === 0 ? this.colors.primary : this.colors.accent,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.15
      });
      
      const sphere = new THREE.Mesh(geometry, material);
      
      const angle = (i / 12) * Math.PI * 2;
      const radius = 4;
      const height = Math.sin(angle * 3) * 1.5;
      
      sphere.position.x = Math.cos(angle) * radius;
      sphere.position.z = Math.sin(angle) * radius;
      sphere.position.y = height;
      
      sphere.userData = {
        angle: angle,
        radius: radius,
        speed: 0.1 + Math.random() * 0.1,
        baseY: height
      };
      
      this.floatingSpheres.push(sphere);
      this.scene.add(sphere);
    }

    const ambientLight = new THREE.AmbientLight(0x404060);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1, 2, 2);
    this.scene.add(dirLight);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;

    this.floatingSpheres.forEach((sphere) => {
      if (sphere.userData) {
        sphere.userData['angle'] = (sphere.userData['angle'] || 0) + 0.002 * (sphere.userData['speed'] || 0.1);
        sphere.position.x = Math.cos(sphere.userData['angle']) * (sphere.userData['radius'] || 4);
        sphere.position.z = Math.sin(sphere.userData['angle']) * (sphere.userData['radius'] || 4);
        sphere.position.y = (sphere.userData['baseY'] || 0) + Math.sin(time * 0.5 + sphere.userData['angle']) * 0.3;
        sphere.rotation.x += 0.005;
        sphere.rotation.y += 0.005;
      }
    });

    this.camera.position.x = Math.sin(this.mouseX * Math.PI) * 5;
    this.camera.position.y = 2 + this.mouseY * 2;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }
  scrollToContact() {
    const el = document.getElementById('contact-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private offerNames: Record<string, string> = {
    '1': 'Webbstart',
    '2': 'Business Premium',
    '3': 'E-handel',
    '4': 'Enterprise'
  };

  submitContact() {
    if (!this.contactForm.name || !this.contactForm.email || !this.contactForm.message) return;
    this.contactSending = true;
    this.contactError = false;
    const payload = {
      name: this.contactForm.name,
      email: this.contactForm.email,
      message: this.contactForm.message,
      offer: this.contactForm.offer ? this.offerNames[this.contactForm.offer] || '' : ''
    };
    this.contactService.send(payload).subscribe({
      next: () => {
        this.contactSending = false;
        this.contactSent = true;
        this.contactForm = { name: '', email: '', message: '', offer: '' };
      },
      error: () => {
        this.contactSending = false;
        this.contactError = true;
      }
    });
  }

  setLanguage(lang: 'sv' | 'en' | 'ar') {
    this.translation.setLanguage(lang);
  }

  t(key: string): string {
    return this.translation.instant(key);
  }

  get currentLanguage(): string {
    return this.translation.currentLanguage;
  }

  // Hjälpmetoder för offers
  getOfferTitle(index: number): string {
    return this.t(`offers.items.${index}.title`);
  }

  getOfferDescription(index: number): string {
    return this.t(`offers.items.${index}.description`);
  }

  getOfferDiscount(index: number): string {
    return this.t(`offers.items.${index}.discount`);
  }

  getOfferValid(index: number): string {
    return this.t(`offers.items.${index}.valid`);
  }

  // Hjälpmetoder för services
  getServiceTitle(index: number): string {
    return this.t(`services.items.${index}.title`);
  }

  getServiceDescription(index: number): string {
    return this.t(`services.items.${index}.description`);
  }

  getServiceFeatures(index: number): string[] {
    const features = this.t(`services.items.${index}.features`);
    return Array.isArray(features) ? features : [];
  }

  // Hjälpmetoder för why
  getReasonIcon(index: number): string {
    return this.t(`why.reasons.${index}.icon`);
  }

  getReasonTitle(index: number): string {
    return this.t(`why.reasons.${index}.title`);
  }

  getReasonDescription(index: number): string {
    return this.t(`why.reasons.${index}.description`);
  }

  // Hjälpmetoder för projects
  getProjectTitle(index: number): string {
    return this.t(`projects.items.${index}.title`);
  }

  getProjectDescription(index: number): string {
    return this.t(`projects.items.${index}.description`);
  }

  getProjectTech(index: number, techIndex: number): string {
    return this.t(`projects.items.${index}.tech.${techIndex}`);
  }

  // Hjälpmetoder för contact
  getContactTitle(): string {
    return this.t('contact.title');
  }

  getContactSubtitle(): string {
    return this.t('contact.subtitle');
  }

  getContactName(): string {
    return this.t('contact.name');
  }

  getContactEmail(): string {
    return this.t('contact.email');
  }

  getContactMessage(): string {
    return this.t('contact.message');
  }

  getContactSubmit(): string {
    return this.t('contact.submit');
  }

  getContactNote(): string {
    return this.t('contact.note');
  }
}