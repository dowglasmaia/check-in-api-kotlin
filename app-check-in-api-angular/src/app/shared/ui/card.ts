import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type CardElevation = 'none' | 'sm' | 'md' | 'lg';

const ELEVATION: Record<CardElevation, string> = {
  none: '',
  sm: 'shadow-elev-sm',
  md: 'shadow-elev-md',
  lg: 'shadow-elev-lg',
};

@Component({
  selector: 'mf-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
  template: '<ng-content />',
})
export class Card {
  readonly elevation = input<CardElevation>('none');

  protected readonly classes = computed(
    () => `block rounded-lg border border-divider bg-surface ${ELEVATION[this.elevation()]}`,
  );
}
