import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CheckInFlowStore } from './data-access/check-in-flow.store';

const toSearch = () => inject(Router).createUrlTree(['/search']);

export const resultsGuard: CanActivateFn = () =>
  inject(CheckInFlowStore).searchStatus() !== 'idle' || toSearch();

export const detailsGuard: CanActivateFn = (route) =>
  inject(CheckInFlowStore).selected()?.id === route.paramMap.get('flightId') || toSearch();

export const confirmationGuard: CanActivateFn = () =>
  !!inject(CheckInFlowStore).boardingPass() || toSearch();

export const errorGuard: CanActivateFn = () => !!inject(CheckInFlowStore).error() || toSearch();
