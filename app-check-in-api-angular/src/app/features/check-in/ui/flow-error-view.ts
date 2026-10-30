import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Button } from '../../../shared/ui/button';
import { Icon } from '../../../shared/ui/icon';
import { FlowError } from '../model/flow-error';
import { FlowErrorAction, FlowErrorContext, describeFlowError } from '../model/flow-error-copy';

const TONE_COLOR = {
  warn: 'var(--color-warn)',
  accent: 'var(--color-accent)',
  bad: 'var(--color-bad)',
  ok: 'var(--color-ok)',
} as const;

@Component({
  selector: 'app-flow-error-view',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block max-w-155 animate-rise', role: 'alert' },
  template: `
    <div
      class="grid size-16 place-items-center rounded-full border text-3xl"
      [style.color]="color()"
      [style.border-color]="'color-mix(in srgb, ' + color() + ' 50%, transparent)'"
      [style.background]="'color-mix(in srgb, ' + color() + ' 12%, transparent)'"
    >
      <i [mfIcon]="copy().icon"></i>
    </div>
    <p class="mb-2 mt-5 text-xs uppercase tracking-widest" [style.color]="color()">
      {{ copy().kicker }}
    </p>
    <h1 class="mb-3 font-heading text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
      {{ copy().title }}
    </h1>
    <p class="mb-5 text-base leading-relaxed text-neutral-300 text-pretty">{{ copy().body }}</p>

    <ul class="mb-6 flex flex-col gap-2.5">
      @for (tip of copy().tips; track tip) {
        <li class="flex gap-2.5 text-sm leading-snug text-neutral-200">
          <i mfIcon="arrow-bend-down-right" class="mt-0.5 shrink-0 text-accent-300"></i>{{ tip }}
        </li>
      }
    </ul>

    <div class="flex flex-wrap gap-2.5">
      <button mfBtn (click)="act.emit(copy().primary.action)">{{ copy().primary.label }}</button>
      <button mfBtn variant="ghost" (click)="act.emit(copy().secondary.action)">
        {{ copy().secondary.label }}
      </button>
    </div>

    @if (canResetDemo() && error().kind === 'already') {
      <div
        class="mt-6 flex max-w-md flex-col items-start gap-2 rounded-md border border-divider bg-surface p-4"
      >
        <p class="text-[13px] leading-snug text-neutral-300">
          <span class="font-medium text-ink">Testing?</span> The API keeps check-ins in memory, so
          the same passenger cannot check in twice. Reset the test data to repeat the flow.
        </p>
        <button mfBtn variant="secondary" (click)="resetDemo.emit()">
          <i mfIcon="arrow-counter-clockwise"></i>Reset test data
        </button>
      </div>
    }

    @if (error().requestId) {
      <p class="mt-6 text-xs text-neutral-500">
        Support code: <span class="font-mono">{{ error().requestId }}</span>
      </p>
    }
  `,
})
export class FlowErrorView {
  readonly error = input.required<FlowError>();
  readonly context = input.required<FlowErrorContext>();
  readonly act = output<FlowErrorAction>();
  /** Offered on "already checked in" while the API serves demo data. */
  readonly canResetDemo = input(false);
  readonly resetDemo = output<void>();

  protected readonly copy = computed(() => describeFlowError(this.error(), this.context()));
  protected readonly color = computed(() => TONE_COLOR[this.copy().tone]);
}
