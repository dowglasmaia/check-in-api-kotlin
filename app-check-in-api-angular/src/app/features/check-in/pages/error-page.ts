import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SCENARIO_PREFILL_STATE, TestScenarios } from '../../test-data/public-api';
import { CheckInFlowStore } from '../data-access/check-in-flow.store';
import { FlowErrorAction, FlowErrorContext } from '../model/flow-error-copy';
import { FlowErrorView } from '../ui/flow-error-view';

@Component({
  selector: 'app-error-page',
  imports: [FlowErrorView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-flow-error-view
    [error]="error()"
    [context]="context()"
    [canResetDemo]="demo.available()"
    (act)="handle($event)"
    (resetDemo)="resetDemo()"
  />`,
})
export class ErrorPage {
  private readonly store = inject(CheckInFlowStore);
  private readonly router = inject(Router);
  protected readonly demo = inject(TestScenarios);

  /** Guaranteed by `errorGuard`. */
  protected readonly error = computed(() => this.store.error()!);
  protected readonly context = computed<FlowErrorContext>(() => ({
    searchType: this.store.searchType(),
    searchLabel: this.store.searchLabel(),
    hasFlights: this.store.flights().length > 0,
    hasCheckin: !!this.store.boardingPass(),
  }));

  protected async resetDemo(): Promise<void> {
    if (!(await this.demo.resetData())) return;
    this.store.forgetCheckins();
    await this.router.navigate(['/search']);
  }

  protected async handle(action: FlowErrorAction): Promise<void> {
    switch (action) {
      case 'edit-search':
        await this.router.navigate(['/search']);
        break;
      case 'new-search':
        this.store.reset();
        await this.router.navigate(['/search']);
        break;
      case 'back-to-flights':
        await this.router.navigate(this.store.flights().length ? ['/flights'] : ['/search']);
        break;
      case 'use-booking-code':
        await this.router.navigate(['/search'], {
          state: { [SCENARIO_PREFILL_STATE]: { searchType: 'BOOKING_CODE', value: '' } },
        });
        break;
      case 'view-checkin':
        await this.router.navigate(['/confirmation']);
        break;
      case 'try-again': {
        const flight = this.error().flight;
        await this.router.navigate(flight ? ['/flights', flight.id] : ['/search']);
        break;
      }
    }
  }
}
