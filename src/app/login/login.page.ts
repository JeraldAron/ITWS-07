import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  showLoginForm = false;
  showSignUpForm = false;
  showPassword = false;
  email = 'pjeraldaron10@gmail.com';
  password = 'dayflow';
  signUp = { firstName: '', lastName: '', middleInitial: '', age: '', email: '', password: '' };

  constructor(private router: Router) {}

  openSignIn(): void {
    this.showSignUpForm = false;
    this.showLoginForm = true;
  }

  openSignUp(): void {
    this.showLoginForm = false;
    this.showSignUpForm = true;
  }

  backToWelcome(): void {
    this.showLoginForm = false;
    this.showSignUpForm = false;
    this.showPassword = false;
  }

  signInAsDemo(): void {
    this.email = 'alex.morgan@dayflow.app';
    this.password = 'dayflow';
    this.continueToApp();
  }

  continueToApp(): void {
    void this.router.navigate(['/home']);
  }
}