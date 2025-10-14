import { ChangeDetectionStrategy, Component, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Gallery } from '../../core/components/gallery/gallery';
import { CmsService } from '../../core/services/cms-service';
import { SeoService } from '../../core/services/seo.service';
import { Skeleton } from '../../core/skeleton/skeleton';
import { PhoneBrPipe } from '../../core/pipes/phone.pipe';

type Hours = { week?: string; sat?: string; sun?: string };
type GalleryImage = { src: string; alt: string };

export interface LocationModel {
  id: string;
  slug: string;
  name: string;
  fullAddress: string;
  instagram?: string;
  whatsapp?: string;
  hours: Hours;
  images: GalleryImage[];
}

@Component({
  selector: 'app-location-details',
  standalone: true,
  imports: [Gallery, RouterModule, Skeleton, PhoneBrPipe],
  templateUrl: './location-details.html',
  styleUrls: ['./location-details.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationDetails implements OnInit {
  // DI
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly cms = inject(CmsService);
  private readonly destroyRef = inject(DestroyRef); // 👈 para zoneless

  // state
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  location: LocationModel | null = null;
  gallery: GalleryImage[] = [];
  whatsappLink: string | null = null;

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);

    this.route.paramMap
      .pipe(
        switchMap((pm) => {
          const externalId = pm.get('externalId');
          if (!externalId) throw new Error('Parâmetro "externalId" ausente na rota.');
          return this.cms.getUnidadeByUnoId(externalId);
        }),
        takeUntilDestroyed(this.destroyRef), // 👈 passa o DestroyRef aqui
      )
      .subscribe({
        next: (api: any) => {
          const d = api?.data ?? {};
          const name = d.name ?? 'Unidade';
          const slug = d.slug ?? api?.id ?? '';

          const addr = d.address ?? {};
          const cont = d.contacts ?? {};
          const hours = d.hours ?? {};

          const fullAddress = [[addr.street, addr.number, addr.complement].filter(Boolean).join(', '), addr.district, [addr.city, addr.state].filter(Boolean).join(' - '), addr.zipCode]
            .filter(Boolean)
            .join(' • ');

          const vm: LocationModel = {
            id: api?.id,
            slug,
            name,
            fullAddress,
            instagram: cont.instagram ? String(cont.instagram) : undefined,
            whatsapp: cont.whatsapp ? String(cont.whatsapp) : undefined,
            hours: {
              week: fmtRange(hours.weekdays),
              sat: fmtRange(hours.saturday),
              sun: fmtRange(hours.sundayHoliday),
            },
            images: (Array.isArray(d.images) ? d.images : []).map((imgId: string, i: number) => ({
              src: this.cms.assetUrl(imgId),
              alt: `${name} — foto ${i + 1}`,
            })),
          };

          this.location = vm;
          this.gallery = vm.images?.length ? vm.images : [{ src: '/images/gallery-mock.png', alt: name }];

          if (vm.whatsapp) {
            const num = vm.whatsapp.replace(/\D+/g, '');
            this.whatsappLink = num ? `https://wa.me/${num}` : null;
          } else {
            this.whatsappLink = null;
          }

          // SEO
          this.seo.push(`${vm.name} • Lisô Laser`, {
            description: `Unidade ${vm.name}. Endereço: ${vm.fullAddress}.`,
          });

          this.loading.set(false);
        },
        error: (err) => {
          console.error('[LocationDetails] erro ao carregar unidade por UNO Id:', err);
          this.error.set('Não foi possível carregar a unidade.');
          this.loading.set(false);
        },
      });
  }

  ngOnDestroy(): void {
    this.seo.pop();
  }
}

/* ===== Helpers ===== */
function fmtRange(range: any): string {
  if (!range) return '';
  if (range.closed) return 'Fechada';
  const open = (range.open ?? '').toString().slice(0, 5);
  const close = (range.close ?? '').toString().slice(0, 5);
  if (!open && !close) return '';
  return `${open}–${close}`;
}
