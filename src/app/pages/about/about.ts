import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CmsService } from '../../core/services/cms-service';
interface FeaturedBlock {
  title: string;
  text: string;
}
interface JourneyBlock {
  preTitle?: string;
  title?: string;
  text?: string;
  image?: string[];
}
interface LocationsBlock {
  title?: string;
  text?: string;
  image?: string[];
}
interface RightBoxItem {
  preTitle?: string;
  title?: string;
  text?: string;
  image?: string[];
}
interface LeftBoxItem {
  preTitle?: string;
  title?: string;
  text?: string;
}
interface QuoteItem {
  text?: string;
  name?: string;
  image?: string[];
}

interface AboutCMS {
  featuredBlock?: FeaturedBlock[];
  missionTitle?: string;
  missionText?: string;
  valuesTitle?: string;
  valuesText?: string;
  safetyTitle?: string;
  safetyTexto?: string;
  ethicsTitle?: string;
  ethicsText?: string;
  journey?: JourneyBlock[];
  locations?: LocationsBlock[];
  boxLeftTitle?: string;
  leftBox?: LeftBoxItem[];
  rightBox?: RightBoxItem[];
  servicesText?: string;
  quoteArea?: QuoteItem[];
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About implements OnInit {
  private cms = inject(CmsService);

  aboutSig = signal<AboutCMS | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.cms.getCmsData('about-page').subscribe({
      next: (data) => {
        this.aboutSig.set(data ?? null);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Falha ao carregar.');
        this.loading.set(false);
      },
    });
  }

  // expose para template
  about() {
    return this.aboutSig();
  }

  // helpers TIPADOS (sem genéricos no template!)
  featured(): FeaturedBlock | null {
    return this.aboutSig()?.featuredBlock?.[0] ?? null;
  }
  journey(): JourneyBlock | null {
    return this.aboutSig()?.journey?.[0] ?? null;
  }
  locBlock(): LocationsBlock | null {
    return this.aboutSig()?.locations?.[0] ?? null;
  }
  quote(): QuoteItem | null {
    return this.aboutSig()?.quoteArea?.[0] ?? null;
  }

  imgOf(id?: string | null): string {
    return this.cms.assetUrl(id || undefined);
  }
}
