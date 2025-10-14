import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Skeleton } from '../../core/skeleton/skeleton';
import { CmsService } from '../../core/services/cms-service';
import { PhoneBrPipe } from '../../core/pipes/phone.pipe';
import { GeoService } from '../../core/services/geo.service';

/* =========================
   Helpers fora da classe
   ========================= */
function toNum(v: any): number | null {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

// aceita {lat, lon} ou {lat, lng} e normaliza para número
function coerceOrigin(coord: any): { lat: number; lon: number } | null {
  if (!coord) return null;
  const lat = toNum(coord.lat);
  const lon = toNum(coord.lon ?? coord.lng);
  return lat != null && lon != null ? { lat, lon } : null;
}

function haversineKM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* =========================
   Tipos
   ========================= */
type LocationCardVM = {
  id: string;
  slug: string;
  name: string;
  featuredImage: string;
  fullAddress: string;
  instagram?: string;
  whatsapp?: string;
  externalId?: any;
  _lat?: number | null;
  _lon?: number | null;
};

@Component({
  selector: 'app-locations',
  standalone: true,
  imports: [CommonModule, RouterModule, Skeleton, PhoneBrPipe],
  templateUrl: './locations.html',
  styleUrl: './locations.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Locations implements OnInit {
  public cms = inject(CmsService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private geo = inject(GeoService);

  private static readonly PAGE_SLUG = 'locations-page';

  // --- HEAD (hero) ---
  private headSig = signal<{ title?: string; text?: string; featuredImage?: string[] } | null>(null);
  pageTitle = computed(() => this.headSig()?.title ?? '');
  pageText = computed(() => this.headSig()?.text ?? '');
  headBgVar = computed(() => {
    const id = this.headSig()?.featuredImage?.[0];
    const url = id ? this.cms.assetUrl(id) : '/images/mock-unidades.png';
    return `url('${url}')`;
  });

  loading = signal(true);
  error = signal('');
  unidades = signal<LocationCardVM[]>([]);

  page = signal<number>(1);
  readonly pageSize = 6;
  total = signal<number>(0);
  totalPages = signal<number>(1);

  public cepMode = signal<boolean>(false);
  private cepCoord: { lat: number; lon: number } | null = null;
  private allUnidadesCache: LocationCardVM[] = [];
  private orderedByCep: LocationCardVM[] = [];

  pagesToShow = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    const max = 5;

    if (total <= 0) return [] as number[];

    let start = Math.max(1, current - Math.floor(max / 2));
    let end = Math.min(total, start + max - 1);
    start = Math.max(1, end - max + 1);

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });
  readonly skeletons = Array.from({ length: 3 }, (_, i) => i);

  search = signal<string>('');

  ngOnInit() {
    this.cms
      .getCmsData(Locations.PAGE_SLUG)
      .pipe(
        retry({ count: 2, delay: 400 }),
        timeout(6000),
        catchError((err) => {
          console.error('[Locations] head config error', err);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((cfg) => {
        if (cfg) this.headSig.set(cfg);
        this.cdr.markForCheck();
      });

    this.fetchUnidadesPaged();
  }

  private fetchUnidadesPaged() {
    this.loading.set(true);
    this.error.set('');

    this.cms
      .getUnidadesPaged({
        page: this.page(),
        pageSize: this.pageSize,
        search: this.search() || undefined,
        onlyWithUno: true,
      })
      .pipe(
        retry({ count: 1, delay: 300 }),
        timeout(10000),
        catchError((err) => {
          console.error('[Locations] getUnidadesPaged error', err);
          this.error.set('Não foi possível carregar as unidades.');
          this.loading.set(false);
          this.cdr.markForCheck();
          return of({
            total: 0,
            page: 1,
            pageSize: this.pageSize,
            totalPages: 1,
            items: [],
          } as any);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        const items = (res.items ?? []) as unknown[];
        const mapped: LocationCardVM[] = items.map(this.mapSquidexItemToVM);

        this.unidades.set(mapped);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
        this.page.set(res.page);

        this.loading.set(false);
        this.cdr.markForCheck();
      });
  }

  distanceFromCep(u: LocationCardVM): string {
    if (!this.cepCoord) return '';
    const lat = u._lat,
      lon = u._lon;
    if (lat == null || lon == null) return '';
    const d = haversineKM(this.cepCoord.lat, this.cepCoord.lon, lat, lon);
    return Number.isFinite(d) ? `${d.toFixed(1)} km` : '';
  }

  private async enterCepModeAndLoad(cep: string) {
    this.loading.set(true);
    this.error.set('');
    this.cepMode.set(true);
    this.page.set(1);

    try {
      const raw = await this.geo
        .geocodeCep(cep)
        .pipe(
          timeout(8000),
          catchError(() => of(null)),
        )
        .toPromise();

      const coord = coerceOrigin(raw);
      if (!coord) {
        this.cepMode.set(false);
        this.fetchUnidadesPaged();
        return;
      }
      this.cepCoord = coord;

      const items = await this.cms
        .getUnidades({ onlyWithUno: true })
        .pipe(
          retry({ count: 1, delay: 300 }),
          timeout(15000),
          catchError((err) => {
            console.error('[Locations] getUnidades (all) error', err);
            this.error.set('Não foi possível carregar as unidades.');
            return of([] as any[]);
          }),
        )
        .toPromise();

      const mappedAll = (items ?? []).map(this.mapSquidexItemToVM);
      this.allUnidadesCache = mappedAll;

      this.orderedByCep = this.sortByDistance(mappedAll, coord);

      this.applyFakePagination(this.orderedByCep);

      this.loading.set(false);
      this.cdr.markForCheck();
    } catch (e) {
      console.error('[Locations] CEP mode error', e);
      this.cepMode.set(false);
      this.fetchUnidadesPaged();
    }
  }

  private applyFakePagination(source: LocationCardVM[]) {
    const total = source.length;
    const totalPages = Math.max(1, Math.ceil(total / this.pageSize));
    const page = Math.min(this.page(), totalPages);
    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.unidades.set(source.slice(start, end));
    this.total.set(total);
    this.totalPages.set(totalPages);
    this.page.set(page);
  }

  onSearchInput(e: Event) {
    const value = ((e.target as HTMLInputElement).value ?? '').trim();
    this.search.set(value);

    if (value === '') {
      this.cepMode.set(false);
      this.page.set(1);
      this.fetchUnidadesPaged();
      return;
    }
  }

  async onSubmitSearch(ev: Event) {
    ev.preventDefault();
    const q = this.search().trim();

    const digits = q.replace(/\D+/g, '');
    const isCep = /^\d{8}$/.test(digits);

    if (isCep) {
      await this.enterCepModeAndLoad(digits);
    } else {
      this.cepMode.set(false);
      this.page.set(1);
      this.fetchUnidadesPaged();
    }
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages()) return;
    if (p === this.page()) return;

    this.page.set(p);

    if (this.cepMode()) {
      // apenas fatia o array já ordenado
      this.applyFakePagination(this.orderedByCep);
      this.cdr.markForCheck();
    } else {
      this.fetchUnidadesPaged();
    }
  }

  prevPage() {
    this.goToPage(this.page() - 1);
  }
  nextPage() {
    this.goToPage(this.page() + 1);
  }

  openOnWhatsApp(num: any) {
    num = (num || '').toString().replace(/\D+/g, '');
    return num ? `https://wa.me/${num}` : null;
  }

  openLocation(unidade: any) {
    this.router.navigate([`/unidade/${unidade.externalId}/${unidade.slug}`]);
  }

  private sortByDistance(list: LocationCardVM[], origin: { lat: number; lon: number }) {
    const dist = (it: LocationCardVM) => {
      const d = this.distanceOrInf(origin, it);
      return Number.isFinite(d) ? d : Number.POSITIVE_INFINITY;
    };
    return [...list].sort((a, b) => dist(a) - dist(b));
  }

  private distanceOrInf(origin: { lat: number; lon: number }, item: LocationCardVM): number {
    const lat = item._lat ?? null;
    const lon = item._lon ?? null;
    if (lat == null || lon == null) return Number.POSITIVE_INFINITY;
    return haversineKM(origin.lat, origin.lon, lat, lon);
  }

  private mapSquidexItemToVM = (u: any): LocationCardVM => {
    const a = u?.data?.address ?? {};
    const contacts = u?.data?.contacts ?? {};
    const firstImg = u?.data?.images?.[0] ?? null;

    const main = [a.street, a.number].filter(Boolean).join(', ');
    const bairro = a.district || a.neighborhood || a.neighbourhood || '';
    const cityState = [a.city, a.state].filter(Boolean).join(' • ');

    return {
      id: u.id,
      slug: u?.data?.slug ?? u.id,
      name: u?.data?.name ?? 'Unidade',
      externalId: u?.data?.externalId,
      featuredImage: this.cms.assetUrl(firstImg),
      fullAddress: [main, bairro ? `— ${bairro}` : '', cityState ? `, ${cityState}` : ''].filter(Boolean).join(''),
      instagram: contacts.instagram || undefined,
      whatsapp: contacts.whatsapp || contacts.phone || undefined,
      _lat: toNum(a?.latitude),
      _lon: toNum(a?.longitude),
    };
  };
}
