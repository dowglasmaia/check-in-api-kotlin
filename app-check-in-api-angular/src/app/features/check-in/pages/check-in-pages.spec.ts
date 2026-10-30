import { HttpTestingController } from '@angular/common/http/testing';
import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Scenario, SCENARIO_PREFILL_STATE } from '../../test-data/public-api';
import { CheckInFlowStore } from '../data-access/check-in-flow.store';
import {
  CANCELLED,
  CHECKIN_RESPONSE,
  NOT_OPEN,
  apiErrorBody,
  boardingPass,
  flightDto,
  flightView,
  httpTestProviders,
  testScenariosStub,
} from '../testing/fixtures';
import { ConfirmationPage } from './confirmation-page';
import { DetailsPage } from './details-page';
import { ErrorPage } from './error-page';
import { ResultsPage } from './results-page';
import { SearchPage } from './search-page';

const scenarios: Scenario[] = [
  { label: 'a', searchType: 'FLIGHT_NUMBER', value: 'MF214', expectedOutcome: '' },
  { label: 'b', searchType: 'BOOKING_CODE', value: 'MAIA7K', expectedOutcome: '' },
  { label: 'c', searchType: 'DOCUMENT', value: '123.456.789-09', expectedOutcome: '' },
  { label: 'd', searchType: 'DOCUMENT', value: '444.555.666-77', expectedOutcome: '' },
];

async function configure(demo: { available?: boolean } = {}) {
  TestBed.configureTestingModule({
    deferBlockBehavior: DeferBlockBehavior.Manual,
    imports: [SearchPage, ResultsPage, DetailsPage, ConfirmationPage, ErrorPage],
    providers: [
      provideRouter([]),
      ...httpTestProviders(),
      testScenariosStub({
        available: demo.available,
        scenarios,
        passengers: {
          'FL-004': [
            { passengerId: 'P-004', name: 'Ana Costa' },
            { passengerId: 'P-005', name: 'Bruno Lima' },
          ],
        },
      }).provider,
    ],
  });
  await TestBed.compileComponents();
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  return {
    navigate,
    store: TestBed.inject(CheckInFlowStore),
    http: TestBed.inject(HttpTestingController),
  };
}

beforeEach(() =>
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  ),
);
afterEach(() => vi.unstubAllGlobals());

const text = (fixture: { nativeElement: unknown }) =>
  (fixture.nativeElement as HTMLElement).textContent ?? '';

describe('SearchPage', () => {
  afterEach(() => history.replaceState(null, ''));

  it('searches and moves to the results while loading', async () => {
    const { navigate, store, http } = await configure();
    const fixture = TestBed.createComponent(SearchPage);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('#search-value')!;
    input.value = 'maia7k';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(http.expectOne('/checkins/flights/search').request.body).toEqual({
      searchType: 'BOOKING_CODE',
      value: 'MAIA7K',
    });
    expect(store.searchStatus()).toBe('loading');
    expect(navigate).toHaveBeenCalledWith(['/flights']);
  });

  it('shows the first three scenarios as "Try" chips', async () => {
    await configure();
    const fixture = TestBed.createComponent(SearchPage);
    await fixture.whenStable();
    expect(text(fixture)).toContain('MF214');
    expect(text(fixture)).toContain('MAIA7K');
    expect(text(fixture)).toContain('123.456.789-09');
    expect(text(fixture)).not.toContain('444.555.666-77');
  });

  it('starts from a scenario handed over by the test-data page', async () => {
    await configure();
    history.replaceState(
      { [SCENARIO_PREFILL_STATE]: { searchType: 'DOCUMENT', value: '123.456.789-09' } },
      '',
    );
    const fixture = TestBed.createComponent(SearchPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector<HTMLInputElement>('#search-value')!.value).toBe('123.456.789-09');
    expect(el.querySelector('[role=tab][aria-selected=true]')?.textContent).toContain('Document');
  });
});

