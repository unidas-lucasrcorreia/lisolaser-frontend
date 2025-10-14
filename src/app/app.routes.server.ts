// app.routes.server.ts
import { RenderMode, type ServerRoute } from '@angular/ssr';

// Exemplo: buscar slugs de uma API/CMS.
// Aqui deixo um mock síncrono; troque pelo seu fetch.
async function fetchSlugs(): Promise<string[]> {
  // const res = await fetch('https://api.seusite.com/unidades');
  // const data = await res.json();
  // return data.map((u: any) => u.slug);
  return ['unidade-teste', 'outra-unidade']; // placeholder
}

export const serverRoutes: ServerRoute[] = [
  // Prerender estático da home e da listagem
  { path: '', renderMode: RenderMode.Prerender },
  // { path: 'unidades', renderMode: RenderMode.Prerender },
  { path: 'agendamento', renderMode: RenderMode.Prerender },

  // PRERENDER COM PARÂMETROS
  {
    path: 'unidade/:externalId/:slug',
    renderMode: RenderMode.Server,
  },

  // Fallback (se quiser):
  { path: '**', renderMode: RenderMode.Server },
];
