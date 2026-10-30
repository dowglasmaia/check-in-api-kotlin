import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Alert } from '../../../shared/ui/alert';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Icon } from '../../../shared/ui/icon';
import { Skeleton } from '../../../shared/ui/skeleton';
import { SCENARIO_PREFILL_STATE, ScenarioPrefill } from '../public-api';
import { Scenario, TestScenarios } from '../data-access/test-data.api';
import { ScenarioCard } from '../ui/scenario-card';

@Component({
  selector: 'app-test-data-page',
  imports: [Alert, Button, Card, Icon, RouterLink, ScenarioCard, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="animate-rise">
      <h1 class="font-heading text-4xl font-medium tracking-tight">Test data</h1>
      <p class="mt-2 max-w-2xl text-neutral-300">
        Ready-made searches to walk through every screen of the check-in flow.
      </p>

      <mf-alert
        tone="warn"
        heading="Fictitious data — for flow testing only"
        class="mt-5 max-w-2xl"
      >
        Names, documents and codes below do not belong to real people. Never enter real personal
        data.
      </mf-alert>

      @if (testScenarios.available()) {
        <mf-card
          class="mt-6 flex max-w-2xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <p class="text-sm leading-snug text-neutral-300">
            <span class="font-medium text-ink">Repeating the flow?</span> The API remembers every
            check-in, so the same passenger cannot check in twice. Reset to start from a clean
            slate.
          </p>
          <button
            mfBtn
            variant="secondary"
            class="shrink-0"
            [loading]="resetting()"
            (click)="reset()"
          >
            <i mfIcon="arrow-counter-clockwise"></i>Reset test data
          </button>
        </mf-card>
        @if (resetResult(); as result) {
          <mf-alert [tone]="result === 'done' ? 'info' : 'bad'" class="mt-3 max-w-2xl">
            {{
              result === 'done'
                ? 'All check-ins were removed. You can run the flow again.'
                : 'Could not reset the test data. Try again.'
            }}
          </mf-alert>
        }

        <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (scenario of testScenarios.scenarios(); track scenario.label) {
            <li><app-scenario-card [scenario]="scenario" (use)="useScenario($event)" /></li>
          }
        </ul>
      } @else if (testScenarios.loading()) {
        <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3]; track i) {
            <mf-skeleton class="h-40" />
          }
        </div>
      } @else {
        <mf-alert tone="info" heading="Test data is not available" class="mt-6 max-w-2xl">
          The API does not expose demo scenarios (they may be disabled in this environment).
          <a routerLink="/search" class="underline">Back to the search</a>
        </mf-alert>
      }
    </section>
  `,
})
export class TestDataPage {
  protected readonly testScenarios = inject(TestScenarios);
  private readonly router = inject(Router);

  protected readonly resetting = signal(false);
  protected readonly resetResult = signal<'done' | 'failed' | undefined>(undefined);

  protected async reset(): Promise<void> {
    if (this.resetting()) return;
    this.resetting.set(true);
    this.resetResult.set(undefined);
    this.resetResult.set((await this.testScenarios.resetData()) ? 'done' : 'failed');
    this.resetting.set(false);
  }

  protected useScenario(scenario: Scenario): void {
    const prefill: ScenarioPrefill = { searchType: scenario.searchType, value: scenario.value };
    void this.router.navigate(['/search'], { state: { [SCENARIO_PREFILL_STATE]: prefill } });
  }
}
