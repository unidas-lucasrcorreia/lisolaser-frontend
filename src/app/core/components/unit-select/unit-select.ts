import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, inject, PLATFORM_ID, HostBinding } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, FormControl, NonNullableFormBuilder } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, map, catchError, takeUntil } from 'rxjs/operators';

import { CmsService } from '../../services/cms-service';
import { GeoService } from '../../services/geo.service';
import { UnidadeItem } from '../../models/unidade.model';

@Component({
  selector: 'app-unit-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './unit-select.html',
  styleUrls: ['./unit-select.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: UnitSelect,
    },
  ],
})
export class UnitSelect implements OnInit, OnDestroy, ControlValueAccessor {
  /* ========= Inputs / Outputs ========= */
  @Input() placeholder = 'Digite cidade, CEP, estado ou nome';
  @Input() onlyWithUno = true;
  @Output() selectedUnit = new EventEmitter<UnidadeItem>();

  // aparência (já tinha)
  @Input() appearance: 'pill' | 'square' = 'pill';
  @Input() size: 'md' | 'sm' = 'md';
  @HostBinding('class.appearance-square') get _isSquare() {
    return this.appearance === 'square';
  }
  @HostBinding('class.size-sm') get _isSm() {
    return this.size === 'sm';
  }

  /* ========= ARIA: IDs únicos para input/listbox ========= */
  static _seq = 0;
  private _uid: number;
  @Input() inputId!: string; // pode sobrescrever pelo template-pai
  @Input() listboxId!: string; // pode sobrescrever pelo template-pai

