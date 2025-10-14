import { AbstractControl, ValidationErrors } from '@angular/forms';

export function getErrorMessage(errors: ValidationErrors | null | undefined, label = 'Campo'): string | null {
  if (!errors) return null;

  if (errors['required']) return `${label} é obrigatório.`;
  if (errors['email']) return `Informe um e-mail válido.`;
  if (errors['pattern']) return `${label} em formato inválido.`;
  if (errors['minlength']) return `${label} precisa de pelo menos ${errors['minlength'].requiredLength} caracteres.`;
  if (errors['maxlength']) return `${label} deve ter no máximo ${errors['maxlength'].requiredLength} caracteres.`;

  // exemplos de erros customizados:
  if (errors['phoneBR']) return `Telefone inválido. Ex.: (11) 90000-0000`;
  if (errors['cep']) return `CEP inválido.`;
  if (errors['mismatch']) return `Os valores não conferem.`;

  return `Valor inválido.`;
}

/** Útil no template: quando mostrar erro? */
export function showError(ctrl: AbstractControl | null | undefined): boolean {
  if (!ctrl) return false;
  return ctrl.invalid && (ctrl.touched || ctrl.dirty);
}
