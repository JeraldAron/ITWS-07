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
  showPassword = false;
  email = 'pjeraldaron10@gmail.com';
  password = 'dayflow';

  constructor(private router: Router) {}

  openSignIn(): void {
    this.showLoginForm = true;
  }

  signInAsDemo(account: 'alex' | 'jordan'): void {
    this.email = account === 'alex' ? 'alex.morgan@company.com' : 'jordan.lee@company.com';
    this.password = 'dayflow';
    this.continueToApp();
  }

  continueToApp(): void {
    void this.router.navigate(['/home']);
  }
}