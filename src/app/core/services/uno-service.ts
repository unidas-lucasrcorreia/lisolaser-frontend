// src/app/core/services/uno.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SchedulePayload, CreateScheduleResponse, CreateScheduleRequest } from '../models/schedule.model';
export type CreateLeadPayload = {
  franchiseId: number | string;
  name: string;
  cellPhone: string;
};

interface UnoHoursRaw {
  ok: boolean;
  timezone: string;
  weekdayString: string;
  weekday: number;
  serviceId: number;
  hours: Array<{ roomId: number; date: string; hour: string }>;
}

export interface UnoHours {
  serviceId: number | null;
  hours: Array<{ roomId: number; date: string; hour: string }>;
}

@Injectable({ providedIn: 'root' })
export class UnoService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  /**
   * GET /api/franchises/{franchiseId}/schedule/hours?date=dd/MM/yyyy
   */
  getAvailableHours(franchiseId: string | number, dateBr: string): Observable<UnoHours> {
    return this.http
      .get<UnoHoursRaw>(`${this.baseUrl}/franchises/${franchiseId}/schedule/hours`, {
        params: { date: dateBr },
      })
      .pipe(
        map(
          (raw): UnoHours => ({
            serviceId: typeof raw?.serviceId === 'number' ? raw.serviceId : null,
            hours: Array.isArray(raw?.hours) ? raw.hours : [],
          }),
        ),
      );
  }

  /**
   * POST /api/franchises/{franchiseId}/schedule
   * Encaminha para /v1/public/budget-schedule/{franchiseId}/create no backend.
   * Injeta franchiseIdentifier no body.
   */
  createSchedule(franchiseId: number, payload: any): Observable<CreateScheduleResponse> {
    // Monta o corpo exatamente como o backend/UNO espera
    const body: CreateScheduleRequest = {
      ...payload,
    };

    return this.http.post<CreateScheduleResponse>(`${this.baseUrl}/franchises/${franchiseId}/schedule`, body);
  }

  createLead(payload: CreateLeadPayload): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.baseUrl}/Leads`, payload);
  }
}
