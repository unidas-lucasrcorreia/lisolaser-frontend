import { Component, inject, signal, computed, OnInit, PLATFORM_ID, DestroyRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, catchError, retry, timeout } from 'rxjs/operators';
import { of } from 'rxjs';
import { BeforeAfterSlider } from '../../core/components/before-after-slider/before-after-slider';
import { TreatmentAreas, Gender } from '../../core/components/treatment-areas/treatment-areas';
import { CmsService } from '../../core/services/cms-service';

@Component({
  selector: 'app-waxing-by-gender',
  standalone: true,
  imports: [CommonModule, RouterModule, TreatmentAreas, BeforeAfterSlider],
  templateUrl: './waxing-by-gender.html',
  styleUrl: './waxing-by-gender.scss',
})
export class WaxingByGender implements OnInit {
  private readonly cms = inject(CmsService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  // Gênero vindo da rota (data resolver)
  readonly genderFromRoute = toSignal<Gender | undefined>(this.route.data.pipe(map((d) => (d['gender'] === 'feminino' || d['gender'] === 'masculino' ? (d['gender'] as Gender) : undefined))), {
    initialValue: undefined,
  });

  // STATE
  private readonly cmsSig = signal<any | null>(null); // conteúdo normalizado
  private readonly faqsSig = signal<any[]>([]);
  private readonly loadingSig = signal<boolean>(true);
  private readonly loadingFaqSig = signal<boolean>(false);
  private readonly errorSig = signal<string>('');

  // Expor signals p/ template
  readonly loading = this.loadingSig;
  readonly loadingFaq = this.loadingFaqSig;
  readonly error = this.errorSig;

  // Helpers de conteúdo (já no shape final)
  readonly head = computed(() => this.cmsSig()?.head?.[0] ?? null);
  readonly aboutArea = computed(() => this.cmsSig()?.aboutArea?.[0] ?? null);
  readonly results = computed(() => this.cmsSig()?.results?.[0] ?? null);
  readonly video = computed(() => this.cmsSig()?.video?.[0] ?? null);
  readonly laser = computed(() => this.cmsSig()?.laser?.[0] ?? null);
  readonly faqSection = computed(() => this.cmsSig()?.faq?.[0] ?? null);
  readonly faqs = this.faqsSig;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Reage a mudanças de gênero → escolhe schema + busca
    this.route.data
      .pipe(
        map((d) => (d['gender'] === 'feminino' || d['gender'] === 'masculino' ? (d['gender'] as Gender) : undefined)),
        switchMap((gender) => {
          if (!gender) {
            this.errorSig.set('Gênero não encontrado na rota.');
            return of(null);
          }
          const schema = gender === 'masculino' ? 'waxing-for-mens-page' : 'waxing-for-womans';

          this.loadingSig.set(true);
          this.errorSig.set('');
          this.faqsSig.set([]);
          this.loadingFaqSig.set(false);

          return this.cms.getCmsData(schema).pipe(
            retry({ count: 1, delay: 400 }),
            timeout(8000),
            catchError((err) => {
              console.error('[WaxingByGender] CMS error', err);
              this.errorSig.set('Não foi possível carregar o conteúdo.');
              return of(null);
            }),
          );
        }),
      )
      .subscribe((data) => {
        // Normaliza: alguns endpoints podem vir com "content", outros já “flat”
        const normalized = data?.content ?? data ?? null;
        this.cmsSig.set(normalized);
        this.loadingSig.set(false);

        // Resolve FAQ por IDs (se houver)
        const ids: string[] = this.faqSection()?.faqList ?? [];
        if (ids?.length) {
          this.loadingFaqSig.set(true);
          this.cms
            .resolveData('faq', ids)
            .pipe(
              retry({ count: 1, delay: 400 }),
              timeout(8000),
              catchError((err) => {
                console.error('[WaxingByGender] FAQ resolve error', err);
                return of([]);
              }),
            )
            .subscribe((resolved) => {
              this.faqsSig.set(resolved ?? []);
              this.loadingFaqSig.set(false);
            });
        }
      });
  }

  imgOf(assetId?: string | null) {
    return this.cms.assetUrl(assetId ?? null);
  }
}
