import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartComponent } from 'ng-apexcharts';
import { FlightView } from '../../model/flight';
import { buildWindowsChart } from './chart-options';
import { prefersReducedMotion } from './reduced-motion';

@Component({
  selector: 'app-check-in-windows-chart',
  imports: [ChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div role="img" [attr.aria-label]="summary()">
      <apx-chart
        [series]="$any(options().series)"
        [chart]="$any(options().chart)"
        [plotOptions]="options().plotOptions"
        [xaxis]="options().xaxis"
        [yaxis]="options().yaxis"
        [grid]="options().grid"
        [dataLabels]="options().dataLabels"
        [legend]="options().legend"
        [annotations]="options().annotations"
        [tooltip]="options().tooltip"
      />
    </div>
  `,
})
export class CheckInWindowsChart {
  readonly flights = input.required<FlightView[]>();
  readonly now = input(new Date());

  protected readonly options = computed(() =>
    buildWindowsChart(this.flights(), this.now(), prefersReducedMotion()),
  );
  protected readonly summary = computed(
    () =>
      `Check-in windows for ${this.flights().length} flight(s), from the moment check-in opens until departure.`,
  );
}
