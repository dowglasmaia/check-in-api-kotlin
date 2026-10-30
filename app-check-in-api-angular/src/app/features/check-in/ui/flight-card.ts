import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Icon } from '../../../shared/ui/icon';
import { cityOf } from '../model/airports';
import { FlightView } from '../model/flight';
import { FlightTimePipe } from './flight-time.pipe';
import { RouteLine } from './route-line';

interface CardState {
  tone: string;
  tagLabel: string;
  tagIcon: string;
  note: string;
  action: string;
  primary: boolean;
  muted: boolean;
}

@Component({
  selector: 'app-flight-card',
  imports: [Button, Card, Icon, RouteLine, FlightTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <mf-card
      elevation="sm"
      class="overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
      [class.opacity-85]="state().muted"
      [style.border-color]="
        state().muted ? 'color-mix(in srgb, ' + state().tone + ' 35%, transparent)' : null
      "
    >
      <div class="flex flex-col gap-4 p-4 sm:p-5">
        <div class="flex flex-wrap items-center justify-between gap-2.5">
          <div class="flex items-center gap-2 text-[13px] text-neutral-300">
            <i mfIcon="airplane" class="text-accent-300"></i>
            <strong class="font-medium tracking-wide text-ink">{{ flight().displayNumber }}</strong>
            <span class="text-neutral-500">·</span>
            {{ flight().departureTime | flightTime: 'day' }}
          </div>
          <span
            class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs"
            [style.color]="state().tone"
            [style.background]="'color-mix(in srgb, ' + state().tone + ' 14%, transparent)'"
            [style.border-color]="'color-mix(in srgb, ' + state().tone + ' 40%, transparent)'"
          >
            <i [mfIcon]="state().tagIcon" fill></i>{{ state().tagLabel }}
          </span>
        </div>

        <div class="flex items-center gap-3 sm:gap-5">
          <div>
            <p class="text-3xl font-medium leading-none tracking-tight sm:text-4xl">
              {{ flight().origin }}
            </p>
            <p class="mt-1 text-xs text-neutral-400">{{ origin() }}</p>
          </div>
          <app-route-line [color]="state().tone" />
          <div class="text-right">
            <p class="text-3xl font-medium leading-none tracking-tight sm:text-4xl">
              {{ flight().destination }}
            </p>
            <p class="mt-1 text-xs text-neutral-400">{{ destination() }}</p>
          </div>
        </div>
      </div>

      <div
        class="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-divider bg-canvas/50 px-4 py-3 sm:px-5"
      >
        <p class="flex items-center gap-2 text-[13px] text-neutral-300">
          <i mfIcon="clock"></i>Departs
          <strong class="font-medium text-ink">{{ flight().departureTime | flightTime }}</strong>
          <span class="text-neutral-500">· {{ state().note }}</span>
        </p>
        <button
          mfBtn
          [variant]="state().primary ? 'primary' : 'secondary'"
          (click)="choose.emit(flight())"
        >
          {{ state().action }}<i mfIcon="arrow-right"></i>
        </button>
      </div>
    </mf-card>
  `,
})
export class FlightCard {
  readonly flight = input.required<FlightView>();
  readonly checkedIn = input(false);
  readonly choose = output<FlightView>();

  protected readonly origin = computed(() => cityOf(this.flight().origin));
  protected readonly destination = computed(() => cityOf(this.flight().destination));

  protected readonly state = computed<CardState>(() => {
    const flight = this.flight();
    if (this.checkedIn()) {
      return {
        tone: 'var(--color-accent)',
        tagLabel: 'Checked in',
        tagIcon: 'seal-check',
        note: 'Already completed',
        action: 'View status',
        primary: false,
        muted: false,
      };
    }
    switch (flight.availability) {
      case 'cancelled':
        return {
          tone: 'var(--color-bad)',
          tagLabel: 'Cancelled',
          tagIcon: 'x-circle',
          note: 'This flight was cancelled',
          action: 'See options',
          primary: false,
          muted: true,
        };
      case 'not-open':
        return {
          tone: 'var(--color-warn)',
          tagLabel: 'Not yet available',
          tagIcon: 'clock',
          note: `Opens ${new FlightTimePipe().transform(flight.checkinOpensAt, 'opens')}`,
          action: 'Details',
          primary: false,
          muted: false,
        };
      case 'closed':
        return {
          tone: 'var(--color-warn)',
          tagLabel: 'Check-in closed',
          tagIcon: 'lock',
          note: 'Check-in is closed',
          action: 'Details',
          primary: false,
          muted: false,
        };
      default:
        return {
          tone: 'var(--color-ok)',
          tagLabel: 'Check-in available',
          tagIcon: 'check-circle',
          note: 'Check-in is open',
          action: 'Continue',
          primary: true,
          muted: false,
        };
    }
  });
}
