import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Adjusted path

@Component({
  
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }
    this.errorMessage = null;
    this.successMessage = null;
    try {
      await this.authService.login(this.loginForm.value.email, this.loginForm.value.password);
      this.router.navigate(['/']); // Navigate to home or dashboard after login
    } catch (error: any) {
      this.errorMessage = error.message;
      console.error('Login failed:', error);
    }
  }

  async onRegister(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }
    this.errorMessage = null;
    this.successMessage = null;
    try {
      await this.authService.register(this.loginForm.value.email, this.loginForm.value.password);
      this.successMessage = 'Account created successfully. You are now logged in.';
      this.router.navigate(['/']);
    } catch (error: any) {
      this.errorMessage = error.message;
      console.error('Register failed:', error);
    }
  }
}

