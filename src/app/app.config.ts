import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withRouterConfig, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideLottieOptions } from 'ngx-lottie';
registerLocaleData(localePt, 'pt-BR');

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
        // scrollOffset: [0, 0],
        // scrollRestoration: 'auto',
      }),
      withViewTransitions({ skipInitialTransition: true }),
    ),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    provideLottieOptions({
      player: () => import('lottie-web'),
    }),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    {
      provide: 'GEO_CONFIG',
      useValue: { googleMapsApiKey: 'AIzaSyCMEM_KQEhVXgCL3q0VZ_uTH3IgOBNk-Pw' },
    }, // restrinja por domínio no console do Google
  ],
};
