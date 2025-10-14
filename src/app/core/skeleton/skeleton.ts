import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type Variant = 'rect' | 'square' | 'circle' | 'text';
type Animation = 'shimmer' | 'pulse' | 'none';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton.html',
  styleUrls: ['./skeleton.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-inline]': 'inline()',
    '[attr.aria-hidden]': 'a11yHidden() ? "true" : null',
    '[attr.role]': 'a11yHidden() ? null : "status"',
    '[attr.aria-busy]': 'a11yHidden() ? null : "true"',
    // CSS vars expostas (fallbacks no SCSS)
    '[style.--sk-width]': 'cssSize(width())',
    '[style.--sk-height]': 'cssSize(height())',
    '[style.--sk-radius]': 'cssSize(radius())',
    '[style.--sk-gap]': 'cssSize(gap())',
    '[style.--sk-line-height]': 'cssSize(lineHeight())',
    '[style.--sk-last-width]': 'cssSize(lastLineWidth())',
    '[style.--sk-aspect]': 'aspectRatio() ?? null',
  },
})
export class Skeleton {
  // Forma
  readonly variant = input<Variant>('rect');

  // Tamanho (aceita número em px ou string css: "120px", "40%", "10rem")
  readonly width = input<string | number | null>(null);
  readonly height = input<string | number | null>(null);

  // Retângulos/quadrados: se quiser razão fixa sem setar height
  // ex: "16/9", "1/1", "4/3"
  readonly aspectRatio = input<string | null>(null);

  // Bordas e linhas
  readonly radius = input<string | number>('8px');
  readonly lines = input<number>(3); // para variant="text"
  readonly lineHeight = input<string | number>('14px');
  readonly gap = input<string | number>('10px');
  readonly lastLineWidth = input<string | number>('60%');

  // Animação
  readonly animation = input<Animation>('shimmer'); // shimmer | pulse | none

  // Layout
  readonly inline = input<boolean>(false); // inline-block vs block

  // Acessibilidade: por padrão skeleton é puramente visual (aria-hidden).
  // Se quiser que leitores de tela anunciem "carregando…", defina false.
  readonly a11yHidden = input<boolean>(true);

  // Círculo & quadrado helpers
  readonly isCircle = computed(() => this.variant() === 'circle');
  readonly isSquare = computed(() => this.variant() === 'square');

  // Gera um array para o *ngFor do text
  textRows(): number[] {
    const n = Math.max(1, this.lines() || 1);
    return Array.from({ length: n }, (_, i) => i);
  }

  cssSize(v: string | number | null | undefined): string | null {
    if (v == null) return null;
    return typeof v === 'number' ? `${v}px` : v;
  }
}
