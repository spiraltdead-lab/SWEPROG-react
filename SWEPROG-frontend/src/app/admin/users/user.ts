import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth';
import { AdminService, AdminUser, CreateUserPayload } from '../../services/admin.service';

type EditableRole = 'guest' | 'user' | 'admin' | 'super_admin';

interface UserForm {
  name: string;
  email: string;
  role: EditableRole;
  password: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user.html',
  styleUrls: ['./user.css']
})
export class UsersComponent implements OnInit {
  users: AdminUser[] = [];
  filteredUsers: AdminUser[] = [];

  searchTerm    = '';
  selectedRole   = 'all';
  selectedStatus = 'all';

  loading      = true;
  errorMessage = '';
  successMessage = '';

  showUserModal = false;
  editingUser: AdminUser | null = null;
  modalError = '';
  saving     = false;

  // Admin set-password modal
  showPwModal  = false;
  pwTargetUser: AdminUser | null = null;
  adminPwNew   = '';
  adminPwConfirm = '';
  adminPwError = '';
  adminPwSaving = false;
  adminPwSuccess = false;

  userForm: UserForm = {
    name: '', email: '', role: 'guest', password: '', confirmPassword: ''
  };

  readonly statuses = [
    { value: 'active',    label: 'active'    },
    { value: 'inactive',  label: 'inactive'  },
    { value: 'suspended', label: 'suspended' }
  ];

  assignableRoles: { value: EditableRole; labelKey: string }[] = [];

  constructor(
    public  translation: TranslationService,
    private authService: AuthService,
    private adminService: AdminService
  ) {}

  // ── PBAC helpers used in template ─────────────────────────────────────────

  get currentUser() {
    return this.authService.currentUser;
  }

  get canManageSuperAdmins(): boolean {
    return this.authService.hasPermission('manage_super_admins');
  }

