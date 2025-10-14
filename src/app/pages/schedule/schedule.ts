import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { FieldErrors } from '../../core/components/field-errors/field-errors';
import { TouchOnBlurDirective } from '../../core/directives/touch-on-blur.directive';
import { UnidadeItem } from '../../core/models/unidade.model';
import { CmsService } from '../../core/services/cms-service';
import { GeoService } from '../../core/services/geo.service';
import { LeadStore } from '../../core/services/lead-store';
import { ToastService } from '../../core/services/toast.service';
import { Skeleton } from '../../core/skeleton/skeleton';
import { UnoService } from '../../core/services/uno-service';

type Step = 1 | 2 | 3;

interface SchedulePayload {
  name: string;
  cellPhone: string;
  date: string;
  hour: string;
  dealActivityId: number;
  roomId: number | null;
}

type DayCell = {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  selected: boolean;
  hasAvailability: boolean;
  isPast: boolean;
  isAfterMax: boolean;
};

type TimeSlot = { hour: string; roomId: number };

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LottieComponent, NgxMaskDirective, Skeleton, FieldErrors, TouchOnBlurDirective],
  providers: [provideNgxMask()],
  templateUrl: './schedule.html',
  styleUrls: ['./schedule.scss'],
})
export class Schedule implements OnInit, OnDestroy {
  // ===== DI =====
  private fb = inject(FormBuilder);
  private cms = inject(CmsService);
  private geo = inject(GeoService);
  private cdr = inject(ChangeDetectorRef);
  private uno = inject(UnoService);
  private toast = inject(ToastService);
  private leadStore = inject(LeadStore);

  // ===== state/signals =====
  step = signal<Step>(1);
  showSucess = signal(false);
  submitting = signal(false);

  units: UnidadeItem[] = [];
  filteredUnits: UnidadeItem[] = [];
  loading = false;
  loadingHours = signal(false);

  unitForm!: FormGroup<{
    search: FormControl<string>;
    unitId: FormControl<string | null>;
  }>;

  scheduleForm!: FormGroup<{
    date: FormControl<Date | null>;
    time: FormControl<string>;
    serviceId: FormControl<number | null>;
    roomId: FormControl<number | null>;
  }>;

  customerForm!: FormGroup<{
    name: FormControl<string>;
    phone: FormControl<string>;
  }>;

  // calendário/horários
  times: TimeSlot[] = [];
  viewingMonth!: Date;
  calendar!: DayCell[][];
  private maxDate!: Date;
  private minMonthStart!: Date;

  // CEP memo
  private lastCep?: string;
  private lastCepCoords: { lat: number; lon: number } | null = null;

  // outros
  private destroy$ = new Subject<void>();
  skeletonUnits = Array.from({ length: 6 }, (_, i) => i);

  // lottie
  options: AnimationOptions = { path: '/images/lottie/check.json' };
  error: boolean = false;

