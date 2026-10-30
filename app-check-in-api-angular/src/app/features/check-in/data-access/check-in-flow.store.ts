import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../../../core/http/api-error';
import { TestScenarios } from '../../test-data/public-api';
import { BoardingPassView, FlightView } from '../model/flight';
import { FlowError, errorFromCheckin, errorFromSearch } from '../model/flow-error';
import { SEARCH_TYPES, describeSearchValue } from '../model/search-type';
import { CheckinApi } from './checkin.api';
import { SearchType } from './checkin.dto';
import { toBoardingPass, toFlightView } from './checkin.mappers';

export type SearchStatus = 'idle' | 'loading' | 'done';

/**
 * State of one check-in journey (search → flight → confirmation), kept in memory only.
 * The typed document is never stored: only a masked label for display.
 */
@Injectable({ providedIn: 'root' })
export class CheckInFlowStore {
  private readonly api = inject(CheckinApi);
  private readonly demo = inject(TestScenarios);

  readonly searchType = signal<SearchType>('BOOKING_CODE');
  readonly searchLabel = signal('');
  readonly searchStatus = signal<SearchStatus>('idle');
  readonly flights = signal<FlightView[]>([]);
  /** Set by the API when the search identified the passenger (DOCUMENT). */
  readonly passengerId = signal<string | undefined>(undefined);
  readonly selected = signal<FlightView | undefined>(undefined);
  readonly confirming = signal(false);
  readonly boardingPass = signal<BoardingPassView | undefined>(undefined);
  readonly error = signal<FlowError | undefined>(undefined);

  private readonly completed = signal<ReadonlyMap<string, BoardingPassView>>(new Map());
  readonly checkedInFlightIds = computed<ReadonlySet<string>>(
    () => new Set(this.completed().keys()),
  );

  async search(type: SearchType, rawValue: string): Promise<void> {
    if (this.searchStatus() === 'loading') return;

    const config = SEARCH_TYPES[type];
    const value = config.normalize(rawValue);

    this.clearJourney();
    this.searchType.set(type);
    this.searchLabel.set(describeSearchValue(type, value));
    this.searchStatus.set('loading');

    try {
      const response = await firstValueFrom(this.api.searchFlights({ searchType: type, value }));
      this.flights.set(response.flights.map(toFlightView));
      this.passengerId.set(response.passengerId);
      if (response.flights.length === 0) {
        this.error.set({ kind: type === 'FLIGHT_NUMBER' ? 'notfound' : 'none' });
      }
    } catch (error) {
      this.error.set(errorFromSearch(toApiError(error)));
    } finally {
      this.searchStatus.set('done');
    }
  }

  /**
   * Every flight opens its details page; the page itself explains when check-in is not available
   * (not open yet, cancelled, closed) and never calls the API for those. Only a flight that was
   * already checked in during this journey goes to the error screen, which can show its boarding pass.
   */
  select(flight: FlightView): 'details' | 'error' {
    this.selected.set(flight);
    this.boardingPass.set(this.completed().get(flight.id));

    if (this.completed().has(flight.id)) return this.fail({ kind: 'already', flight });

    this.error.set(undefined);
    return 'details';
  }

  /** The API is the authority on every rule; the outcome only decides which screen comes next. */
  async confirm(manualPassengerId?: string): Promise<'confirmation' | 'error' | 'ignored'> {
    const flight = this.selected();
    const passengerId = this.passengerId() ?? manualPassengerId?.trim();
    if (!flight || !passengerId || this.confirming()) return 'ignored';

    this.confirming.set(true);
    try {
      const response = await firstValueFrom(
        this.api.performCheckin({ flightId: flight.id, passengerId }),
      );
      const pass = toBoardingPass(response, flight, passengerId, new Date());
      this.completed.update((map) => new Map(map).set(flight.id, pass));
      this.boardingPass.set(pass);
      this.error.set(undefined);
      return 'confirmation';
    } catch (error) {
      return this.fail(errorFromCheckin(toApiError(error), flight));
    } finally {
      this.confirming.set(false);
    }
  }

  /**
   * Starts a new search. Check-ins confirmed in this session are kept: the API remembers them too,
   * so the list keeps showing those flights as checked in instead of offering a confirmation that would fail.
   */
  reset(): void {
    this.clearJourney();
    this.searchStatus.set('idle');
    this.searchLabel.set('');
  }

  /** Drops the session check-ins too; used when the API forgot them (demo reset). */
  forgetCheckins(): void {
    this.completed.set(new Map());
    this.reset();
  }

  constructor() {
    effect(() => {
      const resets = this.demo.resetCount();
      untracked(() => {
        if (resets > 0) this.forgetCheckins();
      });
    });
  }

  private fail(error: FlowError): 'error' {
    this.error.set(error);
    return 'error';
  }

  private clearJourney(): void {
    this.flights.set([]);
    this.passengerId.set(undefined);
    this.selected.set(undefined);
    this.boardingPass.set(undefined);
    this.error.set(undefined);
  }
}
