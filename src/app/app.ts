import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './core/components/header/header';
import { Footer } from './core/components/footer/footer';
import { Toaster } from './core/components/toaster/toaster';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, Toaster],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('LisoLaser.FrontEnd');
}