describe('ResultsPage', () => {
  it('shows a skeleton while searching', async () => {
    const { store } = await configure();
    store.searchStatus.set('loading');
    const fixture = TestBed.createComponent(ResultsPage);
    await fixture.whenStable();
    expect(text(fixture)).toContain('Searching for your flights…');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role=status]')).not.toBeNull();
  });

  it('lists every flight with its state', async () => {
    const { store } = await configure();
    store.flights.set([flightView(), flightView(NOT_OPEN), flightView(CANCELLED)]);
    store.searchStatus.set('done');
    store.searchLabel.set('MAIA7K');
    const fixture = TestBed.createComponent(ResultsPage);
    await fixture.whenStable();

    expect(text(fixture)).toContain('3 flights found');
    expect(text(fixture)).toContain('Booking code · MAIA7K');
    expect(text(fixture)).toContain('Check-in available');
    expect(text(fixture)).toContain('Not yet available');
    expect(text(fixture)).toContain('Cancelled');
  });

  it('goes to the details of an open flight', async () => {
    const { store, navigate } = await configure();
    store.flights.set([flightView()]);
    store.searchStatus.set('done');
    const fixture = TestBed.createComponent(ResultsPage);
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('app-flight-card button')!
      .click();
    expect(store.selected()?.id).toBe('FL-004');
    expect(navigate).toHaveBeenCalledWith(['/flights', 'FL-004']);
  });

  it.each([[NOT_OPEN], [CANCELLED]])(
    'opens the details page of a flight without check-in, not the error page',
    async (dto) => {
      const { store, navigate, http } = await configure();
      store.flights.set([flightView(dto)]);
      store.searchStatus.set('done');
      const fixture = TestBed.createComponent(ResultsPage);
      await fixture.whenStable();

      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('app-flight-card button')!
        .click();
      expect(store.error()).toBeUndefined();
      expect(navigate).toHaveBeenCalledWith(['/flights', dto.flightId]);
      http.expectNone('/checkins');
    },
  );

  it('stays on the list when an error about a selected flight is still set (Back to my flights)', async () => {
    const { store, navigate } = await configure();
    store.flights.set([flightView(), flightView(NOT_OPEN)]);
    store.searchStatus.set('done');
    store.error.set({ kind: 'already', flight: flightView() });
    const fixture = TestBed.createComponent(ResultsPage);
    await fixture.whenStable();

    expect(navigate).not.toHaveBeenCalled();
    expect(text(fixture)).toContain('2 flights found');
  });

  it('leaves for the error screen when the search failed', async () => {
    const { store, navigate } = await configure();
    store.searchStatus.set('done');
    store.error.set({ kind: 'none' });
    const fixture = TestBed.createComponent(ResultsPage);
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/error'], { replaceUrl: true });
  });

  it('starts a new search from the back button', async () => {
    const { store, navigate } = await configure();
    store.flights.set([flightView()]);
    store.searchStatus.set('done');
    const fixture = TestBed.createComponent(ResultsPage);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!.click();
    expect(store.searchStatus()).toBe('idle');
    expect(navigate).toHaveBeenCalledWith(['/search']);
  });
});

