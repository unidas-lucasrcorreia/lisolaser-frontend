import { ChangeDetectionStrategy, Component, Input, Inject, PLATFORM_ID, inject, signal, computed, OnDestroy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { UnitSelect } from '../unit-select/unit-select';
import { UnidadeItem } from '../../models/unidade.model';
import { LeadStore } from '../../services/lead-store';

export type Hotspot = {
  id: string | number;
  /** porcentagem 0–100 (coordenadas lógicas do SVG) */
  x: number;
  y: number;
  title: string;
  text?: string;
};

export type HotspotImage = {
  src: string;
  width: number;
  height: number;
  alt?: string;
};

type Anchor = 'top' | 'bottom' | 'left' | 'right';

@Component({
  selector: 'app-hotspot-modal',
  standalone: true,
  imports: [CommonModule, RouterModule, UnitSelect],
  templateUrl: './hotspot-modal.html',
  styleUrls: ['./hotspot-modal.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotspotModal implements OnDestroy {
  private router = inject(Router);
  private leadStore = inject(LeadStore);

  @Input({ required: true }) image!: HotspotImage;
  @Input({ required: true }) hotspots: Hotspot[] = [];

  readonly open = signal(false);
  readonly active = signal<Hotspot | null>(null);
  readonly pickedUnit = signal<UnidadeItem | null>(null);
  readonly showUnitError = signal(false);

  /** Decide para onde “abre” o card, evitando bordas visíveis */
  readonly panelAnchor = computed<Anchor>(() => {
    const h = this.active();
    if (!h) return 'top';
    const { x, y } = h;

    // Prioriza fugir do topo/rodapé; se estiver central, decide pelos lados
    if (y < 30) return 'bottom'; // muito perto do topo → abre pra baixo
    if (y > 70) return 'top'; // muito perto do fundo → abre pra cima
    if (x > 70) return 'left'; // muito à direita → abre pra esquerda
    if (x < 30) return 'right'; // muito à esquerda → abre pra direita
    return 'top'; // padrão visual
  });

  /**
   * Posição base + deslocamento conforme âncora.
   * (Seu clamp horizontal por CSS fica no SCSS; aqui só montamos o transform.)
   */
  readonly panelStyle: any = computed(() => {
    const h = this.active();
    if (!h) return {};
    const base = { left: `${h.x}%`, top: `${h.y}%` };
    const anchor = this.panelAnchor();
    const transforms: Record<Anchor, string> = {
      top: 'translate(-50%, calc(-100% - 14px))',
      bottom: 'translate(-50%, 14px)',
      left: 'translate(calc(-100% - 14px), -50%)',
      right: 'translate(14px, -50%)',
    };
    return {
      ...base,
      transform: transforms[anchor],
    } as const;
  });

  /** Classe para pintar arrow/offset correto via CSS */
  readonly panelClass = computed(() => `panel panel--${this.panelAnchor()}`);

  trackById = (_: number, h: Hotspot) => h.id;

  // ========= HOTSPOT SCALE NO MOBILE (≈35px) =========
  private isBrowser = false;
  private mql: MediaQueryList | null = null;
  readonly dotScale = signal(1); // desktop = 1, mobile = 1.4 (25px * 1.4 ≈ 35px)

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.setupDotScale();
    }
  }

  private setupDotScale() {
    // Use o mesmo limite que você considera “mobile”. Ajuste se preferir $bp-md.
    this.mql = window.matchMedia('(max-width: 540px)');
    const apply = () => this.dotScale.set(this.mql!.matches ? 1.8 : 1);
    apply();
    this.mql.addEventListener('change', apply);
  }

  ngOnDestroy(): void {
    // cleanup do listener do matchMedia
    if (this.mql) {
      // alguns browsers antigos usam addListener/removeListener
      // mas nos modernos o addEventListener/removeEventListener já resolve.
      try {
        // @ts-ignore
        this.mql.removeEventListener?.('change', () => {});
      } catch {
        // noop
      }
    }
  }

  /** Composição do transform do pino preservando a posição com scale condicional */
  dotTransform(h: Hotspot): string {
    const x = this.image.width * (h.x / 100);
    const y = this.image.height * (h.y / 100);
    const s = this.dotScale(); // 1 no desktop, 1.4 no mobile
    // Ordem importa: translate primeiro, scale depois mantém o centro no ponto
    // (em SVG, 'translate(x,y) scale(s)' desloca o grupo até o ponto e só então aplica o scale nele)
    return `translate(${x},${y}) scale(${s})`;
  }
  // ====================================================

  openHotspot(h: Hotspot): void {
    this.active.set(h);
    this.pickedUnit.set(null);
    this.showUnitError.set(false);
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
    this.active.set(null);
    this.showUnitError.set(false);
  }

  onUnitSelected(u: UnidadeItem): void {
    this.pickedUnit.set(u);
    this.showUnitError.set(false);
  }

  schedule(): void {
    const unit = this.pickedUnit();
    if (!unit) {
      this.showUnitError.set(true);
      return;
    }
    this.leadStore.setDraft({
      unitId: unit.id,
      franchiseId: unit.data?.externalId ?? null,
    } as any);
    this.router.navigate(['/agendamento']);
  }
}
