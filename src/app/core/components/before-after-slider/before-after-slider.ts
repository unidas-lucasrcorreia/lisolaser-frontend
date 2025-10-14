import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, Input, ViewChild, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-before-after',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './before-after-slider.html',
  styleUrl: './before-after-slider.scss',
})
export class BeforeAfterSlider implements AfterViewInit {
  @Input({ required: true }) beforeSrc!: string;
  @Input({ required: true }) afterSrc!: string;
  @Input() beforeAlt = 'Antes';
  @Input() afterAlt = 'Depois';

  /** posição inicial em % (0..100). Padrão: 50 */
  @Input() start = 50;

  /** Estado: 0..1 */
  readonly pos = signal(0.5);
  readonly posPercent = computed(() => Math.round(this.pos() * 100));

  @ViewChild('wrap', { static: true }) wrap!: ElementRef<HTMLElement>;
  private dragging = false;

  ngAfterViewInit() {
    const startClamped = Math.max(0, Math.min(100, this.start));
    this.pos.set(startClamped / 100);
  }

  // Mouse/Touch (Pointer Events)
  onPointerDown(ev: PointerEvent) {
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
    this.dragging = true;
    this.updateByEvent(ev);
  }
  onPointerMove(ev: PointerEvent) {
    if (!this.dragging) return;
    this.updateByEvent(ev);
  }
  onPointerUp() {
    this.dragging = false;
  }

  // Garantir que soltar fora ainda finalize o drag
  @HostListener('document:pointerup') onDocUp() {
    this.dragging = false;
  }
  @HostListener('document:pointercancel') onDocCancel() {
    this.dragging = false;
  }

  // Teclado
  onKey(ev: KeyboardEvent) {
    const step = ev.shiftKey ? 0.1 : 0.05; // Shift = passo maior
    if (ev.key === 'ArrowLeft') {
      this.setPos(this.pos() - step);
      ev.preventDefault();
    }
    if (ev.key === 'ArrowRight') {
      this.setPos(this.pos() + step);
      ev.preventDefault();
    }
  }

  private updateByEvent(ev: PointerEvent) {
    const rect = this.wrap.nativeElement.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const ratio = x / rect.width;
    this.setPos(ratio);
  }

  private setPos(ratio: number) {
    // limita entre 5% e 95% pra nunca “sumir” a camada
    const clamped = Math.max(0.05, Math.min(0.95, ratio));
    this.pos.set(clamped);
  }
}
