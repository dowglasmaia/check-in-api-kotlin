import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  Router,
} from '@angular/router';
import { confirmationGuard, detailsGuard, errorGuard, resultsGuard } from './check-in.guards';
import { CheckInFlowStore } from './data-access/check-in-flow.store';
import { boardingPass, flightView } from './testing/fixtures';
import { provideRouter } from '@angular/router';
import { httpTestProviders, testScenariosStub } from './testing/fixtures';

const state = {} as RouterStateSnapshot;
const route = (flightId = '') =>
  ({ paramMap: convertToParamMap({ flightId }) }) as ActivatedRouteSnapshot;
const run = (guard: typeof resultsGuard, snapshot = route()) =>
  TestBed.runInInjectionContext(() => guard(snapshot, state));

describe('check-in guards', () => {
  let store: CheckInFlowStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), ...httpTestProviders(), testScenariosStub().provider],
    });
    store = TestBed.inject(CheckInFlowStore);
  });

  const redirectsToSearch = (result: unknown) =>
    result instanceof UrlTree && TestBed.inject(Router).serializeUrl(result) === '/search';

  it('resultsGuard needs a search to have started', () => {
    expect(redirectsToSearch(run(resultsGuard))).toBe(true);
    store.searchStatus.set('loading');
    expect(run(resultsGuard)).toBe(true);
  });

  it('detailsGuard only opens the flight that was selected', () => {
    expect(redirectsToSearch(run(detailsGuard, route('FL-004')))).toBe(true);
    store.selected.set(flightView());
    expect(run(detailsGuard, route('FL-004'))).toBe(true);
    expect(redirectsToSearch(run(detailsGuard, route('FL-999')))).toBe(true);
  });

  it('confirmationGuard needs a confirmed check-in', () => {
    expect(redirectsToSearch(run(confirmationGuard))).toBe(true);
    store.boardingPass.set(boardingPass());
    expect(run(confirmationGuard)).toBe(true);
  });

  it('errorGuard needs an error to show', () => {
    expect(redirectsToSearch(run(errorGuard))).toBe(true);
    store.error.set({ kind: 'api' });
    expect(run(errorGuard)).toBe(true);
  });
});
