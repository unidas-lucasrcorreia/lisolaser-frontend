import { Component, Input, ViewChild, ViewChildren, ElementRef, QueryList, AfterViewInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, inject, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { LeadForm } from '../lead-form/lead-form';
import { RouterModule } from '@angular/router';

type BannerType = 'image-right' | 'image-right-full' | 'video-center' | 'video-lead';

export interface BannerSlideImage {
  id: string | number;
  type: 'image-right' | 'image-right-full';
  title: string;
  text: string;
  ctaLabel?: string;
  href?: string;
  src: string;
  bg: string;
  ink: string;
  imgW?: number;
  imgH?: number;
  alt?: string;
}

export interface BannerSlideVideoCenter {
  id: string | number;
  type: 'video-center';
  title: string;
  text: string;
  ctaLabel?: string;
  href?: string;
  videoSrc: string;
  poster?: string;
  bg?: string;
  ink?: string;
}

export interface BannerSlideVideoLead {
  id: string | number;
  type: 'video-lead';
  title: string;
  text: string;
  ctaLabel?: string;
  href?: string;
  videoSrc: string;
  poster?: string;
  bg?: string;
  ink?: string;
}

export type BannerSlide = BannerSlideImage | BannerSlideVideoCenter | BannerSlideVideoLead;

type CmsBanner = {
  type?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  ctaLabel?: string;
  background?: string[];
};

@Component({
  selector: 'app-banner',
  standalone: true,
  templateUrl: './banner.html',
  styleUrls: ['./banner.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgTemplateOutlet, LeadForm, RouterModule],
})
export class Banner implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  @ViewChild('swiper', { static: true }) swiperEl!: ElementRef<HTMLElement>;
  @ViewChildren('autoVideo') autoVideos!: QueryList<ElementRef<HTMLVideoElement>>;

  @Input() set slides(v: Array<BannerSlide | CmsBanner>) {
    this._rawSlides = v ?? [];
    this.viewSlides = this.normalizeSlides(this._rawSlides);
  }
  get slides(): Array<BannerSlide | CmsBanner> {
    return this._rawSlides;
  }
  private _rawSlides: Array<BannerSlide | CmsBanner> = [];

  @Input() assetBase = 'https://cloud.squidex.io/api/assets/lisolaser/';

  viewSlides: BannerSlide[] = [];

  @Input() loop = true;
  @Input() pagination = true;
  @Input() autoplay = false;

  private rafId: number | null = null;
  private io?: IntersectionObserver;

  private readonly defaultsByVariant: Record<BannerType, { bg: string; ink: string }> = {
    'image-right': { bg: '#FFE4DE', ink: '#171717' },
    'image-right-full': { bg: '#f8f5f3', ink: '#000000' },
    'video-center': { bg: '#000000', ink: '#ffffff' },
    'video-lead': { bg: '#000000', ink: '#ffffff' },
  };

  private readonly typeMap: Record<string, BannerType> = {
    Primário: 'image-right',
    Secundário: 'image-right-full',
    Vídeo: 'video-center',
    'Vídeo + Lead': 'video-lead',
  };

  private isAlreadyComponentSlide(x: BannerSlide | CmsBanner): x is BannerSlide {
    const t = (x as any)?.type;
    if (t === 'image-right' || t === 'image-right-full') return !!(x as any).src;
    if (t === 'video-center' || t === 'video-lead') return !!(x as any).videoSrc;
    return false;
  }

  private resolveAsset(idOrUrl?: string): string {
    if (!idOrUrl) return '';
    return /^https?:\/\//i.test(idOrUrl) ? idOrUrl : `${this.assetBase}${idOrUrl}`;
  }

  private normalizeSlides(input: Array<BannerSlide | CmsBanner>): BannerSlide[] {
    return (input ?? []).map((item, idx) => {
      if (this.isAlreadyComponentSlide(item)) {
        const t = item.type as BannerType;
        const def = this.defaultsByVariant[t];
        return {
          ...item,
          bg: (item as any).bg ?? def.bg,
          ink: (item as any).ink ?? def.ink,
        } as BannerSlide;
      }

      const cms = item as CmsBanner;
      const mappedType: BannerType = this.typeMap[cms.type ?? ''] ?? 'image-right';
      const palette = this.defaultsByVariant[mappedType];
      const media = this.resolveAsset(cms.background?.[0]);

      const title = cms.title ?? '';
      const text = cms.subtitle ?? '';
      const href = cms.cta ?? '';
      const ctaLabel = cms.ctaLabel ?? '';

      if (mappedType === 'video-center' || mappedType === 'video-lead') {
        const slide: BannerSlide = {
          id: `cms-${idx}`,
          type: mappedType,
          title,
          text,
          ctaLabel: ctaLabel || undefined,
          href: href || undefined,
          videoSrc: media,
          poster: undefined,
          bg: palette.bg,
          ink: palette.ink,
        };
        return slide;
      } else {
        const slide: BannerSlide = {
          id: `cms-${idx}`,
          type: mappedType,
          title,
          text,
          ctaLabel: ctaLabel || undefined,
          href: href || undefined,
          src: media,
          bg: palette.bg,
          ink: palette.ink,
          alt: title,
        } as BannerSlideImage;
        return slide;
      }
    });
  }

  getBg(s: BannerSlide): string {
    return (s as any)?.bg || 'transparent';
  }
  getInk(s: BannerSlide): string {
    return (s as any)?.ink || '#fff';
  }

  async ngAfterViewInit() {
    if (!this.isBrowser) return;

    await customElements.whenDefined('swiper-container');
    const el = this.swiperEl?.nativeElement as any;
    if (el) {
      Object.assign(el, {
        slidesPerView: 1,
        spaceBetween: 0,
        loop: this.loop,
        pagination: this.pagination ? { clickable: true } : false,
        autoplay: this.autoplay ? { delay: 5000, pauseOnMouseEnter: true, disableOnInteraction: false } : false,
        a11y: { enabled: true },
      });
      el.initialize?.();
    }

    this.setupVideoIntersection();
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;

    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    try {
      this.io?.disconnect();
    } catch {}
    this.io = undefined;

    try {
      (this.swiperEl?.nativeElement as any)?.destroy?.();
    } catch {}
  }

  private setupVideoIntersection() {
    if (!this.isBrowser) return;

    this.io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) v.play?.().catch(() => {});
          else v.pause?.();
        }
      },
      { root: null, rootMargin: '0px', threshold: 0.25 },
    );

    this.rafId = requestAnimationFrame(() => {
      this.autoVideos?.forEach((ref) => {
        const v = ref.nativeElement;
        v.muted = true;
        v.playsInline = true as any;
        this.io?.observe(v);
      });
    });
  }
}
