import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Loading placeholder; size it with utility classes on the host (`<mf-skeleton class="h-4 w-24" />`). */
@Component({
  selector: 'mf-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block animate-shimmer rounded bg-neutral-800', 'aria-hidden': 'true' },
  template: '',
})
export class Skeleton {}
