import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-morphing-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './morphing-auth.html',
  styleUrls: ['./morphing-auth.css']
})
export class MorphingAuthComponent implements OnInit, OnDestroy {
  @ViewChild('particleCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('glowCanvas') glowCanvasRef!: ElementRef<HTMLCanvasElement>;
  
  mode: AuthMode = 'login';
  isMorphing = false;
  morphProgress = 0;
  
  // Form data
  email = '';
  password = '';
  confirmPassword = '';
  name = '';
  
  // Validation
  errors: string[] = [];
  isLoading = false;
  
  // 3D Tilt effect
  tiltX = 0;
  tiltY = 0;
  
  // Mouse position for glow effects
  mouseX = 0;
  mouseY = 0;
  
  // Particles
  private ctx!: CanvasRenderingContext2D;
  private glowCtx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private glowParticles: GlowParticle[] = [];
  private animationFrame!: number;
  private resizeObserver!: ResizeObserver;
  
  // Time for animations
  private time = 0;

  // Morph values for SVG animation
  morphValues = {
    login: 'M0,100 Q50,0 100,100 T200,100 T300,100 T400,100 L400,200 L0,200 Z',
    register: 'M0,100 Q50,200 100,100 T200,100 T300,100 T400,100 L400,200 L0,200 Z'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.initParticles();
    this.initGlowParticles();
    
    this.route.params.subscribe(params => {
      const mode = params['mode'];
      if (mode === 'register') {
        this.mode = 'register';
      } else {
        this.mode = 'login';
      }
    });
  }

  ngAfterViewInit() {
    if (this.canvasRef) {
      this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
      this.glowCtx = this.glowCanvasRef.nativeElement.getContext('2d')!;
      this.animateParticles();
      
      this.resizeObserver = new ResizeObserver(() => {
        this.canvasRef.nativeElement.width = window.innerWidth;
        this.canvasRef.nativeElement.height = window.innerHeight;
        this.glowCanvasRef.nativeElement.width = window.innerWidth;
        this.glowCanvasRef.nativeElement.height = window.innerHeight;
      });
      this.resizeObserver.observe(this.canvasRef.nativeElement);
    }
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationFrame);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private initParticles() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 1.2,
        speedY: (Math.random() - 0.5) * 1.2,
        color: `rgba(102, 126, 234, ${Math.random() * 0.3 + 0.2})`
      });
    }
  }

  private initGlowParticles() {
    for (let i = 0; i < 15; i++) {
      this.glowParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 50 + 30,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.15 + 0.05,
        color: i % 2 === 0 ? '#667eea' : '#764ba2'
      });
    }
  }

  private animateParticles() {
    if (!this.ctx || !this.glowCtx) return;
    
    this.time += 0.01;
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Rensa canvases
    this.ctx.clearRect(0, 0, width, height);
    this.glowCtx.clearRect(0, 0, width, height);
    
    // Rita glow particles (stora, långsamma)
    this.glowParticles.forEach(p => {
      p.x += p.speedX + Math.sin(this.time) * 0.1;
      p.y += p.speedY + Math.cos(this.time) * 0.1;
      
      if (p.x < -100) p.x = width + 100;
      if (p.x > width + 100) p.x = -100;
      if (p.y < -100) p.y = height + 100;
      if (p.y > height + 100) p.y = -100;
      
      const gradient = this.glowCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      gradient.addColorStop(0, p.color + '40');
      gradient.addColorStop(0.5, p.color + '10');
      gradient.addColorStop(1, 'transparent');
      
      this.glowCtx.beginPath();
      this.glowCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.glowCtx.fillStyle = gradient;
      this.glowCtx.fill();
    });
    
    // Rita vanliga partiklar
    this.particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.fill();
      
      // Rita kopplingar mellan nära partiklar
      this.particles.forEach(p2 => {
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(102, 126, 234, ${0.1 * (1 - distance / 100)})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      });
    });
    
    this.animationFrame = requestAnimationFrame(() => this.animateParticles());
  }

  switchMode(newMode: AuthMode) {
    if (this.mode === newMode || this.isMorphing) return;
    
    this.isMorphing = true;
    this.morphProgress = 0;
    this.errors = [];
    
    const startTime = Date.now();
    const duration = 400;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      this.morphProgress = Math.min(elapsed / duration, 1);
      
      if (elapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        this.isMorphing = false;
        this.mode = newMode;
        this.morphProgress = 0;
      }
    };
    
    requestAnimationFrame(animate);
  }

  onMouseMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    this.tiltX = ((y / rect.height) - 0.5) * 10;
    this.tiltY = ((x / rect.width) - 0.5) * 10;
    
    // Spara musposition för gloweffekter
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  }

  resetTilt() {
    this.tiltX = 0;
    this.tiltY = 0;
  }

  getCardStyle() {
    // 20% mindre blur än tidigare, med mjukare övergång
    const blurAmount = this.isMorphing ? Math.abs(this.morphProgress - 0.5) * 4 : 2;
    const scale = 1 - this.morphProgress * 0.02;
    const opacity = 1 - Math.abs(this.morphProgress - 0.5) * 0.3;
    
    return {
      transform: `perspective(1000px) rotateX(${this.tiltX}deg) rotateY(${this.tiltY}deg) scale(${scale})`,
      opacity: opacity,
      filter: `blur(${blurAmount}px)`,
      boxShadow: `
        0 30px 60px -15px rgba(102, 126, 234, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.1),
        0 0 30px ${this.mode === 'login' ? '#667eea30' : '#764ba230'}
      `
    };
  }

  getCurrentMorphPath(): string {
    return this.mode === 'login' ? this.morphValues.login : this.morphValues.register;
  }

  getTargetMorphPath(): string {
    return this.mode === 'login' ? this.morphValues.register : this.morphValues.login;
  }

  getMorphPath(): string {
    if (!this.isMorphing) {
      return this.getCurrentMorphPath();
    }
    return this.getTargetMorphPath();
  }

  onSubmit() {
    this.errors = [];
    this.isLoading = true;
    
    if (this.mode === 'login') {
      this.handleLogin();
    } else {
      this.handleRegister();
    }
  }

  private handleLogin() {
    const { email, password } = this;
    
    if (!email || !password) {
      this.errors.push('Fyll i alla fält');
      this.isLoading = false;
      return;
    }
    if (!this.isValidEmail(email)) {
      this.errors.push('Ogiltig e-postadress');
      this.isLoading = false;
      return;
    }

    this.authService.login(email, password).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.isLoading = false;
        if (error.status === 401) {
          this.errors.push('Felaktig e-post eller lösenord');
        } else {
          this.errors.push('Ett fel uppstod vid inloggning');
        }
      }
    });
  }

  private handleRegister() {
    const { name, email, password, confirmPassword } = this;
    
    if (!name || !email || !password || !confirmPassword) {
      this.errors.push('Fyll i alla fält');
      this.isLoading = false;
      return;
    }
    if (!this.isValidEmail(email)) {
      this.errors.push('Ogiltig e-postadress');
      this.isLoading = false;
      return;
    }
    if (password.length < 8) {
      this.errors.push('Lösenordet måste vara minst 8 tecken');
      this.isLoading = false;
      return;
    }
    if (password !== confirmPassword) {
      this.errors.push('Lösenorden matchar inte');
      this.isLoading = false;
      return;
    }

    // Simulera API-anrop
    setTimeout(() => {
      this.isLoading = false;
      this.errors = [];
      this.switchMode('login');
    }, 1500);
  }

  private isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  getButtonText(): string {
    if (this.isLoading) {
      return this.mode === 'login' ? 'Loggar in...' : 'Skapar konto...';
    }
    return this.mode === 'login' ? 'Logga in' : 'Skapa konto';
  }
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
}

interface GlowParticle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
}