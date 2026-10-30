import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { ChartComponent } from 'ng-apexcharts';
import { FlightView } from '../../model/flight';
import { FlightTimePipe } from '../flight-time.pipe';
import { buildProgressChart, countdownParts, windowProgress } from './chart-options';
import { prefersReducedMotion } from './reduced-motion';

const MINUTE = 60_000;

/** Ring with the share of the check-in window already used and a live countdown to departure. */
@Component({
  selector: 'app-window-progress-chart',
  imports: [ChartComponent, FlightTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="relative" role="img" [attr.aria-label]="summary()">
      <apx-chart
        [series]="$any(options().series)"
        [chart]="$any(options().chart)"
        [labels]="options().labels"
        [plotOptions]="options().plotOptions"
        [fill]="options().fill"
        [colors]="options().colors"
        [stroke]="options().stroke"
      />
      <div
        class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-2"
        aria-hidden="true"
      >
        @if (countdown().days > 0) {
          <p data-days class="text-sm font-medium text-accent-300">
            {{ countdown().days === 1 ? '1 day' : countdown().days + ' days' }}
          </p>
        }
        <p data-clock class="font-mono text-xl font-medium tabular-nums sm:text-2xl">
          {{ countdown().clock }}
        </p>
        <p class="mt-0.5 text-[11px] uppercase tracking-widest text-neutral-400">to departure</p>
      </div>
    </div>
    <p class="text-center text-xs text-neutral-400">
      @if (opened()) {
        Check-in opened {{ flight().checkinOpensAt | flightTime: 'opens' }} · {{ progress() }}% of
        the window has passed
      } @else {
        Check-in opens {{ flight().checkinOpensAt | flightTime: 'opens' }}
      }
    </p>
  `,
})
export class WindowProgressChart {
  readonly flight = input.required<FlightView>();

  private readonly clock = signal(new Date());
  /** Changes once a minute, so the ring is redrawn then and not on every tick of the countdown. */
  private readonly minute = computed(() => Math.floor(this.clock().getTime() / MINUTE));

  protected readonly options = computed(() =>
    buildProgressChart(this.flight(), new Date(this.minute() * MINUTE), prefersReducedMotion()),
  );
  protected readonly opened = computed(
    () => this.flight().checkinOpensAt.getTime() <= this.clock().getTime(),
  );
  protected readonly progress = computed(() =>
    windowProgress(this.flight(), new Date(this.minute() * MINUTE)),
  );
  protected readonly countdown = computed(() =>
    countdownParts(this.flight().departureTime.getTime() - this.clock().getTime()),
  );
  protected readonly summary = computed(
    () =>
      `${this.progress()}% of the check-in window for flight ${this.flight().displayNumber} has passed.`,
  );

  constructor() {
    const timer = setInterval(() => this.clock.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