  /* ========= DI ========= */
  private fb = inject(NonNullableFormBuilder);
  private cms = inject(CmsService);
  private geo = inject(GeoService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  /* ========= Template refs ========= */
  @ViewChild('unitInput') inputRef?: ElementRef<HTMLInputElement>;

  /* ========= State ========= */
  loading = false;
  dropdownOpen = false;

  units: UnidadeItem[] = [];
  filtered: UnidadeItem[] = [];

  /** valor do ControlValueAccessor (id da unidade no Squidex) */
  private value: string | null = null;
  disabled = false;

  /** busca digitada */
  readonly search: FormControl<string> = this.fb.control<string>('');

  // CEP memo
  private lastCep?: string;
  private lastCepCoords: { lat: number; lon: number } | null = null;

  private destroy$ = new Subject<void>();

  /* ========= Combobox: foco ativo para aria-activedescendant ========= */
  activeIndex = -1;
  get activeOptionId(): string | null {
    return this.activeIndex >= 0 ? this.optionId(this.activeIndex) : null;
  }
  optionId(i: number) {
    return `${this.listboxId}-opt-${i}`;
  }

  /* ========= CVA ========= */
  private onChange: (v: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    // IDs default (evitam duplicação em múltiplas instâncias)
    this._uid = UnitSelect._seq++;
    this.inputId = `lf-unit-input-${this._uid}`;
    this.listboxId = `lf-unit-listbox-${this._uid}`;
  }

  writeValue(v: string | null): void {
    this.value = v;
    if (this.units.length && v) {
      const u = this.units.find((x) => x.id === v);
      if (u) this.search.setValue(u.data?.name ?? '', { emitEvent: false });
    }
    this.cdr.markForCheck();
  }
  registerOnChange(fn: (v: string | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    isDisabled ? this.search.disable({ emitEvent: false }) : this.search.enable({ emitEvent: false });
    this.cdr.markForCheck();
  }

  /* ========= Lifecycle ========= */
  ngOnInit(): void {
    this.loadUnits();
    this.bindSearch();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ========= Data ========= */
  private loadUnits(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.cms
      .getUnidades({ onlyWithUno: this.onlyWithUno })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.units = items;
          this.filtered = [...this.units];
          if (this.value) {
            const u = this.units.find((x) => x.id === this.value);
            if (u) this.search.setValue(u.data?.name ?? '', { emitEvent: false });
          }
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.units = [];
          this.filtered = [];
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private bindSearch(): void {
    this.search.valueChanges
      .pipe(
        map((v) => (v ?? '').trim()),
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((q) => {
          if (!q) return of<{ mode: 'all' }>({ mode: 'all' });

          const digits = q.replace(/\D+/g, '');
          const numericOnly = isNumericLike(q);

          if (numericOnly && digits.length > 0 && digits.length < 8) {
            return of<{ mode: 'all' }>({ mode: 'all' });
          }

          if (!numericOnly) {
            const nq = normalize(q);
            return of<{ mode: 'text'; nq: string }>({ mode: 'text', nq });
          }

          const cep = digits.slice(0, 8);
          if (this.lastCep === cep && this.lastCepCoords) {
            return of<{ mode: 'order'; coord: { lat: number; lon: number } | null }>({
              mode: 'order',
              coord: this.lastCepCoords,
            });
          }

          return this.geo.geocodeCep(cep).pipe(
            map((coord) => ({ mode: 'order' as const, coord })),
            catchError(() => of<{ mode: 'order'; coord: null }>({ mode: 'order', coord: null })),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        switch (result.mode) {
          case 'all':
            this.filtered = [...this.units];
            this.lastCep = undefined;
            this.lastCepCoords = null;
            break;

          case 'text':
            this.filtered = this.units.filter((u) => matchesText(u, normalize(this.search.value)));
            break;

          case 'order': {
            const raw = this.search.value ?? '';
            this.lastCep = raw.replace(/\D+/g, '').slice(0, 8);
            this.lastCepCoords = result.coord ?? null;
            this.filtered = result.coord ? sortByDistance(this.units, result.coord) : [...this.units];
            break;
          }
        }
        // reposiciona foco ativo se a lista mudou
        this.activeIndex = this.filtered.length ? 0 : -1;
        this.cdr.markForCheck();
      });
  }

  /* ========= UI ========= */
  onFocus(): void {
    if (this.disabled) return;
    this.dropdownOpen = true;
    if (!this.search.value) this.filtered = [...this.units];
    if (this.filtered.length && this.activeIndex < 0) this.activeIndex = 0;
    this.cdr.markForCheck();
  }

  onBlur(): void {
    queueMicrotask(() => {
      const active = document.activeElement as HTMLElement | null;
      const inside = this.inputRef?.nativeElement.contains(active) || !!document.querySelector('.unit-options:hover');

      if (!inside) {
        this.dropdownOpen = false;
        this.activeIndex = -1;
        this.onTouched();
        this.cdr.markForCheck(); // 🔑 notifica o Angular manualmente
      }
    });
  }

  onKeydown(e: KeyboardEvent): void {
    if (this.disabled) return;

    if (!this.dropdownOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      this.onFocus();
      e.preventDefault();
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        if (this.filtered.length) {
          this.activeIndex = Math.min(this.activeIndex + 1, this.filtered.length - 1);
          e.preventDefault();
        }
        break;
      case 'ArrowUp':
        if (this.filtered.length) {
          this.activeIndex = Math.max(this.activeIndex - 1, 0);
          e.preventDefault();
        }
        break;
      case 'Enter':
        if (this.dropdownOpen && this.activeIndex >= 0) {
          this.choose(this.filtered[this.activeIndex]);
          e.preventDefault();
        }
        break;
      case 'Escape':
        this.dropdownOpen = false;
        this.activeIndex = -1;
        e.preventDefault();
        break;
    }
    this.cdr.markForCheck();
  }

  toggle(): void {
    if (this.disabled) return;
    const open = !this.dropdownOpen;
    this.dropdownOpen = open;
    if (open && !this.search.value) this.filtered = [...this.units];
    if (open && this.filtered.length && this.activeIndex < 0) this.activeIndex = 0;
    this.cdr.markForCheck();
  }

  choose(u: UnidadeItem): void {
    if (this.disabled) return;

    this.value = u.id;
    this.onChange(this.value);
    this.selectedUnit.emit(u);

    this.search.setValue(u.data?.name ?? '', { emitEvent: false });
    this.dropdownOpen = false;
    this.activeIndex = -1;

    if (isPlatformBrowser(this.platformId)) {
      queueMicrotask(() => this.inputRef?.nativeElement.blur());
      setTimeout(() => {
        const el = this.inputRef?.nativeElement;
        if (el && document.activeElement === el) el.blur();
      }, 0);
    }

    this.cdr.markForCheck();
  }

  distanceFromCep(u: UnidadeItem): string {
    if (!this.lastCepCoords) return '';
    const d = distanceOrInf(this.lastCepCoords, u);
    return Number.isFinite(d) ? `${d.toFixed(1)} km` : '';
  }

  trackById = (_: number, u: UnidadeItem) => u.id;
}

/* ===== Helpers (sem mudanças) ===== */
function normalize(s: string | undefined | null): string {
  return (s ?? '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}
function isNumericLike(s: string): boolean {
  return /^[\d\-\s]+$/.test(s);
}
function matchesText(u: UnidadeItem, nq: string): boolean {
  const d = u.data;
  const a = d.address;
  return [d.name, a?.city, a?.state, a?.zipCode, a?.street, a?.number].map(normalize).some((v) => v.includes(nq));
}
function sortByDistance(units: UnidadeItem[], origin: { lat: number; lon: number }): UnidadeItem[] {
  return [...units].sort((a, b) => {
    const da = distanceOrInf(origin, a);
    const db = distanceOrInf(origin, b);
    return da === db ? 0 : da < db ? -1 : 1;
  });
}
function distanceOrInf(origin: { lat: number; lon: number }, u: UnidadeItem): number {
  const lat = u.data.address?.latitude ?? null;
  const lon = u.data.address?.longitude ?? null;
  if (lat == null || lon == null) return Number.POSITIVE_INFINITY;
  return haversineKM(origin.lat, origin.lon, lat, lon);
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