describe('DetailsPage', () => {
  async function open(passengerId?: string) {
    const ctx = await configure();
    ctx.store.selected.set(flightView());
    ctx.store.passengerId.set(passengerId);
    const fixture = TestBed.createComponent(DetailsPage);
    return { ...ctx, fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('shows the flight, the trip summary and the journey', async () => {
    const { fixture } = await open();
    await fixture.whenStable();
    const content = text(fixture);
    expect(content).toContain('GRU');
    expect(content).toContain('LIS');
    expect(content).toContain('After check-in');
    expect(content).toContain('Reservation found');
    expect(content).toContain('Trip summary');
  });

  it('confirms with the passenger identified by the document and goes to the confirmation', async () => {
    const { fixture, el, navigate, http } = await open('P-004');
    await fixture.whenStable();
    expect(el.querySelector('#passenger-code')).toBeNull();

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    const request = http.expectOne('/checkins');
    expect(request.request.body).toEqual({ flightId: 'FL-004', passengerId: 'P-004' });
    request.flush(CHECKIN_RESPONSE, { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/confirmation']));
  });

  it('pre-fills a test passenger so the whole flow can be completed', async () => {
    const { fixture, el, http, navigate } = await open();
    await fixture.whenStable();
    expect(el.querySelector<HTMLInputElement>('#passenger-code')!.value).toBe('P-004');
    expect(el.textContent).toContain('Bruno Lima');

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    const request = http.expectOne('/checkins');
    expect(request.request.body).toEqual({ flightId: 'FL-004', passengerId: 'P-004' });
    request.flush(CHECKIN_RESPONSE, { status: 201, statusText: 'Created' });
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/confirmation']));
  });

  it('asks for the passenger code otherwise and goes to the error screen on a conflict', async () => {
    const { fixture, el, navigate, http, store } = await open();
    await fixture.whenStable();

    const input = el.querySelector<HTMLInputElement>('#passenger-code')!;
    input.value = 'P-004';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const { body, init } = apiErrorBody(409, 'CHECKIN_ALREADY_DONE');
    http.expectOne('/checkins').flush(body, init);
    await fixture.whenStable();

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/error']));
    expect(store.error()?.kind).toBe('already');
  });

  it('does not send a request when the passenger code is missing', async () => {
    const { fixture, el, http } = await open();
    await fixture.whenStable();
    const input = el.querySelector<HTMLInputElement>('#passenger-code')!;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    http.expectNone('/checkins');
    expect(text(fixture)).toContain('Enter the passenger code to continue.');
  });

  it('goes back to the flights', async () => {
    const { fixture, el, navigate } = await open();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('button')!.click();
    expect(navigate).toHaveBeenCalledWith(['/flights']);
  });
});

describe('DetailsPage for a flight without check-in', () => {
  async function openBlocked(dto = NOT_OPEN) {
    const ctx = await configure();
    ctx.store.flights.set([flightView(), flightView(dto)]);
    ctx.store.searchStatus.set('done');
    ctx.store.selected.set(flightView(dto));
    const fixture = TestBed.createComponent(DetailsPage);
    await fixture.whenStable();
    return { ...ctx, fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('explains when check-in opens and offers no way to confirm', async () => {
    const { fixture, el, http } = await openBlocked();
    expect(text(fixture)).toMatch(/Check-in opens \d+ Mar at 11:15/);
    expect(text(fixture)).toContain('Not open yet');
    expect(text(fixture)).toContain('Check-in not available');
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('#passenger-code')).toBeNull();
    expect(el.querySelector<HTMLButtonElement>('button[disabled]')?.textContent).toContain(
      'Check-in not available',
    );
    http.expectNone('/checkins');
  });

  it('still shows the check-in window for a flight that is not open yet', async () => {
    const { fixture } = await openBlocked();
    expect(text(fixture)).toContain('Check-in window');
  });

  it('explains a cancelled flight and hides the window', async () => {
    const { fixture } = await openBlocked(CANCELLED);
    expect(text(fixture)).toContain('MF 3010 has been cancelled');
    expect(text(fixture)).toContain('Cancelled');
    expect(text(fixture)).not.toContain('Check-in window');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role=alert]')).not.toBeNull();
  });

  it('goes back to the flight list from "Back to my flights"', async () => {
    const { fixture, el, navigate } = await openBlocked();
    const back = Array.from(el.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Back to my flights'),
    )!;
    back.click();
    expect(navigate).toHaveBeenCalledWith(['/flights']);
    fixture.destroy();
  });
});

describe('ConfirmationPage', () => {
  it('shows the boarding gate, boarding time and confirmation code from the API', async () => {
    const { store } = await configure();
    store.boardingPass.set(boardingPass());
    const fixture = TestBed.createComponent(ConfirmationPage);
    await fixture.whenStable();

    const content = text(fixture);
    expect(content).toContain('Check-in successfully completed!');
    expect(content).toContain('C1');
    expect(content).toContain(CHECKIN_RESPONSE.checkinId);
    expect(content).toContain('CONFIRMED');
    expect(content).toContain('P-004');
  });

  it('starts another check-in', async () => {
    const { store, navigate } = await configure();
    store.boardingPass.set(boardingPass());
    const fixture = TestBed.createComponent(ConfirmationPage);
    await fixture.whenStable();

    const another = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((b) => b.textContent?.includes('Check in another flight'))!;
    another.click();
    expect(store.boardingPass()).toBeUndefined();
    expect(navigate).toHaveBeenCalledWith(['/search']);
  });

  it('offers to go back to the flights only when there are some', async () => {
    const { store } = await configure();
    store.boardingPass.set(boardingPass());
    const fixture = TestBed.createComponent(ConfirmationPage);
    await fixture.whenStable();
    expect(text(fixture)).not.toContain('Back to my flights');

    store.flights.set([flightView(flightDto())]);
    await fixture.whenStable();
    expect(text(fixture)).toContain('Back to my flights');
  });
});

describe('ErrorPage', () => {
  async function open(
    error: Parameters<CheckInFlowStore['error']['set']>[0],
    prepare?: (store: CheckInFlowStore) => void,
  ) {
    const ctx = await configure();
    ctx.store.error.set(error);
    prepare?.(ctx.store);
    const fixture = TestBed.createComponent(ErrorPage);
    await fixture.whenStable();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    return { ...ctx, fixture, buttons };
  }

  it('explains a closed check-in window using the flight from the error', async () => {
    const { fixture } = await open({ kind: 'window', flight: flightView(NOT_OPEN) });
    expect(text(fixture)).toContain('Check-in not open yet');
    expect(text(fixture)).toContain('MF 215');
  });

  it('offers the demo reset on "already checked in" and starts over from a clean search', async () => {
    const { fixture, navigate, store } = await open(
      { kind: 'already', flight: flightView() },
      (s) => s.boardingPass.set(boardingPass()),
    );
    const reset = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((button) => button.textContent?.includes('Reset test data'))!;

    reset.click();

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/search']));
    expect(store.boardingPass()).toBeUndefined();
    expect(store.checkedInFlightIds().size).toBe(0);
  });

  it('does not offer the demo reset when the API has no demo data', async () => {
    const ctx = await configure({ available: false });
    ctx.store.error.set({ kind: 'already', flight: flightView() });
    const fixture = TestBed.createComponent(ErrorPage);
    await fixture.whenStable();
    expect(text(fixture)).not.toContain('Reset test data');
  });

  it('goes back to the flights', async () => {
    const { buttons, navigate } = await open(
      { kind: 'window', flight: flightView(NOT_OPEN) },
      (store) => store.flights.set([flightView(NOT_OPEN)]),
    );
    buttons[0].click();
    await Promise.resolve();
    expect(navigate).toHaveBeenCalledWith(['/flights']);
  });

  it('starts over and clears the journey', async () => {
    const { buttons, navigate, store } = await open({ kind: 'none' });
    buttons[1].click();
    await Promise.resolve();
    expect(store.searchStatus()).toBe('idle');
    expect(navigate).toHaveBeenCalledWith(['/search']);
  });

  it('retries a failed check-in on the same flight', async () => {
    const { buttons, navigate } = await open({ kind: 'api', flight: flightView() });
    buttons[0].click();
    await Promise.resolve();
    expect(navigate).toHaveBeenCalledWith(['/flights', 'FL-004']);
  });

  it('shows the existing boarding pass for an already completed check-in', async () => {
    const { buttons, navigate } = await open({ kind: 'already', flight: flightView() }, (store) =>
      store.boardingPass.set(boardingPass()),
    );
    buttons[0].click();
    await Promise.resolve();
    expect(navigate).toHaveBeenCalledWith(['/confirmation']);
  });

  it('offers the booking code search with an empty prefill', async () => {
    const { buttons, navigate } = await open({ kind: 'notfound' });
    buttons[1].click();
    await Promise.resolve();
    expect(navigate).toHaveBeenCalledWith(['/search'], {
      state: { [SCENARIO_PREFILL_STATE]: { searchType: 'BOOKING_CODE', value: '' } },
    });
  });
});
