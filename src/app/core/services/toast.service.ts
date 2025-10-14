import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  /** Tempo de vida (ms). Use 0 para não auto-fechar. Default: 4000 */
  duration?: number;
}

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  private _seq = 0;

  toasts = this._toasts.asReadonly();

  show(type: ToastType, message: string, options: ToastOptions = {}) {
    const duration = options.duration ?? 4000;
    const toast: Toast = {
      id: ++this._seq,
      type,
      message,
      duration,
      createdAt: Date.now(),
    };

    this._toasts.update((list) => [toast, ...list]);

    if (duration > 0) {
      // auto remover
      window.setTimeout(() => this.dismiss(toast.id), duration);
    }
  }

  success(msg: string, options?: ToastOptions) {
    this.show('success', msg, options);
  }
  error(msg: string, options?: ToastOptions) {
    this.show('error', msg, options);
  }
  warning(msg: string, options?: ToastOptions) {
    this.show('warning', msg, options);
  }
  info(msg: string, options?: ToastOptions) {
    this.show('info', msg, options);
  }

  dismiss(id: number) {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  clear() {
    this._toasts.set([]);
  }
}
