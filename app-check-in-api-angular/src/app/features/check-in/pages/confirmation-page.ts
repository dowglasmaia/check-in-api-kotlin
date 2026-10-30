import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Icon } from '../../../shared/ui/icon';
import { Skeleton } from '../../../shared/ui/skeleton';
import { CheckInFlowStore } from '../data-access/check-in-flow.store';
import { BoardingPass } from '../ui/boarding-pass';
import { JourneyChart } from '../ui/charts/journey-chart';
import { FlightTimePipe } from '../ui/flight-time.pipe';

@Component({
  selector: 'app-confirmation-page',
  imports: [Button, Card, Icon, Skeleton, BoardingPass, JourneyChart, FlightTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
      <section>
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          aria-hidden="true"
          class="animate-pop overflow-visible drop-shadow-[0_0_22px_color-mix(in_srgb,var(--color-accent)_55%,transparent)]"
        >
          <circle
            cx="48"
            cy="48"
            r="44"
            fill="color-mix(in srgb, var(--color-accent) 10%, transparent)"
            stroke="var(--color-accent)"
            stroke-width="1.5"
          />
          <path
            d="M30 49 L43 62 L67 36"
            fill="none"
            stroke="var(--color-accent-200)"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-dasharray="60"
            stroke-dashoffset="60"
            class="animate-draw"
          />
        </svg>

        <h1
          role="status"
          class="mb-3 mt-5 animate-rise font-heading text-4xl font-medium leading-[1.05] tracking-tighter [animation-delay:300ms] sm:text-5xl"
        >
          Check-in successfully completed!
        </h1>
        <p
          class="mb-6 max-w-[44ch] animate-rise text-base leading-relaxed text-neutral-300 [animation-delay:450ms]"
        >
          You're all set for {{ pass().flight.displayNumber }}. Head to gate
          <strong class="font-medium text-ink">{{ pass().boardingGate }}</strong> before boarding at
          <strong class="font-medium text-ink">{{ pass().boardingTime | flightTime }}</strong
          >.
        </p>
        <div class="flex animate-rise flex-wrap gap-2.5 [animation-delay:550ms]">
          <button mfBtn (click)="another()"><i mfIcon="plus"></i>Check in another flight</button>
          @if (store.flights().length) {
            <button mfBtn variant="ghost" (click)="toFlights()">Back to my flights</button>
          }
        </div>
      </section>

      <div
        class="flex max-w-110 animate-rise flex-col gap-5 [animation-delay:400ms] lg:justify-self-end"
      >
        <div>
          <p class="mb-2.5 text-[11px] uppercase tracking-widest text-neutral-500">
            Boarding pass · preview
          </p>
          <app-boarding-pass [pass]="pass()" />
        </div>

        <mf-card class="p-4 sm:p-5">
          <h2 class="text-xs uppercase tracking-widest text-neutral-400">Your timeline</h2>
          @defer (on viewport; prefetch on idle) {
            <app-journey-chart [pass]="pass()" />
          } @placeholder {
            <mf-skeleton class="mt-2 h-44" />
          }
        </mf-card>
      </div>
    </div>
  `,
})
export class ConfirmationPage {
  protected readonly store = inject(CheckInFlowStore);
  private readonly router = inject(Router);

  /** Guaranteed by `confirmationGuard`. */
  protected readonly pass = computed(() => this.store.boardingPass()!);

  protected another(): void {
    this.store.reset();
    void this.router.navigate(['/search']);
  }

  protected toFlights(): void {
    void this.router.navigate(['/flights']);
  }
}