  // ==========================
  // Lifecycle
  // ==========================
  ngOnInit(): void {
    this.buildForms();
    this.initCalendar();
    this.bindDateToTimes();
    this.loadUnidades();
    this.bindSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==========================
  // Getters (template)
  // ==========================
  get disablePrevMonth(): boolean {
    const startViewing = new Date(this.viewingMonth.getFullYear(), this.viewingMonth.getMonth(), 1);
    return startViewing <= this.minMonthStart;
  }

  get disableNextMonth(): boolean {
    const nextStart = new Date(this.viewingMonth.getFullYear(), this.viewingMonth.getMonth() + 1, 1);
    const maxMonthStart = new Date(this.maxDate.getFullYear(), this.maxDate.getMonth(), 1);
    return nextStart > maxMonthStart;
  }

  get selectedUnit(): UnidadeItem | undefined {
    const id = this.unitForm.controls.unitId.value;
    return id ? this.units.find((u) => u.id === id) : undefined;
  }

  get timeCtrl(): FormControl<string> {
    return this.scheduleForm.controls.time;
  }

  get viewingTitle(): string {
    const dt = this.viewingMonth;
    const month = dt.toLocaleString('pt-BR', { month: 'long' });
    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${dt.getFullYear()}`;
  }

  // ==========================
  // Ações públicas (UI)
  // ==========================

  selectUnit(u: UnidadeItem): void {
    const changed = this.unitForm.controls.unitId.value !== u.id;
    this.unitForm.patchValue({ unitId: u.id });

    if (changed) {
      this.scheduleForm.controls.date.setValue(null);
      this.scheduleForm.controls.time.setValue('');
      this.scheduleForm.controls.time.disable();
      this.scheduleForm.controls.roomId.setValue(null);
      this.times = [];
      this.rebuildCalendar();
    }

    if (this.step() === 1) {
      this.step.set(2);
      this.scrollTopSmooth();
    }
  }

  changeUnit(): void {
    this.step.set(1);
    this.cdr.detectChanges();
    this.scrollUnitListToTop({ behavior: 'smooth', retry: true, attempts: 12 });
    this.scrollTopSmooth();
  }

  continueToCustomer(): void {
    if (this.unitForm.invalid || this.scheduleForm.invalid) {
      this.unitForm.markAllAsTouched();
      this.scheduleForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    this.step.set(3);
    this.scrollTopSmooth();
  }

  backToUnits(): void {
    this.step.set(1);
    this.cdr.detectChanges();
    this.scrollUnitListToTop({ behavior: 'smooth' });
    this.scrollTopSmooth();
  }

  backToSchedule(): void {
    this.step.set(2);
    this.cdr.detectChanges();
    this.scrollSelectedUnitWithinList({ retry: true, attempts: 10 });
    this.scrollTopSmooth();
  }

  submitSchedule(): void {
    if (this.customerForm.invalid || this.scheduleForm.invalid || this.unitForm.invalid) {
      this.customerForm.markAllAsTouched();
      this.scheduleForm.markAllAsTouched();
      this.unitForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    const unit = this.selectedUnit!;
    const payload: SchedulePayload = {
      name: this.customerForm.controls.name.value,
      cellPhone: '55' + this.customerForm.controls.phone.value,
      date: this.toISODate(this.scheduleForm.controls.date.value),
      hour: this.scheduleForm.controls.time.value,
      dealActivityId: this.scheduleForm.controls.serviceId.value!,
      roomId: this.scheduleForm.controls.roomId.value,
    };

    this.uno.createSchedule(unit.data.externalId! as any, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showSucess.set(true);
      },
      error: (err) => {
        this.submitting.set(false);
        console.error('createSchedule ERRO', err);
        this.toast.error(err?.error?.detail ?? 'Erro ao agendar', { duration: 6000 });
        this.showSucess.set(false);
      },
    });
  }

  // ==========================
  // Carregamento e busca
  // ==========================

  private buildForms(): void {
    this.unitForm = this.fb.group({
      search: this.fb.nonNullable.control<string>(''),
      unitId: this.fb.control<string | null>(null, { validators: [Validators.required] }),
    });

    this.scheduleForm = this.fb.group({
      date: this.fb.control<Date | null>(null, { validators: [Validators.required] }),
      time: new FormControl<string>({ value: '', disabled: true }, { nonNullable: true, validators: [Validators.required] }),
      serviceId: this.fb.control<number | null>(null),
      roomId: this.fb.control<number | null>(null),
    });

    this.customerForm = this.fb.group({
      name: this.fb.nonNullable.control<string>('', { validators: [Validators.required, Validators.minLength(3)] }),
      phone: this.fb.nonNullable.control<string>('', { validators: [Validators.required] }),
    });

    // quando trocar o horário, atualiza o roomId
    this.scheduleForm.controls.time.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((selectedHour) => {
      const slot = this.times.find((s) => s.hour === selectedHour);
      this.scheduleForm.controls.roomId.setValue(slot?.roomId ?? null);
    });
  }

  private loadUnidades(): void {
    this.loading = true;

    this.cms
      .getUnidades({ onlyWithUno: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.units = items;
          this.applySearch(this.unitForm.controls.search.value ?? '');
          this.loading = false;

          const draft = this.leadStore.takeDraft();
          if (draft) {
            this.customerForm.patchValue({ name: draft.name ?? '', phone: draft.phone ?? '' });

            const unit =
              (draft.unitId && this.units.find((u) => u.id === draft.unitId)) || (draft.franchiseId != null && this.units.find((u) => String(u.data.externalId) === String(draft.franchiseId)));

            if (unit) {
              this.unitForm.patchValue({ unitId: unit.id });

              this.units = [unit, ...this.units.filter((u) => u.id !== unit.id)];
              this.filteredUnits = [unit, ...this.filteredUnits.filter((u) => u.id !== unit.id)];
              if (this.step() === 1) this.step.set(2);
            }
          }
        },
        error: (err) => {
          console.error('[CMS] getUnidades error:', err);
          this.loading = false;
          this.units = [];
          this.filteredUnits = [];
        },
      });
  }

  private bindSearch(): void {
    this.unitForm.controls.search.valueChanges.pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe((q) => this.applySearch(q ?? ''));
  }

  private applySearch(raw: string): void {
    const q = (raw ?? '').trim();

    if (!q) {
      this.lastCep = undefined;
      this.lastCepCoords = null;
      this.filteredUnits = [...this.units];
      this.cdr.markForCheck();
      return;
    }

    const digits = q.replace(/\D+/g, '');
    const numericOnly = isNumericLike(q);

    // CEP parcial
    if (numericOnly && digits.length > 0 && digits.length < 8) {
      this.lastCep = undefined;
      this.lastCepCoords = null;
      this.filteredUnits = [...this.units];
      this.cdr.markForCheck();
      return;
    }

    // busca textual
    if (!numericOnly) {
      const nq = normalize(q);
      this.filteredUnits = this.units.filter((u) => matchesText(u, nq));
      this.cdr.markForCheck();
      return;
    }

    // CEP completo
    if (digits.length === 8) {
      if (this.lastCep === digits && this.lastCepCoords) {
        this.filteredUnits = sortByDistance(this.units, this.lastCepCoords);
        this.cdr.markForCheck();
        return;
      }

      this.geo
        .geocodeCep(digits)
        .pipe(takeUntil(this.destroy$))
        .subscribe((coord) => {
          this.lastCep = digits;
          this.lastCepCoords = coord;
          this.filteredUnits = coord ? sortByDistance(this.units, coord) : [...this.units];
          this.cdr.markForCheck();
        });

      return;
    }

    this.filteredUnits = [...this.units];
    this.cdr.markForCheck();
  }

  // ==========================
  // Calendário
  // ==========================
  private initCalendar(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.minMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    this.maxDate = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());
    this.maxDate.setHours(0, 0, 0, 0);

    this.viewingMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.rebuildCalendar();
  }

  prevMonth(): void {
    const candidate = new Date(this.viewingMonth.getFullYear(), this.viewingMonth.getMonth() - 1, 1);
    if (candidate >= this.minMonthStart) {
      this.viewingMonth = candidate;
      this.rebuildCalendar();
    }
  }

  nextMonth(): void {
    const candidate = new Date(this.viewingMonth.getFullYear(), this.viewingMonth.getMonth() + 1, 1);
    const maxMonthStart = new Date(this.maxDate.getFullYear(), this.maxDate.getMonth(), 1);
    if (candidate <= maxMonthStart) {
      this.viewingMonth = candidate;
      this.rebuildCalendar();
    }
  }

  selectDay(cell: DayCell): void {
    if (!cell.isPast && !cell.isAfterMax) {
      this.error = false;
      this.scheduleForm.controls.date.setValue(new Date(cell.date));
    }
  }

  private rebuildCalendar(): void {
    const start = new Date(this.viewingMonth.getFullYear(), this.viewingMonth.getMonth(), 1);
    const startWeekday = (start.getDay() + 6) % 7; // segunda = 0
    const gridStart = new Date(start);
    gridStart.setDate(1 - startWeekday);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weeks: DayCell[][] = [];
    const todayISO = this.toISODate(today);
    const selectedISO = this.scheduleForm.controls.date.value ? this.toISODate(this.scheduleForm.controls.date.value) : '';

    for (let w = 0; w < 6; w++) {
      const row: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(gridStart);
        cellDate.setDate(gridStart.getDate() + w * 7 + d);
        const iso = this.toISODate(cellDate);
        const inMonth = cellDate.getMonth() === this.viewingMonth.getMonth();

        row.push({
          date: cellDate,
          iso,
          inMonth,
          isToday: iso === todayISO,
          selected: iso === selectedISO,
          hasAvailability: false, // marcado apenas quando houver fonte de disponibilidade por dia
          isPast: cellDate < today,
          isAfterMax: cellDate > this.maxDate,
        });
      }
      weeks.push(row);
    }
    this.calendar = weeks;
  }

  private bindDateToTimes(): void {
    this.scheduleForm.controls.date.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((d: Date | null) => {
      this.times = [];
      this.scheduleForm.controls.time.setValue('');
      this.scheduleForm.controls.time.disable();
      this.scheduleForm.controls.roomId.setValue(null);
      this.markSelectedOnCalendar(d ? this.toISODate(d) : '');

      const unit = this.selectedUnit;
      if (!d || !unit || !unit.data.externalId) return;

      const dateBR = this.toBRDate(d);
      this.loadingHours.set(true);

      this.uno
        .getAvailableHours(unit.data.externalId, dateBR)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            this.scheduleForm.controls.serviceId.setValue(res.serviceId);
            this.times = (res.hours ?? []).map((h: any) => ({ hour: h.hour as string, roomId: h.roomId as number })).sort((a, b) => a.hour.localeCompare(b.hour));
            if (this.times.length) {
              this.scheduleForm.controls.time.enable({ emitEvent: false });
            } else {
              console.log('1');
              this.times = [];
              this.scheduleForm.controls.time.disable({ emitEvent: false });
              this.scheduleForm.controls.serviceId.setValue(null);
              this.scheduleForm.controls.roomId.setValue(null);
              this.error = true;
              this.toast.error('Nenhum horário disponível. Por favor, selecione outra data.', { duration: 6000 });
            }
          },
          error: (err) => {
            console.error('[UNO] getAvailableHours error:', err);
            this.times = [];
            this.scheduleForm.controls.time.disable();
            this.scheduleForm.controls.serviceId.setValue(null);
            this.scheduleForm.controls.roomId.setValue(null);
          },
          complete: () => {
            console.log('12');

            this.loadingHours.set(false);
          },
        });
    });
  }

  private markSelectedOnCalendar(selectedISO: string): void {
    if (!this.calendar) return;
    for (const week of this.calendar) {
      for (const c of week) c.selected = c.iso === selectedISO;
    }
  }

  // ==========================
  // Scroll helpers
  // ==========================
  private scrollTopSmooth(): void {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  }

  private scrollUnitListToTop(opts: { behavior?: ScrollBehavior; retry?: boolean; attempts?: number } = {}): void {
    const behavior = opts.behavior ?? 'smooth';
    const retry = opts.retry ?? true;
    const max = opts.attempts ?? 10;
    let tries = 0;

    const tick = () => {
      const container = document.querySelector('.col-units .unit-list--scroll') as HTMLElement | null;
      if (!container || container.clientHeight === 0) {
        if (retry && tries < max) {
          tries++;
          requestAnimationFrame(tick);
        }
        return;
      }
      container.scrollTo({ top: 0, behavior });
    };

    requestAnimationFrame(tick);
  }

  private scrollSelectedUnitWithinList(opts: { retry?: boolean; attempts?: number } = {}): void {
    const retry = opts.retry ?? true;
    const max = opts.attempts ?? 8;
    let tries = 0;

    const tick = () => {
      const container = document.querySelector('.unit-list.unit-list--scroll') as HTMLElement | null;
      const el = container?.querySelector('.unit-card.is-selected') as HTMLElement | null;

      if (!container || !el) {
        if (retry && tries < max) {
          tries++;
          requestAnimationFrame(tick);
        }
        return;
      }

      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const delta = eRect.top - cRect.top - (container.clientHeight / 2 - el.clientHeight / 2);

      container.scrollTo({ top: container.scrollTop + delta, behavior: 'auto' });
    };

    requestAnimationFrame(tick);
  }

  // ==========================
  // Helpers (template)
  // ==========================
  imgOf(u: UnidadeItem): string {
    return 'https://cloud.squidex.io/api/assets/lisolaser/' + u.data.images?.[0];
  }

  addressLine(u: UnidadeItem): string {
    const a = u.data.address;
    if (!a) return '';
    const parts: string[] = [];
    if (a.street) parts.push(a.street);
    if (a.number) parts.push(a.number);
    return parts.join(', ');
  }

  getInstagram(u: UnidadeItem): string | null {
    const contacts = (u as any)?.data?.contacts;
    const ig = contacts?.instagram;
    return typeof ig === 'string' && ig.trim() ? ig : null;
  }

  toISODate(d: Date | null): string {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${m}/${y}`;
  }

  distanceFromCep(u: UnidadeItem): string {
    if (!this.lastCepCoords) return '';
    const d = distanceOrInf(this.lastCepCoords, u);
    return Number.isFinite(d) ? `${d.toFixed(1)} km` : '';
  }

  private toBRDate(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}

// ==========================
// Utils (fora da classe)
// ==========================
function normalize(s: string | undefined | null): string {
  return (s ?? '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function matchesText(u: UnidadeItem, nq: string): boolean {
  const d = u.data;
  const a = d.address;
  return [normalize(d.name), normalize(a?.city), normalize(a?.state), normalize(a?.zipCode), normalize(a?.street), normalize(a?.number)].some((v) => v.includes(nq));
}

function distanceOrInf(origin: { lat: number; lon: number }, u: UnidadeItem): number {
  const lat = u.data.address?.latitude ?? null;
  const lon = u.data.address?.longitude ?? null;
  if (lat == null || lon == null) return Number.POSITIVE_INFINITY;
  return haversineKM(origin.lat, origin.lon, lat, lon);
}

function sortByDistance(units: UnidadeItem[], origin: { lat: number; lon: number }): UnidadeItem[] {
  return [...units].sort((a, b) => {
    const da = distanceOrInf(origin, a);
    const db = distanceOrInf(origin, b);
    if (da === db) return 0;
    return da < db ? -1 : 1;
  });
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

function isNumericLike(s: string): boolean {
  return /^[\d\-\s]+$/.test(s);
}
