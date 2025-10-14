import { Component, computed, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toaster',
  imports: [],
  templateUrl: './toaster.html',
  styleUrl: './toaster.scss',
})
export class Toaster {
  private readonly svc = inject(ToastService);
  toasts = computed(() => this.svc.toasts());

  dismiss(id: number) {
    this.svc.dismiss(id);
  }
}
