import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { UnoService } from '../../services/uno-service';
import { LeadStore } from '../../services/lead-store';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { FieldErrors } from '../field-errors/field-errors';
import { TouchOnBlurDirective } from '../../directives/touch-on-blur.directive';
import { UnitSelect } from '../unit-select/unit-select';
import { UnidadeItem } from '../../models/unidade.model';

@Component({
  selector: 'app-lead-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, NgxMaskDirective, FieldErrors, TouchOnBlurDirective, UnitSelect],
  providers: [provideNgxMask()],
  templateUrl: './lead-form.html',
  styleUrl: './lead-form.scss',
})
export class LeadForm implements OnInit {
  private fb = inject(FormBuilder);
  private leads = inject(UnoService);
  private store = inject(LeadStore);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  submitting = signal(false);

  /** Guardamos o item emitido pelo UnitSelect para ter os metadados (externalId etc.). */
  private selectedUnitItem: UnidadeItem | null = null;

  form!: FormGroup<{
    name: FormControl<string>;
    phone: FormControl<string>;
    unitId: FormControl<string | null>; // o UnitSelect escreve aqui via CVA
  }>;

  ngOnInit(): void {
    this.form = this.fb.group({
      name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
      phone: this.fb.nonNullable.control('', [Validators.required]),
      unitId: this.fb.control<string | null>(null, [Validators.required]),
    });
  }

  /** Recebe a unidade selecionada pelo UnitSelect (Output). */
  onUnitPicked(u: UnidadeItem) {
    // Mantém o item (para ter o externalId) e garante que o form control tem o id.
    this.selectedUnitItem = u;
    this.form.controls.unitId.setValue(u.id, { emitEvent: false });
    // Revalida já, para não ter “race” com o clique rápido no botão.
    this.form.controls.unitId.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    this.form.updateValueAndValidity({ onlySelf: false, emitEvent: false });
    this.cdr.markForCheck();
  }

  submit(): void {
    // Revalida tudo antes de decidir:
    this.form.updateValueAndValidity({ onlySelf: false, emitEvent: false });

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    const franchiseId = this.selectedUnitItem?.data?.externalId;
    if (!franchiseId) {
      // Proteção hard caso o usuário limpe o campo manualmente
      this.form.controls.unitId.setErrors({ required: true });
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    const name = this.form.controls.name.value;
    const phone = this.form.controls.phone.value;

    this.submitting.set(true);
    this.cdr.markForCheck();

    this.leads.createLead({ franchiseId, name, cellPhone: '55' + phone }).subscribe({
      next: () => {
        this.store.setDraft({ name, phone, unitId: this.selectedUnitItem!.id, franchiseId });
        this.submitting.set(false);
        this.router.navigate(['/agendamento']);
      },
      error: () => {
        this.submitting.set(false);
        this.cdr.markForCheck();
      },
      complete: () => {
        this.submitting.set(false);
        this.cdr.markForCheck();
      },
    });
  }
}
