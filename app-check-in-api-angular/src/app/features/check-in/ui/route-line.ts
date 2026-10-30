import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../../../shared/ui/icon';

/** Origin and destination with a line and a plane between them. */
@Component({
  selector: 'app-route-line',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-w-8 flex-1 items-center gap-2 text-neutral-500', 'aria-hidden': 'true' },
  template: `
    <span class="h-px flex-1 bg-linear-to-r from-transparent to-neutral-600"></span>
    <i mfIcon="airplane-tilt" fill class="rotate-90" [style.color]="color()"></i>
    <span class="h-px flex-1 bg-linear-to-l from-transparent to-neutral-600"></span>
  `,
})
export class RouteLine {
  readonly color = input('var(--color-accent-300)');
}
