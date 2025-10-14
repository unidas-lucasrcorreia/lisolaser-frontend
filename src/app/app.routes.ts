import { Routes } from '@angular/router';
import { About } from './pages/about/about';
import { BlogArticle } from './pages/blog-article/blog-article';
import { Blog } from './pages/blog/blog';
import { Home } from './pages/home/home';
import { LocationDetails } from './pages/location-details/location-details';
import { Locations } from './pages/locations/locations';
import { Schedule } from './pages/schedule/schedule';
import { WaxingByGender } from './pages/waxing-by-gender/waxing-by-gender';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'unidades', component: Locations },
  { path: 'unidade/:externalId/:slug', component: LocationDetails },
  { path: 'agendamento', component: Schedule },
  { path: 'sobre', component: About },
  { path: 'blog', component: Blog },
  { path: 'blog/:slug', component: BlogArticle },

  { path: 'depilacao-feminina', component: WaxingByGender, data: { gender: 'feminino' } },
  { path: 'depilacao-masculina', component: WaxingByGender, data: { gender: 'masculino' } },
  { path: '**', redirectTo: '' }, // rota coringa
];
