import { Directive, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appTouchOnBlur]',
  standalone: true,
})
export class TouchOnBlurDirective {
  private ngc = inject(NgControl, { optional: true });

  @HostListener('blur')
  onBlur() {
    const c = this.ngc?.control;
    if (!c) return;

    // Marca como tocado e força revalidação EMITINDO eventos
    c.markAsTouched();
    // importante para zoneless: emite em statusChanges e aciona os subscribers
    c.updateValueAndValidity({ onlySelf: true, emitEvent: true });
  }
}
