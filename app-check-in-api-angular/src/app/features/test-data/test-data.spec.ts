import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { httpTestProviders } from '../check-in/testing/fixtures';
import { TestScenarios } from './data-access/test-data.api';
import { TestDataPage } from './pages/test-data-page';
import { SCENARIO_PREFILL_STATE } from './public-api';

const RESPONSE = {
  notice: 'Fictitious data for flow testing only',
  scenarios: [
    {
      label: 'Flight with check-in open',
      searchType: 'FLIGHT_NUMBER',
      value: 'MF214',
      expectedOutcome: '1 flight',
      note: 'Passenger code P-004.',
    },
    {
      label: 'Booking with three flights',
      searchType: 'BOOKING_CODE',
      value: 'MAIA7K',
      expectedOutcome: '3 flights',
    },
  ],
};

describe('test data', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...httpTestProviders()] });
    http = TestBed.inject(HttpTestingController);
  });

  async function loadScenarios(
    respond: (request: ReturnType<HttpTestingController['expectOne']>) => void,
  ) {
    const service = TestBed.inject(TestScenarios);
    TestBed.flushEffects();
    await Promise.resolve();
    respond(http.expectOne('/demo/test-data'));
    await Promise.resolve();
    return service;
  }

  it('is available when the API serves the scenarios', async () => {
    const service = await loadScenarios((request) => request.flush(RESPONSE));
    expect(service.available()).toBe(true);
    expect(service.scenarios().map((scenario) => scenario.value)).toEqual(['MF214', 'MAIA7K']);
    expect(service.notice()).toBe('Fictitious data for flow testing only');
  });

  it('lists the fictitious passengers of a flight', async () => {
    const service = await loadScenarios((request) =>
      request.flush({
        ...RESPONSE,
        flights: [
          {
            flightId: 'FL-004',
            passengers: [
              { passengerId: 'P-004', name: 'Ana Costa' },
              { passengerId: 'P-005', name: 'Bruno Lima' },
            ],
          },
        ],
      }),
    );
    expect(service.passengersOf('FL-004').map((passenger) => passenger.passengerId)).toEqual([
      'P-004',
      'P-005',
    ]);
    expect(service.passengersOf('FL-999')).toEqual([]);
  });

  it('has no passengers when the API has demo data disabled', async () => {
    const service = await loadScenarios((request) =>
      request.flush(
        { status: 404, error: 'Not Found', message: 'x', code: 'NOT_FOUND' },
        { status: 404, statusText: 'Not Found' },
      ),
    );
    expect(service.passengersOf('FL-004')).toEqual([]);
  });

  describe('resetData', () => {
    it('asks the API to forget every check-in and announces it', async () => {
      const service = TestBed.inject(TestScenarios);
      expect(service.resetCount()).toBe(0);

      const result = service.resetData();
      const request = http.expectOne((req) => req.url === '/demo/reset');
      expect(request.request.method).toBe('POST');
      request.flush(null, { status: 204, statusText: 'No Content' });

      expect(await result).toBe(true);
      expect(service.resetCount()).toBe(1);
      http.match('/demo/test-data');
    });

    it('reports a failure and does not announce a reset', async () => {
      const service = TestBed.inject(TestScenarios);
      const result = service.resetData();
      http
        .expectOne('/demo/reset')
        .flush({ status: 404 }, { status: 404, statusText: 'Not Found' });

      expect(await result).toBe(false);
      expect(service.resetCount()).toBe(0);
      http.match('/demo/test-data');
    });
  });

  it('is not available when the API has demo data disabled', async () => {
    const service = await loadScenarios((request) =>
      request.flush(
        { status: 404, error: 'Not Found', message: 'x', code: 'NOT_FOUND' },
        { status: 404, statusText: 'Not Found' },
      ),
    );
    expect(service.available()).toBe(false);
    expect(service.scenarios()).toEqual([]);
  });

  it('page lists the scenarios, warns that they are fictitious and hands one to the search page', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(TestDataPage);
    fixture.detectChanges();
    await Promise.resolve();
    http.expectOne('/demo/test-data').flush(RESPONSE);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Fictitious data — for flow testing only');
    expect(el.textContent).toContain('MAIA7K');

    el.querySelectorAll<HTMLButtonElement>('app-scenario-card button')[1].click();
    expect(navigate).toHaveBeenCalledWith(['/search'], {
      state: { [SCENARIO_PREFILL_STATE]: { searchType: 'BOOKING_CODE', value: 'MAIA7K' } },
    });
  });

  it('page resets the test data and confirms it', async () => {
    const fixture = TestBed.createComponent(TestDataPage);
    fixture.detectChanges();
    await Promise.resolve();
    http.expectOne('/demo/test-data').flush(RESPONSE);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const reset = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reset test data'),
    )!;
    reset.click();
    await fixture.whenStable();
    http.expectOne('/demo/reset').flush(null, { status: 204, statusText: 'No Content' });
    await vi.waitFor(() => expect(el.textContent).toContain('All check-ins were removed'));
  });

  it('page reports when the reset fails', async () => {
    const fixture = TestBed.createComponent(TestDataPage);
    fixture.detectChanges();
    await Promise.resolve();
    http.expectOne('/demo/test-data').flush(RESPONSE);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    Array.from(el.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Reset test data'))!
      .click();
    await fixture.whenStable();
    http.expectOne('/demo/reset').flush({}, { status: 500, statusText: 'Server Error' });
    await vi.waitFor(() => expect(el.textContent).toContain('Could not reset the test data'));
  });

  it('page explains when no scenarios are available', async () => {
    const fixture = TestBed.createComponent(TestDataPage);
    fixture.detectChanges();
    await Promise.resolve();
    http
      .expectOne('/demo/test-data')
      .flush(
        { status: 404, error: 'Not Found', message: 'x', code: 'NOT_FOUND' },
        { status: 404, statusText: 'Not Found' },
      );
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Test data is not available',
    );
  });
});
