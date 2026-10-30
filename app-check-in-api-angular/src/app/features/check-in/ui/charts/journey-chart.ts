import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartComponent } from 'ng-apexcharts';
import { BoardingPassView } from '../../model/flight';
import { buildJourneyChart } from './chart-options';
import { prefersReducedMotion } from './reduced-motion';

@Component({
  selector: 'app-journey-chart',
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
        [tooltip]="options().tooltip"
      />
    </div>
  `,
})
export class JourneyChart {
  readonly pass = input.required<BoardingPassView>();

  protected readonly options = computed(() =>
    buildJourneyChart(this.pass(), prefersReducedMotion()),
  );
  protected readonly summary = computed(
    () => `Timeline from check-in to boarding gate ${this.pass().boardingGate} and departure.`,
  );
}
