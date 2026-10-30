import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  CANCELLED,
  CHECKIN_RESPONSE,
  NOT_OPEN,
  apiErrorBody,
  flightDto,
  flightView,
  httpTestProviders,
  testScenariosStub,
} from '../testing/fixtures';
import { CheckInFlowStore } from './check-in-flow.store';

const SEARCH_URL = '/checkins/flights/search';
const CHECKIN_URL = '/checkins';

describe('CheckInFlowStore', () => {
  let store: CheckInFlowStore;
  let http: HttpTestingController;
  let demo: ReturnType<typeof testScenariosStub>;

  beforeEach(() => {
    demo = testScenariosStub();
    TestBed.configureTestingModule({ providers: [...httpTestProviders(), demo.provider] });
    store = TestBed.inject(CheckInFlowStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushSearch(body: object, init?: { status: number; statusText: string }) {
    http.expectOne(SEARCH_URL).flush(body, init);
  }

  describe('search', () => {
    it('sends the normalized value and exposes the flights', async () => {
      const search = store.search('FLIGHT_NUMBER', ' mf 214 ');
      expect(store.searchStatus()).toBe('loading');

      const request = http.expectOne(SEARCH_URL);
      expect(request.request.body).toEqual({ searchType: 'FLIGHT_NUMBER', value: 'MF214' });
      expect(request.request.headers.get('X-Request-Id')).toBeTruthy();
      request.flush({ flights: [flightDto(), NOT_OPEN] });
      await search;

      expect(store.searchStatus()).toBe('done');
      expect(store.flights().map((flight) => flight.id)).toEqual(['FL-004', 'FL-005']);
      expect(store.error()).toBeUndefined();
    });

    it('formats a CPF typed without punctuation and keeps only a masked label', async () => {
      const search = store.search('DOCUMENT', '12345678909');
      const request = http.expectOne(SEARCH_URL);
      expect(request.request.body.value).toBe('123.456.789-09');
      request.flush({ flights: [flightDto()], passengerId: 'P-004' });
      await search;

      expect(store.passengerId()).toBe('P-004');
      expect(store.searchLabel()).toBe('•••.456.789-••');
      expect(store.searchLabel()).not.toContain('123');
    });

    it('reports "none" when nothing is found and "notfound" for a flight number', async () => {
      const first = store.search('BOOKING_CODE', 'ZZZZZZ');
      flushSearch({ flights: [] });
      await first;
      expect(store.error()?.kind).toBe('none');

      const second = store.search('FLIGHT_NUMBER', 'MF999');
      flushSearch({ flights: [] });
      await second;
      expect(store.error()?.kind).toBe('notfound');
    });

    it('maps a 400 to "invalid"', async () => {
      const search = store.search('BOOKING_CODE', 'MAIA7K');
      const { body, init } = apiErrorBody(400, 'VALIDATION_ERROR');
      flushSearch(body, init);
      await search;
      expect(store.error()?.kind).toBe('invalid');
    });

    it('maps a 500 and a network failure to "api"', async () => {
      const first = store.search('BOOKING_CODE', 'MAIA7K');
      const { body, init } = apiErrorBody(500, 'INTERNAL_ERROR');
      flushSearch(body, init);
      await first;
      expect(store.error()?.kind).toBe('api');

      const second = store.search('BOOKING_CODE', 'MAIA7K');
      http.expectOne(SEARCH_URL).error(new ProgressEvent('error'));
      await second;
      expect(store.error()?.kind).toBe('api');
    });

    it('ignores a second search while one is in flight', async () => {
      const first = store.search('BOOKING_CODE', 'MAIA7K');
      await store.search('BOOKING_CODE', 'MAIA7K');
      http.expectOne(SEARCH_URL).flush({ flights: [flightDto()] });
      await first;
      expect(store.flights()).toHaveLength(1);
    });
  });

  describe('select', () => {
    beforeEach(async () => {
      const search = store.search('BOOKING_CODE', 'MAIA7K');
      flushSearch({
        flights: [
          flightDto(),
          NOT_OPEN,
          CANCELLED,
          flightDto({ flightId: 'FL-009', status: 'CLOSED', checkinAvailable: false }),
        ],
      });
      await search;
    });

    it('goes to the details of an open flight', () => {
      expect(store.select(store.flights()[0])).toBe('details');
      expect(store.selected()?.id).toBe('FL-004');
      expect(store.error()).toBeUndefined();
    });

    it.each([
      [1, 'not-open'],
      [2, 'cancelled'],
      [3, 'closed'],
    ])('opens the details of flight #%i (%s) instead of an error', (index, availability) => {
      const flight = store.flights()[index];
      expect(flight.availability).toBe(availability);
      expect(store.select(flight)).toBe('details');
      expect(store.selected()?.id).toBe(flight.id);
      expect(store.error()).toBeUndefined();
    });

    it('clears an earlier error when another flight is selected', () => {
      store.error.set({ kind: 'already', flight: store.flights()[0] });
      store.select(store.flights()[1]);
      expect(store.error()).toBeUndefined();
    });

    it('never calls the API to select a flight', () => {
      store.flights().forEach((flight) => store.select(flight));
      http.expectNone('/checkins');
    });
  });

  describe('confirm', () => {
    async function openFlight(passengerId?: string) {
      const search = store.search('DOCUMENT', '123.456.789-09');
      flushSearch({ flights: [flightDto()], passengerId });
      await search;
      store.select(store.flights()[0]);
    }

    it('uses the passenger identified by the search', async () => {
      await openFlight('P-004');
      const confirm = store.confirm();
      const request = http.expectOne(CHECKIN_URL);
      expect(request.request.body).toEqual({ flightId: 'FL-004', passengerId: 'P-004' });
      request.flush(CHECKIN_RESPONSE, { status: 201, statusText: 'Created' });

      expect(await confirm).toBe('confirmation');
      expect(store.boardingPass()?.boardingGate).toBe('C1');
      expect(store.checkedInFlightIds().has('FL-004')).toBe(true);
    });

    it('uses the typed passenger code when the search did not identify the passenger', async () => {
      await openFlight();
      const confirm = store.confirm(' P-004 ');
      const request = http.expectOne(CHECKIN_URL);
      expect(request.request.body.passengerId).toBe('P-004');
      request.flush(CHECKIN_RESPONSE, { status: 201, statusText: 'Created' });
      expect(await confirm).toBe('confirmation');
    });

    it('does nothing without a passenger', async () => {
      await openFlight();
      expect(await store.confirm()).toBe('ignored');
      expect(await store.confirm('   ')).toBe('ignored');
    });

    it('ignores a second confirmation while one is in flight', async () => {
      await openFlight('P-004');
      const first = store.confirm();
      expect(store.confirming()).toBe(true);
      expect(await store.confirm()).toBe('ignored');
      http.expectOne(CHECKIN_URL).flush(CHECKIN_RESPONSE, { status: 201, statusText: 'Created' });
      await first;
      expect(store.confirming()).toBe(false);
    });

    it.each([
      [409, 'CHECKIN_ALREADY_DONE', 'already'],
      [409, 'CHECKIN_NOT_ALLOWED', 'window'],
      [404, 'FLIGHT_NOT_FOUND', 'notfound'],
      [404, 'PASSENGER_NOT_FOUND', 'passenger'],
      [404, 'PASSENGER_NOT_ON_FLIGHT', 'passenger'],
      [500, 'INTERNAL_ERROR', 'api'],
    ])('maps HTTP %i %s to "%s"', async (status, code, kind) => {
      await openFlight('P-004');
      const confirm = store.confirm();
      const { body, init } = apiErrorBody(status, code);
      http.expectOne(CHECKIN_URL).flush(body, init);

      expect(await confirm).toBe('error');
      expect(store.error()?.kind).toBe(kind);
      expect(store.error()?.flight?.id).toBe('FL-004');
      expect(store.boardingPass()).toBeUndefined();
    });

    it('treats a rejected check-in on a cancelled flight as "cancelled"', async () => {
      store.selected.set(flightView({ status: 'CANCELLED', checkinAvailable: false }));
      store.passengerId.set('P-004');

      const confirm = store.confirm();
      const { body, init } = apiErrorBody(409, 'CHECKIN_NOT_ALLOWED');
      http.expectOne(CHECKIN_URL).flush(body, init);
      await confirm;

      expect(store.error()?.kind).toBe('cancelled');
    });

    it('shows the existing check-in when an already completed flight is selected again', async () => {
      await openFlight('P-004');
      const confirm = store.confirm();
      http.expectOne(CHECKIN_URL).flush(CHECKIN_RESPONSE, { status: 201, statusText: 'Created' });
      await confirm;

      expect(store.select(store.flights()[0])).toBe('error');
      expect(store.error()?.kind).toBe('already');
      expect(store.boardingPass()?.checkinId).toBe(CHECKIN_RESPONSE.checkinId);
    });
  });

  it('never writes to web storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const search = store.search('DOCUMENT', '123.456.789-09');
    flushSearch({ flights: [flightDto()], passengerId: 'P-004' });
    await search;
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  describe('repeating the flow', () => {
    async function checkIn() {
      const search = store.search('DOCUMENT', '123.456.789-09');
      flushSearch({ flights: [flightDto()], passengerId: 'P-004' });
      await search;
      store.select(store.flights()[0]);
      const confirm = store.confirm();
      http.expectOne(CHECKIN_URL).flush(CHECKIN_RESPONSE, { status: 201, statusText: 'Created' });
      await confirm;
    }

    it('keeps the check-ins of this session when a new search starts (the API remembers them too)', async () => {
      await checkIn();
      store.reset();

      expect(store.flights()).toEqual([]);
      expect(store.searchStatus()).toBe('idle');
      expect(store.checkedInFlightIds().has('FL-004')).toBe(true);
    });

    it('lists the flight as checked in on the next search and shows the existing pass, without calling the API', async () => {
      await checkIn();
      store.reset();

      const search = store.search('FLIGHT_NUMBER', 'MF214');
      flushSearch({ flights: [flightDto()] });
      await search;

      expect(store.checkedInFlightIds().has('FL-004')).toBe(true);
      expect(store.select(store.flights()[0])).toBe('error');
      expect(store.error()?.kind).toBe('already');
      expect(store.boardingPass()?.checkinId).toBe(CHECKIN_RESPONSE.checkinId);
      http.expectNone(CHECKIN_URL);
    });

    it('forgetCheckins drops the session check-ins as well', async () => {
      await checkIn();
      store.forgetCheckins();

      expect(store.checkedInFlightIds().size).toBe(0);
      expect(store.boardingPass()).toBeUndefined();
      expect(store.searchStatus()).toBe('idle');
    });

    it('forgets the session check-ins when the API demo data is reset', async () => {
      await checkIn();
      expect(store.checkedInFlightIds().size).toBe(1);

      await demo.stub.resetData();
      TestBed.tick();

      expect(store.checkedInFlightIds().size).toBe(0);
    });

    it('does not forget anything before any reset happened', async () => {
      await checkIn();
      TestBed.tick();
      expect(store.checkedInFlightIds().size).toBe(1);
    });
  });

  it('reset clears the journey but not the completed check-ins', async () => {
    const search = store.search('BOOKING_CODE', 'MAIA7K');
    flushSearch({ flights: [flightDto()] });
    await search;
    store.reset();
    expect(store.searchStatus()).toBe('idle');
    expect(store.flights()).toEqual([]);
  });
});
