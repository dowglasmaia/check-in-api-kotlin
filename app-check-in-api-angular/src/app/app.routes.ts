import { Routes } from '@angular/router';
import { Shell } from './layouts/shell/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'search' },
      {
        path: 'test-data',
        title: 'Test data · MaiaFlight',
        loadChildren: () =>
          import('./features/test-data/test-data.routes').then((m) => m.TEST_DATA_ROUTES),
      },
      {
        path: '',
        loadChildren: () =>
          import('./features/check-in/check-in.routes').then((m) => m.CHECK_IN_ROUTES),
      },
      {
        path: '**',
        title: 'Page not found · MaiaFlight',
        loadComponent: () => import('./layouts/shell/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
