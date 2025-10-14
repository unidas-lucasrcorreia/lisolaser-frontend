// src/app/core/services/geo.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, Inject, Optional } from '@angular/core';
import { map, catchError, of, switchMap } from 'rxjs';

export interface GeoConfig {
  googleMapsApiKey?: string;
}

@Injectable({ providedIn: 'root' })
export class GeoService {
  constructor(
    private http: HttpClient,
    @Optional() @Inject('GEO_CONFIG') private cfg?: GeoConfig,
  ) {}

  geocodeCep(cep: string) {
    const digits = cep.replace(/\D+/g, '');
    if (digits.length !== 8) return of(null);

    const hasGoogle = !!this.cfg?.googleMapsApiKey;
    const google$ = hasGoogle ? this.googleGeocode(digits).pipe(catchError(() => of(null))) : of(null);

    return google$.pipe(switchMap((res) => (res ? of(res) : this.nominatimGeocode(digits))));
  }

  private googleGeocode(digits: string) {
    const key = this.cfg!.googleMapsApiKey!;
    const params = new HttpParams().set('address', digits).set('components', 'country:BR').set('region', 'br').set('key', key);

    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    return this.http.get<any>(url, { params }).pipe(
      map((r) => {
        // 👇 seu caso: { results: [...] }
        const first = Array.isArray(r?.results) ? r.results[0] : null;
        const loc = first?.geometry?.location;
        const lat = typeof loc?.lat === 'number' ? loc.lat : Number(loc?.lat);
        const lon = typeof loc?.lng === 'number' ? loc.lng : Number(loc?.lng);
        return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
      }),
      catchError(() => of(null)),
    );
  }

  private nominatimGeocode(digits: string) {
    const url = `https://nominatim.openstreetmap.org/search`;
    const params = new HttpParams().set('format', 'json').set('countrycodes', 'br').set('postalcode', digits).set('limit', 1);

    return this.http.get<any[]>(url, { params, headers: { 'Accept-Language': 'pt-BR' } }).pipe(
      map((arr) => {
        const r = arr?.[0];
        const lat = Number(r?.lat);
        const lon = Number(r?.lon);
        return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
      }),
      catchError(() => of(null)),
    );
  }
}
