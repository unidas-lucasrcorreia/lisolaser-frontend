// src/app/core/services/cms-service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UnidadeItem, UnidadesResponse, unwrapItems } from '../models/unidade.model';

/** ====== Blog ====== */
export interface BlogPost {
  subtitle?: string;
  title: string;
  featuredText?: string;
  featuredImage?: string[]; // IDs de asset do Squidex
  mainImage?: string[]; // se existir no schema
  content?: string | null; // HTML
  slug: string;
}

export interface BlogListResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: BlogPost[];
}

/** ====== Unidades ====== */
export type UnidadesEnvelope = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: any[];
};

// Payload “cru” do Squidex (sem envelope próprio do backend)
type SquidexPagePayload = { total: number; items: any[] };

@Injectable({ providedIn: 'root' })
export class CmsService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** =========================
   * Helpers privados
   * ========================== */

  /** Monta HttpParams ignorando valores undefined/null e strings vazias */
  private buildParams(input: Record<string, string | number | boolean | undefined | null>): HttpParams {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(input)) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed.length === 0) continue; // não envia ?search= se vier vazio
        params = params.set(k, trimmed);
      } else {
        params = params.set(k, String(v));
      }
    }
    return params;
  }

  /** Normaliza a resposta de unidades em um envelope único */
  private normalizeUnidadesResponse(resp: UnidadesEnvelope | SquidexPagePayload | any[], page: number, pageSize: number): UnidadesEnvelope {
    // Caso 1: já veio no envelope completo
    if (resp && typeof (resp as any).page === 'number' && Array.isArray((resp as any).items)) {
      const e = resp as UnidadesEnvelope;
      const total = e.total ?? e.items.length;
      const pSize = e.pageSize ?? pageSize;
      return {
        total,
        page: e.page ?? page,
        pageSize: pSize,
        totalPages: e.totalPages ?? Math.max(1, Math.ceil(total / pSize)),
        items: e.items ?? [],
      };
    }

    // Caso 2: payload do Squidex { total, items }
    if (resp && typeof (resp as any).total === 'number' && Array.isArray((resp as any).items)) {
      const p = resp as SquidexPagePayload;
      const totalPages = Math.max(1, Math.ceil(p.total / pageSize));
      return { total: p.total, page, pageSize, totalPages, items: p.items };
    }

    // Caso 3: array puro
    if (Array.isArray(resp)) {
      const total = resp.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const start = (page - 1) * pageSize;
      const items = resp.slice(start, start + pageSize);
      return { total, page, pageSize, totalPages, items };
    }

    // Fallback seguro
    return { total: 0, page, pageSize, totalPages: 1, items: [] };
  }

  /** =========================
   * CMS genérico
   * ========================== */

  /** Busca um documento CMS por slug */
  getCmsData(slug: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/cms/${encodeURIComponent(slug)}`).pipe(catchError(() => of(null)));
  }

  /** Resolve dados por schema + lista de IDs (com resolve de assets e flatten) */
  resolveData(schema: string, ids: string[]): Observable<any[]> {
    const body = { ids, resolveAssetUrls: true, flatten: true };
    return this.http.post<any[]>(`${this.baseUrl}/cms/${encodeURIComponent(schema)}/resolve/data`, body).pipe(catchError(() => of([])));
  }

  /** =========================
   * Unidades
   * ========================== */

  /**
   * Versão paginada e normalizada (retorna sempre um envelope consistente)
   * Observação: só envia `search` quando houver conteúdo não-vazio.
   */
  getUnidadesPaged(params?: { page?: number; pageSize?: number; onlyWithUno?: boolean; search?: string }): Observable<UnidadesEnvelope> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 12;

    const httpParams = this.buildParams({
      page,
      pageSize,
      onlyWithUno: params?.onlyWithUno ? 'true' : undefined,
      search: params?.search,
    });

    return this.http.get<UnidadesEnvelope | SquidexPagePayload | any[]>(`${this.baseUrl}/cms/unidades`, { params: httpParams }).pipe(
      map((resp) => this.normalizeUnidadesResponse(resp, page, pageSize)),
      catchError(() => of({ total: 0, page, pageSize, totalPages: 1, items: [] })),
    );
  }

  /**
   * Versão “lista” (mantém sua assinatura anterior) — usa unwrapItems
   * Observação: NÃO envia `search` vazio.
   */
  getUnidades(params?: { page?: number; pageSize?: number; onlyWithUno?: boolean; search?: string }): Observable<UnidadeItem[]> {
    const httpParams = this.buildParams({
      page: params?.page,
      pageSize: params?.pageSize,
      onlyWithUno: params?.onlyWithUno ? 'true' : undefined,
      search: params?.search,
    });

    return this.http.get<UnidadesResponse>(`${this.baseUrl}/cms/unidades`, { params: httpParams }).pipe(
      map(unwrapItems),
      catchError(() => of([] as UnidadeItem[])),
    );
  }

  /** Busca unidade por UNO Id */
  getUnidadeByUnoId(unoId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/cms/unidade/getByUnoId/${encodeURIComponent(unoId)}`).pipe(catchError(() => of(null)));
  }

  /** =========================
   * Blog
   * ========================== */

  /** Lista de posts paginada (opcionalmente com busca) */
  getBlogPosts(page: number, pageSize: number, search?: string): Observable<BlogListResponse> {
    const httpParams = this.buildParams({
      page,
      pageSize,
      search,
    });

    return this.http.get<BlogListResponse>(`${this.baseUrl}/cms/blog/posts`, { params: httpParams }).pipe(
      // fallback leve em caso de erro
      catchError(() =>
        of({
          total: 0,
          page,
          pageSize,
          totalPages: 1,
          items: [],
        } as BlogListResponse),
      ),
    );
  }

  /** Post por slug */
  getBlogPostBySlug(slug: string): Observable<BlogPost> {
    return this.http.get<BlogPost>(`${this.baseUrl}/cms/blog/posts/${encodeURIComponent(slug)}`).pipe(catchError(() => of(null as unknown as BlogPost)));
  }

  /** =========================
   * Assets
   * ========================== */

  /** Monta URL de asset do Squidex */
  assetUrl(assetId?: string | null, appName = 'lisolaser'): string {
    if (!assetId) return '';
    return `https://cloud.squidex.io/api/assets/${appName}/${assetId}`;
  }
}
