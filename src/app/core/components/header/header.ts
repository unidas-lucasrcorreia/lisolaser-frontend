import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private router = inject(Router);
  menuOpen = signal(false);

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }
  closeMenu() {
    if (this.menuOpen()) this.menuOpen.set(false);
  }

  navAndClose(url: string) {
    this.router.navigateByUrl(url);
    this.closeMenu();
  }
}
