import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'phoneBR', standalone: true })
export class PhoneBrPipe implements PipeTransform {
  transform(value?: string | null): string {
    if (!value) return '';

    let d = value.replace(/\D/g, '');

    d = d.replace(/^(?:00)?55/, '');

    d = d.replace(/^0/, '');

    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;

    if (d.length > 11) {
      d = d.slice(-11);
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    }

    return value;
  }
}
