// src/app/core/forms/field-errors/field-errors.ts
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Subject, Subscription, merge } from 'rxjs';
import { takeUntil, startWith } from 'rxjs/operators';

type MsgFn = (e: any) => string;

@Component({
  selector: 'app-field-errors',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './field-errors.html',
  styleUrl: './field-errors.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldErrors implements OnInit, OnDestroy {
  @Input({ required: true }) control!: AbstractControl<any, any>;
  @Input() label = 'Campo';
  @Input() showWhen: 'touched' | 'dirty' | 'always' = 'touched';
  @Input() messages?: Partial<Record<string, string | MsgFn>>;

  private sub?: Subscription;
  private destroyed$ = new Subject<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.wire();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['control'] && !changes['control'].firstChange) {
      this.unwire();
      this.wire();
    }
  }

  ngOnDestroy(): void {
    this.unwire();
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  private wire() {
    if (!this.control) return;
    // Em zoneless, blur não muda valor nem (às vezes) o status.
    // Mas com a diretiva acima, chamamos updateValueAndValidity(... emitEvent: true)
    // garantindo emissão em statusChanges.
    this.sub = merge(this.control.statusChanges, this.control.valueChanges)
      .pipe(startWith(null))
      .subscribe(() => {
        // Força render imediato (zoneless-friendly)
        this.cdr.detectChanges();
      });
  }

  private unwire() {
    this.sub?.unsubscribe();
    this.sub = undefined;
  }

  get shouldShow(): boolean {
    if (!this.control?.invalid) return false;
    if (this.showWhen === 'always') return true;
    return this.showWhen === 'dirty' ? !!this.control.dirty : !!this.control.touched;
  }

  get firstMessage(): string | null {
    const errs = this.control?.errors;
    if (!errs) return null;
    const keys = Object.keys(errs);
    if (!keys.length) return null;

    keys.sort((a, b) => (a === 'required' ? -1 : b === 'required' ? 1 : 0));
    const key = keys[0];
    const val = (errs as any)[key];

    const custom = this.messages?.[key];
    if (typeof custom === 'string') return custom;
    if (typeof custom === 'function') return custom(val);

    switch (key) {
      case 'required':
        return `${this.label} é obrigatório.`;
      case 'minlength':
        return `${this.label} deve ter ao menos ${val?.requiredLength} caracteres.`;
      case 'maxlength':
        return `${this.label} deve ter no máximo ${val?.requiredLength} caracteres.`;
      case 'email':
        return `${this.label} inválido.`;
      case 'pattern':
        return `${this.label} em formato inválido.`;
      default:
        return typeof val === 'string' ? val : 'Corrija este campo.';
    }
  }
}
