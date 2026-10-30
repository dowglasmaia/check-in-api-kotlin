import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../../../shared/ui/icon';

export type JourneyState = 'done' | 'current' | 'todo';

export interface JourneyStep {
  icon: string;
  title: string;
  subtitle: string;
  state: JourneyState;
}

@Component({
  selector: 'app-journey-timeline',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ol class="flex flex-col">
      @for (step of steps(); track step.title; let last = $last) {
        <li class="flex gap-3.5" [attr.aria-current]="step.state === 'current' ? 'step' : null">
          <div class="flex flex-col items-center">
            <span
              class="grid size-7 flex-none place-items-center rounded-full border text-sm"
              [class]="
                step.state === 'done'
                  ? 'border-accent bg-accent text-canvas'
                  : step.state === 'current'
                    ? 'border-accent bg-accent/20 text-accent-200'
                    : 'border-neutral-700 text-neutral-500'
              "
            >
              <i [mfIcon]="step.state === 'done' ? 'check' : step.icon"></i>
            </span>
            @if (!last) {
              <span
                class="min-h-4.5 w-px flex-1"
                [class]="step.state === 'done' ? 'bg-accent' : 'bg-neutral-700'"
              ></span>
            }
          </div>
          <div class="min-w-0" [class.pb-3.5]="!last">
            <p
              class="text-[15px]"
              [class]="step.state === 'todo' ? 'text-neutral-300' : 'text-ink'"
            >
              {{ step.title }}
            </p>
            <p class="mt-0.5 text-[13px] text-neutral-400">{{ step.subtitle }}</p>
          </div>
        </li>
      }
    </ol>
  `,
})
export class JourneyTimeline {
  readonly steps = input.required<JourneyStep[]>();
}
