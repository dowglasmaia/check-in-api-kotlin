import { Routes } from '@angular/router';
import { confirmationGuard, detailsGuard, errorGuard, resultsGuard } from './check-in.guards';

export const CHECK_IN_ROUTES: Routes = [
  {
    path: 'search',
    title: 'Find your flight · MaiaFlight',
    loadComponent: () => import('./pages/search-page').then((m) => m.SearchPage),
  },
  {
    path: 'flights',
    title: 'Your flights · MaiaFlight',
    data: { step: 1 },
    canActivate: [resultsGuard],
    loadComponent: () => import('./pages/results-page').then((m) => m.ResultsPage),
  },
  {
    path: 'flights/:flightId',
    title: 'Confirm check-in · MaiaFlight',
    data: { step: 2 },
    canActivate: [detailsGuard],
    loadComponent: () => import('./pages/details-page').then((m) => m.DetailsPage),
  },
  {
    path: 'confirmation',
    title: 'Check-in confirmed · MaiaFlight',
    data: { step: 3 },
    canActivate: [confirmationGuard],
    loadComponent: () => import('./pages/confirmation-page').then((m) => m.ConfirmationPage),
  },
  {
    path: 'error',
    title: 'Check-in · MaiaFlight',
    canActivate: [errorGuard],
    loadComponent: () => import('./pages/error-page').then((m) => m.ErrorPage),
  },
];