  get canAssignAdminRole(): boolean {
    return this.authService.hasPermission('assign_admin_role');
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const base: { value: EditableRole; labelKey: string }[] = [
      { value: 'guest', labelKey: 'admin.users.roles.guest' },
      { value: 'user',  labelKey: 'admin.users.roles.user'  }
    ];
    if (this.authService.hasPermission('assign_admin_role')) {
      base.push({ value: 'admin',       labelKey: 'admin.users.roles.admin'       });
      base.push({ value: 'super_admin', labelKey: 'admin.users.roles.super_admin' });
    }
    this.assignableRoles = base;

    this.loadUsers();
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  loadUsers(): void {
    this.loading      = true;
    this.errorMessage = '';

    this.adminService.getUsers().subscribe({
      next: users => {
        this.users = users;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Kunde inte hämta användare från servern';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const search = this.searchTerm.toLowerCase().trim();

    this.filteredUsers = this.users.filter(user => {
      // RBAC: super_admin users only visible to super_admin (defensive — API already filters)
      if (user.role === 'super_admin' && !this.authService.hasPermission('view_super_admins')) {
        return false;
      }

      const matchesSearch =
        !search ||
        user.name?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search);

      const matchesRole   = this.selectedRole   === 'all' || user.role   === this.selectedRole;
      const matchesStatus = this.selectedStatus === 'all' || user.status === this.selectedStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  openCreateUser(): void {
    this.editingUser = null;
    this.userForm    = { name: '', email: '', role: 'guest', password: '', confirmPassword: '' };
    this.modalError  = '';
    this.showUserModal = true;
  }

  openEditUser(user: AdminUser): void {
    this.editingUser = user;
    this.userForm    = {
      name: user.name, email: user.email,
      role: user.role as EditableRole,
      password: '', confirmPassword: ''
    };
    this.modalError    = '';
    this.showUserModal = true;
  }

  closeModal(): void {
    this.showUserModal = false;
    this.editingUser   = null;
    this.modalError    = '';
    this.saving        = false;
  }

  saveUser(): void {
    this.modalError = '';

    if (!this.userForm.name.trim()) { this.modalError = 'Namn är obligatoriskt.'; return; }
    if (!this.userForm.email.trim()) { this.modalError = 'E-post är obligatorisk.'; return; }

    if (!this.editingUser) {
      if (!this.userForm.password) { this.modalError = 'Lösenord är obligatoriskt för nya användare.'; return; }
      if (this.userForm.password.length < 8) { this.modalError = 'Lösenordet måste vara minst 8 tecken.'; return; }
      if (this.userForm.password !== this.userForm.confirmPassword) { this.modalError = 'Lösenorden matchar inte.'; return; }
    }

    this.saving = true;

    if (this.editingUser) {
      this.adminService.updateUser(this.editingUser.id, {
        name: this.userForm.name,
        email: this.userForm.email,
        role: this.userForm.role
      }).subscribe({
        next: () => { this.loadUsers(); this.closeModal(); },
        error: err => { this.saving = false; this.modalError = err.error?.message || 'Kunde inte uppdatera användaren.'; }
      });
    } else {
      const payload: CreateUserPayload = {
        name: this.userForm.name,
        email: this.userForm.email,
        role: this.userForm.role,
        password: this.userForm.password
      };
      this.adminService.createUser(payload).subscribe({
        next: () => { this.loadUsers(); this.closeModal(); },
        error: err => { this.saving = false; this.modalError = err.error?.message || 'Kunde inte skapa användaren.'; }
      });
    }
  }

  deleteUser(user: AdminUser): void {
    if (!confirm(`Ta bort ${user.name}? Detta går inte att ångra.`)) return;

    this.adminService.deleteUser(user.id).subscribe({
      next: () => this.loadUsers(),
      error: err => { this.errorMessage = err.error?.message || 'Kunde inte ta bort användare.'; }
    });
  }

  toggleUserStatus(user: AdminUser): void {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    this.adminService.setUserStatus(user.id, newStatus).subscribe({
      next: () => this.loadUsers(),
      error: err => { this.errorMessage = err.error?.message || 'Kunde inte ändra status.'; }
    });
  }

  resetPassword(user: AdminUser): void {
    if (!confirm(`Återställ lösenord för ${user.name}?`)) return;

    this.adminService.resetPassword(user.id).subscribe({
      next: () => this.showSuccess(`Lösenordsåterställning skickad till ${user.email}`),
      error: err => { this.errorMessage = err.error?.message || 'Kunde inte återställa lösenord.'; }
    });
  }

  // ── Admin set-password modal ──────────────────────────────────────────────

  openSetPassword(user: AdminUser): void {
    this.pwTargetUser   = user;
    this.adminPwNew     = '';
    this.adminPwConfirm = '';
    this.adminPwError   = '';
    this.adminPwSuccess = false;
    this.showPwModal    = true;
  }

  closeSetPasswordModal(): void {
    this.showPwModal  = false;
    this.pwTargetUser = null;
  }

  saveAdminPassword(): void {
    this.adminPwError   = '';
    this.adminPwSuccess = false;

    if (this.adminPwNew.length < 8) {
      this.adminPwError = this.t('auth.errors.passwordLength') || 'Minst 8 tecken';
      return;
    }
    if (this.adminPwNew !== this.adminPwConfirm) {
      this.adminPwError = this.t('auth.errors.passwordMismatch') || 'Lösenorden matchar inte';
      return;
    }

    this.adminPwSaving = true;

    this.adminService.setUserPassword(this.pwTargetUser!.id, this.adminPwNew).subscribe({
      next: () => {
        this.adminPwSaving = false;
        this.adminPwSuccess = true;
        this.adminPwNew = '';
        this.adminPwConfirm = '';
        setTimeout(() => { this.closeSetPasswordModal(); }, 1800);
      },
      error: (err: any) => {
        this.adminPwSaving = false;
        this.adminPwError = err.error?.message || 'Kunde inte uppdatera lösenordet';
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getStatusText(status: string): string {
    switch (status) {
      case 'active':    return this.t('admin.users.statuses.active');
      case 'inactive':  return this.t('admin.users.statuses.inactive');
      case 'suspended': return this.t('admin.users.statuses.suspended');
      default:          return status;
    }
  }

  t(key: string): string {
    return this.translation.instant(key);
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => { this.successMessage = ''; }, 4000);
  }
}
