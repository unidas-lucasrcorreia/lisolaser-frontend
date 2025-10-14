// home.component.ts (trechos principais)
import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, PLATFORM_ID, ChangeDetectionStrategy, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError, retry, switchMap, timeout } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Skeleton } from '../../core/skeleton/skeleton';
import { HomeSkeleton } from '../../core/components/home-skeleton/home-skeleton';
import { TreatmentAreas } from '../../core/components/treatment-areas/treatment-areas';
import { Banner } from '../../core/components/banner/banner';
import { Caroussel } from '../../core/components/caroussel/caroussel';
import { CmsService } from '../../core/services/cms-service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Banner, Caroussel, CommonModule, TreatmentAreas, RouterModule, Skeleton, HomeSkeleton],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private cmsService = inject(CmsService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  // ---- STATE (signals) ----
  private readonly cmsSig = signal<any | null>(null);
  private readonly faqsSig = signal<any[]>([]);
  private readonly loadingFaqSig = signal<boolean>(true);

  // Expor signals/computeds para o template
  readonly cms = this.cmsSig; // use cms() no template
  readonly faqs = this.faqsSig; // use faqs()
  readonly loadingFaq = this.loadingFaqSig; // use loadingFaq()

  // Computeds derivados do CMS
  readonly hero = computed(() => this.cmsSig()?.banners?.[0]);
  readonly offersSection = computed(() => this.cmsSig()?.offersSections?.[0]);
  readonly offersList = computed(() => this.offersSection()?.offerList ?? []);
  readonly firstFeatured = computed(() => this.cmsSig()?.firstFeaturedContent?.[0]);
  readonly testimonialsSection = computed(() => this.cmsSig()?.testimonials?.[0]);
  readonly testimonialsList = computed(() => this.testimonialsSection()?.testimonialList ?? []);
  readonly videoTestimonialsSection = computed(() => this.cmsSig()?.videoTestimonials?.[0]);
  readonly videoTestimonialsList = computed(() => this.videoTestimonialsSection()?.testimonials ?? []);
  readonly secondFeatured = computed(() => this.cmsSig()?.secondFeaturedContent?.[0]);
  readonly videoSection = computed(() => this.cmsSig()?.video?.[0]);
  readonly differentialSection = computed(() => this.cmsSig()?.differential?.[0]);
  readonly differentialList = computed(() => this.differentialSection()?.differentialList ?? []);
  readonly faqSection = computed(() => this.cmsSig()?.faq?.[0]);
  readonly faqListIds = computed<string[]>(() => this.faqSection()?.faqList ?? []);

  // Breakpoints (inalterados)
  readonly offersBreakpoints = {
    1600: { slidesPerView: 3, spaceBetween: 177 },
    1200: { slidesPerView: 3, spaceBetween: 18 },
    767: { slidesPerView: 2, spaceBetween: 18 },
    1: { slidesPerView: 1, spaceBetween: 18 },
  };
  readonly testimonialsBP = {
    1600: { slidesPerView: 3.6 },
    1200: { slidesPerView: 3 },
    767: { slidesPerView: 2 },
    1: { slidesPerView: 1 },
  };

  readonly videoTestimonialsBP = {
    1600: { slidesPerView: 3 },
    1200: { slidesPerView: 3 },
    767: { slidesPerView: 2, pagination: true },
    1: { slidesPerView: 1 },
  };
  currentVideo: any;
  showVideo: boolean = false;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.cmsService
      .getCmsData('home-page')
      .pipe(
        retry({ count: 2, delay: 500 }),
        timeout(8000),
        catchError((err) => {
          console.error('Erro ao carregar CMS home:', err);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data: any) => {
        this.cmsSig.set(data);

        const ids = this.faqListIds(); // <<< lê o computed (reactivo)
        if (!ids?.length) {
          this.loadingFaqSig.set(false);
          return;
        }

        this.cmsService
          .resolveData('faq', ids)
          .pipe(
            retry({ count: 2, delay: 500 }),
            timeout(8000),
            catchError((err) => {
              console.error('Erro ao resolver FAQs:', err);
              return of([]);
            }),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe((resolved: any[]) => {
            this.faqsSig.set(resolved ?? []);
            this.loadingFaqSig.set(false);
          });
      });
  }

  imgOf(id?: string): string {
    return id ? `https://cloud.squidex.io/api/assets/lisolaser/${id}` : '/images/fallback.png';
  }

  handlePlayer(video: any) {
    this.currentVideo = video;
    this.showVideo = true;
  }

  closeVideo() {
    this.showVideo = false;
    this.currentVideo = null;
  }
}
