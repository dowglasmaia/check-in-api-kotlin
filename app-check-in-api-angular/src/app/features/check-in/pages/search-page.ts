import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SCENARIO_PREFILL_STATE, ScenarioPrefill, TestScenarios } from '../../test-data/public-api';
import { CheckInFlowStore } from '../data-access/check-in-flow.store';
import { HeroArt } from '../ui/hero-art';
import { SearchForm, SearchRequest } from '../ui/search-form';

const TRY_CHIPS = 3;

@Component({
  selector: 'app-search-page',
  imports: [SearchForm, HeroArt],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid animate-rise items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
      <section>
        <p class="flex items-center gap-2.5 text-xs uppercase tracking-[0.14em] text-accent-300">
          <span class="h-px w-7 bg-accent"></span>Digital check-in
        </p>
        <h1
          class="mb-4 mt-4 font-heading text-5xl font-medium leading-[1.02] tracking-tighter sm:text-6xl lg:text-7xl"
        >
          Your journey<br />starts here.
        </h1>
        <p class="mb-7 max-w-[46ch] text-base leading-relaxed text-neutral-300 text-pretty">
          Check in online in under a minute. Tell us how to find your reservation, pick your flight
          and get your boarding gate and time — no queues, no paper.
        </p>
        <app-search-form
          [loading]="store.searchStatus() === 'loading'"
          [scenarios]="chips()"
          [initial]="prefill"
          (submitted)="search($event)"
        />
      </section>

      <app-hero-art class="hidden lg:block" />
    </div>
  `,
})
export class SearchPage {
  protected readonly store = inject(CheckInFlowStore);
  private readonly router = inject(Router);
  private readonly testScenarios = inject(TestScenarios);

  /** A scenario picked on the test-data page arrives through the router navigation state, never the URL. */
  protected readonly prefill = readPrefill();
  protected readonly chips = computed(() => this.testScenarios.scenarios().slice(0, TRY_CHIPS));

  protected search(request: SearchRequest): void {
    void this.store.search(request.searchType, request.value);
    void this.router.navigate(['/flights']);
  }
}

function readPrefill(): SearchRequest | undefined {
  const state = history.state as Record<string, unknown> | null;
  const prefill = state?.[SCENARIO_PREFILL_STATE] as ScenarioPrefill | undefined;
  return prefill ? { searchType: prefill.searchType, value: prefill.value } : undefined;
}
