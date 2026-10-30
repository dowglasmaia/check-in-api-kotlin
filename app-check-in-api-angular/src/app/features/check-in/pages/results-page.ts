import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Icon } from '../../../shared/ui/icon';
import { Skeleton } from '../../../shared/ui/skeleton';
import { CheckInFlowStore } from '../data-access/check-in-flow.store';
import { FlightView } from '../model/flight';
import { SEARCH_TYPES } from '../model/search-type';
import { CheckInWindowsChart } from '../ui/charts/check-in-windows-chart';
import { FlightCard } from '../ui/flight-card';

@Component({
  selector: 'app-results-page',
  imports: [Button, Card, Icon, Skeleton, FlightCard, CheckInWindowsChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.searchStatus() === 'loading') {
      <section class="flex max-w-190 flex-col gap-3.5" role="status" aria-live="polite">
        <p class="flex items-center gap-3 text-[15px] text-neutral-200">
          <span
            class="size-4.5 animate-spin-fast rounded-full border-2 border-accent-800 border-t-accent"
          ></span>
          Searching for your flights…
        </p>
        @for (delay of [0, 200]; track delay) {
          <mf-card
            class="flex animate-shimmer flex-col gap-3.5 p-5"
            [style.animation-delay.ms]="delay"
          >
            <div class="flex justify-between">
              <mf-skeleton class="h-3.5 w-22" /><mf-skeleton class="h-5.5 w-28 rounded-full" />
            </div>
            <div class="flex items-center gap-4">
              <mf-skeleton class="h-8.5 w-18" /><mf-skeleton class="h-0.5 flex-1" /><mf-skeleton
                class="h-8.5 w-18"
              />
            </div>
          </mf-card>
        }
      </section>
    } @else {
      <section class="max-w-205 animate-rise">
        <button mfBtn variant="ghost" class="-ml-2 px-2 py-1 text-[13px]" (click)="newSearch()">
          <i mfIcon="arrow-left"></i>New search
        </button>
        <h1 class="mb-1.5 mt-2.5 font-heading text-3xl font-medium tracking-tight sm:text-4xl">
          {{
            store.flights().length === 1
              ? '1 flight found'
              : store.flights().length + ' flights found'
          }}
        </h1>
        <p class="mb-5 text-sm text-neutral-400">
          {{ typeLabel() }} · <span class="text-neutral-200">{{ store.searchLabel() }}</span> —
          choose the flight you want to check in for.
        </p>

        <ul class="flex flex-col gap-3.5">
          @for (flight of store.flights(); track flight.id; let i = $index) {
            <li class="animate-rise" [style.animation-delay.ms]="i * 70">
              <app-flight-card
                [flight]="flight"
                [checkedIn]="store.checkedInFlightIds().has(flight.id)"
                (choose)="choose($event)"
              />
            </li>
          }
        </ul>

        @if (store.flights().length) {
          <mf-card class="mt-6 p-4 sm:p-5">
            <h2 class="text-xs uppercase tracking-widest text-neutral-400">Check-in windows</h2>
            <p class="mb-2 mt-1 text-[13px] text-neutral-400">
              When check-in opens and closes for each flight.
            </p>
            @defer (on viewport; prefetch on idle) {
              <app-check-in-windows-chart [flights]="store.flights()" [now]="now()" />
            } @placeholder {
              <mf-skeleton class="h-32" />
            }
          </mf-card>
        }
      </section>
    }
  `,
})
export class ResultsPage {
  protected readonly store = inject(CheckInFlowStore);
  private readonly router = inject(Router);

  protected readonly now = signal(new Date());

  constructor() {
    effect(() => {
      // Only a failed search leaves the list empty; an error about a selected flight must not trap the user here.
      if (
        this.store.searchStatus() === 'done' &&
        this.store.error() &&
        this.store.flights().length === 0
      ) {
        void this.router.navigate(['/error'], { replaceUrl: true });
      }
    });
  }

  protected typeLabel(): string {
    return SEARCH_TYPES[this.store.searchType()].label;
  }

  protected choose(flight: FlightView): void {
    const next = this.store.select(flight);
    void this.router.navigate(next === 'details' ? ['/flights', flight.id] : ['/error']);
  }

  protected newSearch(): void {
    this.store.reset();
    void this.router.navigate(['/search']);
  }
}
