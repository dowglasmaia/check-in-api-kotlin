import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Icon } from '../../../shared/ui/icon';
import { Tag } from '../../../shared/ui/tag';
import { Scenario } from '../data-access/test-data.api';

const TYPE_LABEL: Record<Scenario['searchType'], string> = {
  FLIGHT_NUMBER: 'Flight number',
  BOOKING_CODE: 'Booking code',
  DOCUMENT: 'Document',
};

@Component({
  selector: 'app-scenario-card',
  imports: [Button, Card, Icon, Tag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mf-card class="flex h-full flex-col gap-3 p-5">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-base font-medium">{{ scenario().label }}</h3>
        <mf-tag tone="outline" class="shrink-0 whitespace-nowrap">{{ typeLabel() }}</mf-tag>
      </div>
      <p class="font-mono text-lg tracking-wide text-accent-200">{{ scenario().value }}</p>
      <p class="text-sm text-neutral-300">
        <i mfIcon="arrow-bend-down-right" class="mr-1 text-accent-300"></i
        >{{ scenario().expectedOutcome }}
      </p>
      @if (scenario().note) {
        <p class="text-xs text-neutral-400">{{ scenario().note }}</p>
      }
      <button mfBtn class="mt-auto self-start" (click)="use.emit(scenario())">
        Use this scenario <i mfIcon="arrow-right"></i>
      </button>
    </mf-card>
  `,
})
export class ScenarioCard {
  readonly scenario = input.required<Scenario>();
  readonly use = output<Scenario>();

  protected typeLabel(): string {
    return TYPE_LABEL[this.scenario().searchType];
  }
}
