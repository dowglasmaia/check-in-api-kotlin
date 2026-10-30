import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TestScenarios } from '../../test-data/public-api';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Icon } from '../../../shared/ui/icon';
import { Alert } from '../../../shared/ui/alert';
import { Skeleton } from '../../../shared/ui/skeleton';
import { CheckInFlowStore } from '../data-access/check-in-flow.store';
import { cityOf } from '../model/airports';
import { FlightView } from '../model/flight';
import { FlowErrorKind } from '../model/flow-error';
import { describeFlowError } from '../model/flow-error-copy';
import { SEARCH_TYPES } from '../model/search-type';
import { WindowProgressChart } from '../ui/charts/window-progress-chart';
import { ConfirmPanel } from '../ui/confirm-panel';
import { FlightTimePipe } from '../ui/flight-time.pipe';
import { InfoGrid, InfoItem } from '../ui/info-grid';
import { JourneyStep, JourneyTimeline } from '../ui/journey-timeline';

@Component({
  selector: 'app-details-page',
  imports: [
    Alert,
    Button,
    Card,
    Icon,
    Skeleton,
    ConfirmPanel,
    InfoGrid,
    JourneyTimeline,
    WindowProgressChart,
    FlightTimePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './details-page.html',
})
export class DetailsPage {
  protected readonly store = inject(CheckInFlowStore);
  private readonly testScenarios = inject(TestScenarios);
  private readonly router = inject(Router);

  /** Guaranteed by `detailsGuard`. */
  protected readonly flight = computed(() => this.store.selected()!);
  protected readonly passengerSuggestions = computed(() =>
    this.testScenarios.passengersOf(this.flight().id),
  );
  protected readonly origin = computed(() => cityOf(this.flight().origin));
  protected readonly destination = computed(() => cityOf(this.flight().destination));

  private readonly time = new FlightTimePipe();

  /** Why check-in cannot be confirmed for this flight; undefined when it can. */
  protected readonly blocked = computed(() => {
    const flight = this.flight();
    const kinds: Record<string, FlowErrorKind> = {
      'not-open': 'window',
      cancelled: 'cancelled',
      closed: 'unavailable',
    };
    const kind = kinds[flight.availability];
    if (!kind) return undefined;
    const copy = describeFlowError(
      { kind, flight },
      {
        searchType: this.store.searchType(),
        searchLabel: this.store.searchLabel(),
        hasFlights: this.store.flights().length > 0,
        hasCheckin: false,
      },
    );
    const tone = copy.tone === 'bad' ? ('bad' as const) : ('warn' as const);
    return { title: copy.title, body: copy.body, tips: copy.tips, tone };
  });

  protected readonly showWindow = computed(
    () => this.flight().availability === 'available' || this.flight().availability === 'not-open',
  );

  protected readonly info = computed<InfoItem[]>(() => {
    const flight = this.flight();
    return [
      { icon: 'airplane', label: 'Flight', value: flight.displayNumber },
      {
        icon: 'calendar-blank',
        label: 'Date',
        value: this.time.transform(flight.departureTime, 'day'),
      },
      {
        icon: 'airplane-takeoff',
        label: 'Departure',
        value: this.time.transform(flight.departureTime),
      },
      {
        icon: 'users-three',
        label: 'Boarding',
        value: 'After check-in',
        color: 'var(--color-neutral-400)',
      },
      { icon: 'door', label: 'Gate', value: 'After check-in', color: 'var(--color-neutral-400)' },
      this.checkinInfo(flight),
    ];
  });

  protected readonly journey = computed<JourneyStep[]>(() => {
    const flight = this.flight();
    const via = SEARCH_TYPES[this.store.searchType()].label.toLowerCase();
    return [
      {
        icon: 'magnifying-glass',
        title: 'Reservation found',
        subtitle: `Flight located via ${via}`,
        state: 'done',
      },
      {
        icon: 'check-square',
        title: 'Check-in',
        subtitle: this.blocked()?.title ?? 'Confirm below — takes a few seconds',
        state: this.blocked() ? 'todo' : 'current',
      },
      {
        icon: 'users-three',
        title: 'Boarding',
        subtitle: 'Time and gate issued at check-in',
        state: 'todo',
      },
      {
        icon: 'airplane-takeoff',
        title: `Departure · ${this.time.transform(flight.departureTime)}`,
        subtitle: `${this.origin()} (${flight.origin})`.trim(),
        state: 'todo',
      },
      {
        icon: 'airplane-landing',
        title: 'Arrival',
        subtitle: `${this.destination()} (${flight.destination})`.trim(),
        state: 'todo',
      },
    ];
  });

  private checkinInfo(flight: FlightView): InfoItem {
    switch (flight.availability) {
      case 'available':
        return { icon: 'check-circle', label: 'Check-in', value: 'Open', color: 'var(--color-ok)' };
      case 'not-open':
        return {
          icon: 'clock',
          label: 'Check-in',
          value: `Opens ${this.time.transform(flight.checkinOpensAt, 'opens')}`,
          color: 'var(--color-warn)',
        };
      case 'cancelled':
        return {
          icon: 'x-circle',
          label: 'Check-in',
          value: 'Cancelled',
          color: 'var(--color-bad)',
        };
      default:
        return { icon: 'lock', label: 'Check-in', value: 'Closed', color: 'var(--color-warn)' };
    }
  }

  protected back(): void {
    void this.router.navigate(['/flights']);
  }

  protected async confirm(passengerCode: string | undefined): Promise<void> {
    const outcome = await this.store.confirm(passengerCode);
    if (outcome === 'confirmation') await this.router.navigate(['/confirmation']);
    else if (outcome === 'error') await this.router.navigate(['/error']);
  }
}
