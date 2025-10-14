import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, ViewChild, ElementRef, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface GalleryImage {
  src: string;
  alt?: string;
}

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [],
  templateUrl: './gallery.html',
  styleUrls: ['./gallery.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Gallery implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);

  @ViewChild('mainSwiper', { static: true }) mainSwiperEl!: ElementRef<HTMLElement>;
  @ViewChild('thumbsSwiper', { static: true }) thumbsEl!: ElementRef<HTMLElement>;

  @Input() images: GalleryImage[] = [];

  /** índice ativo */
  activeIndex = 0;

  /** estado dos botões custom (classes no template/SCSS usam isso) */
  canPrev = false;
  canNext = true;

  private get thumbsSwiper(): any {
    return (this.thumbsEl?.nativeElement as any)?.swiper;
  }

  /** Seleciona miniatura e sincroniza o principal */
  select(i: number) {
    this.activeIndex = i;
    const main: any = this.mainSwiperEl?.nativeElement;
    main?.swiper?.slideTo?.(i);
    this.scrollThumbsIntoView(this.activeIndex);
    queueMicrotask(() => {
      this.markActiveThumb();
      this.updateThumbsNavState();
    });
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    await customElements.whenDefined('swiper-container');

    const main: any = this.mainSwiperEl.nativeElement;
    Object.assign(main, {
      slidesPerView: 1,
      spaceBetween: 0,
      loop: false,
      navigation: false,
      pagination: false,
      a11y: { enabled: true },
      keyboard: { enabled: true },
      on: {
        slideChange: () => {
          this.activeIndex = main.swiper?.realIndex ?? 0;
          this.scrollThumbsIntoView(this.activeIndex);
          this.markActiveThumb();
          this.updateThumbsNavState();
        },
      },
    });

    const thumbsHost: any = this.thumbsEl.nativeElement;
    Object.assign(thumbsHost, {
      slidesPerView: 4,
      spaceBetween: 12,
      loop: false,
      navigation: false, // usamos botões custom
      pagination: false,
      a11y: { enabled: true },
      watchSlidesProgress: true,
      breakpoints: {
        1600: { slidesPerView: 4, spaceBetween: 16 },
        1200: { slidesPerView: 4, spaceBetween: 14 },
        992: { slidesPerView: 4, spaceBetween: 12 },
        768: { slidesPerView: 4, spaceBetween: 10 },
        480: { slidesPerView: 3, spaceBetween: 8 },
        1: { slidesPerView: 3, spaceBetween: 8 },
      },
      on: {
        // Garantem atualização de estado em qualquer mudança relevante
        init: () => this.updateThumbsNavState(),
        afterInit: () => this.updateThumbsNavState(),
        resize: () => this.updateThumbsNavState(),
        slideChange: () => this.updateThumbsNavState(),
        fromEdge: () => this.updateThumbsNavState(),
        reachBeginning: () => this.updateThumbsNavState(),
        reachEnd: () => this.updateThumbsNavState(),
        activeIndexChange: () => this.updateThumbsNavState(),
      },
    });

    main.initialize?.();
    thumbsHost.initialize?.();

    // Marca ativo e prepara navegação do principal
    requestAnimationFrame(() => {
      main.swiper?.slideTo?.(this.activeIndex);
      this.markActiveThumb();
    });

    // Garante que isBeginning/isEnd já estejam calculados:
    this.ensureInitialNav();
  }

  /** Força leitura de isBeginning/isEnd após layout do Swiper */
  private ensureInitialNav() {
    const run = () => this.updateThumbsNavState();
    requestAnimationFrame(run);
    setTimeout(run, 0);
    setTimeout(run, 60); // mais um tick pra garantir após breakpoints/update
  }

  /** Atualiza canPrev/canNext com base no Swiper real */
  private updateThumbsNavState() {
    const s = this.thumbsSwiper;
    if (!s) {
      // fallback simples se ainda não exposto
      const perView = 3;
      this.canPrev = false;
      this.canNext = (this.images?.length || 0) > perView;
      return;
    }
    this.canPrev = !s.isBeginning;
    this.canNext = !s.isEnd;
  }

  private scrollThumbsIntoView(i: number) {
    this.thumbsSwiper?.slideTo?.(i);
  }

  private markActiveThumb() {
    const root = this.thumbsEl?.nativeElement;
    if (!root) return;
    const slides = root.querySelectorAll<HTMLElement>('swiper-slide');
    slides.forEach((el, idx) => {
      el.toggleAttribute('aria-current', idx === this.activeIndex);
      el.classList.toggle('is-active', idx === this.activeIndex);
      el.setAttribute('tabindex', idx === this.activeIndex ? '0' : '-1');
    });
  }

  thumbsPrev() {
    if (!this.canPrev) return;
    this.thumbsSwiper?.slidePrev?.();
    this.updateThumbsNavState();
  }

  thumbsNext() {
    if (!this.canNext) return;
    this.thumbsSwiper?.slideNext?.();
    this.updateThumbsNavState();
  }

  get showThumbNav(): boolean {
    return (this.images?.length || 0) > 4;
  }
}
