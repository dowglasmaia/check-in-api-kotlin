import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from './icon';

export type AlertTone = 'info' | 'warn' | 'bad';

const TONES: Record<AlertTone, { box: string; icon: string }> = {
  info: { box: 'border-accent/25 bg-accent/10 text-neutral-200', icon: 'info' },
  warn: { box: 'border-warn/30 bg-warn/10 text-neutral-200', icon: 'warning' },
  bad: { box: 'border-bad/30 bg-bad/10 text-neutral-200', icon: 'warning-circle' },
};

@Component({
  selector: 'mf-alert',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.role]': 'tone() === "bad" ? "alert" : "status"',
  },
  template: `
    <i [mfIcon]="icon()" class="mt-0.5 shrink-0 text-lg"></i>
    <div class="min-w-0 text-sm leading-snug">
      @if (heading()) {
        <p class="font-medium text-ink">{{ heading() }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class Alert {
  readonly tone = input<AlertTone>('info');
  readonly heading = input('');

  protected readonly icon = computed(() => TONES[this.tone()].icon);
  protected readonly classes = computed(
    () => `flex gap-3 rounded-md border px-3.5 py-3 ${TONES[this.tone()].box}`,
  );
}
