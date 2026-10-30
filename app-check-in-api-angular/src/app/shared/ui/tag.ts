import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type TagTone = 'accent' | 'neutral' | 'outline' | 'ok' | 'warn' | 'bad';

const TONES: Record<TagTone, string> = {
  accent: 'border-accent/40 bg-accent/15 text-accent-200',
  neutral: 'border-transparent bg-neutral-700/30 text-neutral-300',
  outline: 'border-neutral-700 text-neutral-300',
  ok: 'border-ok/40 bg-ok/15 text-ok',
  warn: 'border-warn/40 bg-warn/15 text-warn',
  bad: 'border-bad/40 bg-bad/15 text-bad',
};

@Component({
  selector: 'mf-tag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
  template: '<ng-content />',
})
export class Tag {
  readonly tone = input<TagTone>('neutral');

  protected readonly classes = computed(
    () =>
      `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${TONES[this.tone()]}`,
  );
}
