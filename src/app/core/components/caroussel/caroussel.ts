import { Component, Input, ViewChild, ElementRef, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface CarouselSlide {
  src: string;
  alt?: string;
  href?: string;
}

export type CarouselBreakpoints = {
  [width: number]: {
    slidesPerView?: number;
    spaceBetween?: number;
    centeredSlides?: boolean;
    peek?: number;
  };
};

@Component({
  selector: 'app-caroussel',
  templateUrl: './caroussel.html',
  styleUrl: './caroussel.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Caroussel implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);

  @ViewChild('swiper', { static: true }) swiperEl!: ElementRef<HTMLElement>;

  @Input() slides: CarouselSlide[] = [];
  @Input() perView = 3;
  @Input() spaceBetween = 24;
  @Input() loop = true;
  @Input() navigation = true;
  @Input() pagination = false;
  @Input() autoplay = false;
  @Input() centeredSlides = true;
  @Input() initialSlide = 0;
  @Input() peek = 0;
  @Input() contentMode = false;

  /** Novo input: configurações responsivas */
  @Input() breakpoints: CarouselBreakpoints = {};

  async ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    await customElements.whenDefined('swiper-container');
    await new Promise((r) => requestAnimationFrame(r));

    const el = this.swiperEl.nativeElement as any;
    Object.assign(el, {
      slidesPerView: this.perView,
      centeredSlides: this.centeredSlides,
      initialSlide: this.initialSlide,
      spaceBetween: this.spaceBetween,
      navigation: this.navigation,
      pagination: this.pagination ? { clickable: true } : false,
      autoplay: this.autoplay ? { delay: 4000, pauseOnMouseEnter: true, disableOnInteraction: false } : false,
      a11y: { enabled: true },
      loop: this.loop,
      // observer: true,
      // observeParents: true,
      // observeSlideChildren: true,
      breakpoints: this.breakpoints, // <-- repassa direto pro Swiper

      preloadImages: false, // não pré-carrega
      watchSlidesProgress: true, // sabe o que está visível
      lazy: {
        enabled: true,
        loadOnTransitionStart: false, // carrega após começar a transição (mais suave)
        checkInView: true, // só carrega se o Swiper estiver no viewport da janela
      },
      lazyPreloadPrevNext: 1, // quantos vizinhos pré-carregar (1 é ótimo)
      loopAdditionalSlides: 1, // quando loop = true (evita clones em excesso)

      // Evite observar tudo se não precisar (cada *Observer pesa)
      observer: false,
      observeParents: false,
      observeSlideChildren: false,
    });

    el.initialize?.();
    queueMicrotask(() => el.swiper?.update?.());
  }
}
