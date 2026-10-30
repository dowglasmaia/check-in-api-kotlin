import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

export const STEPS = ['Find', 'Choose', 'Confirm', 'Boarding pass'] as const;

/** Reads `data.step` (0-based) from the deepest activated route; routes without it hide the stepper. */
@Component({
  selector: 'app-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (current() >= 0) {
      <nav
        class="mx-auto flex w-full max-w-6xl items-center gap-2 px-5 text-xs sm:gap-3.5 sm:px-12"
        aria-label="Progress"
      >
        <ol class="flex w-full items-center gap-2 sm:gap-3.5">
          @for (step of steps; track step; let i = $index; let last = $last) {
            <li
              class="flex min-w-0 items-center gap-2"
              [class]="last ? 'flex-none' : 'flex-1'"
              [attr.aria-current]="i === current() ? 'step' : null"
            >
              <span
                class="grid size-[22px] flex-none place-items-center rounded-full border text-[11px] transition-colors"
                [class]="
                  i < current()
                    ? 'border-accent bg-accent text-canvas'
                    : i === current()
                      ? 'border-accent text-accent-200'
                      : 'border-neutral-700 text-neutral-500'
                "
              >
                {{ i < current() ? '✓' : i + 1 }}
              </span>
              <span
                class="whitespace-nowrap"
                [class]="[
                  i === current()
                    ? 'text-ink'
                    : i < current()
                      ? 'text-neutral-300'
                      : 'text-neutral-500',
                  i === current() ? '' : 'hidden sm:inline',
                ]"
              >
                {{ step }}
              </span>
              @if (!last) {
                <span
                  class="h-px min-w-2 flex-1"
                  [style.background]="
                    'linear-gradient(90deg, ' +
                    (i < current() ? 'var(--color-accent)' : 'var(--color-neutral-700)') +
                    ', transparent)'
                  "
                ></span>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
})
export class Stepper {
  private readonly router = inject(Router);

  protected readonly steps = STEPS;
  protected readonly current = computed(() => this.step());

  private readonly step = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.readStep()),
    ),
    { initialValue: -1 },
  );

  private readStep(): number {
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let step = -1;
    while (route) {
      const value = route.data['step'];
      if (typeof value === 'number') step = value;
      route = route.firstChild;
    }
    return step;
  }
}
