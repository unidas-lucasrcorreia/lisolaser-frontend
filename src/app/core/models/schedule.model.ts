// src/app/core/services/uno.types.ts
export interface SchedulePayload {
  name: string;
  cellPhone: string; // só dígitos (ex.: 11999999999)
  date: string; // o que você já gera em toISODate(...) ou dd/MM/yyyy (conforme contrato do create)
  hour: string; // "HH:mm"
  email: string;
  dealActivityId?: number | null; // só se realmente existir no contrato
}

export interface CreateScheduleRequest extends SchedulePayload {
  roomId: number;
}

export interface CreateScheduleResponse {
  ok: boolean;
  id?: number;
  message?: string;
  // ...demais campos que a API retornar
}
