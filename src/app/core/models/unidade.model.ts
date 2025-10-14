export interface UnidadeAddress {
  street?: string;
  number?: string;
  city?: string;
  state?: string;
  zipCode?: string; // CEP
  latitude?: number | null;
  longitude?: number | null;
  complement?: string | null;
}

export interface UnidadeData {
  externalId: string;
  name: string;
  slug?: string;
  active?: boolean;
  images?: string[];
  address?: UnidadeAddress;
  // hours, contacts etc. se quiser
}

export interface UnidadeItem {
  id: string;
  data: UnidadeData;
}

export type UnidadesResponse =
  | UnidadeItem[] // array puro
  | { total: number; page?: number; pageSize?: number; totalPages?: number; items: UnidadeItem[] }; // paginado

export function unwrapItems(resp: UnidadesResponse): UnidadeItem[] {
  return Array.isArray(resp) ? resp : (resp.items ?? []);
}
