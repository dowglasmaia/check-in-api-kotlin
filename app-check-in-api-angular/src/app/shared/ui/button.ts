import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
} from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-45 cursor-pointer';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'border-accent bg-transparent text-accent-100 hover:bg-accent/15 active:bg-accent/25',
  secondary:
    'border-neutral-700 bg-transparent text-neutral-200 hover:border-neutral-500 hover:bg-neutral-700/20 active:bg-neutral-700/40',
  ghost:
    'border-transparent bg-transparent text-neutral-300 hover:bg-neutral-700/25 active:bg-neutral-700/40',
};

/** Outlined action, as in the Nocturne design system. `loading` shows a spinner and blocks interaction. */
@Component({
  selector: 'button[mfBtn], a[mfBtn]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.disabled]': 'loading() || disabled() ? "" : null',
    '[attr.aria-busy]': 'loading() ? "true" : null',
  },
  template: `
    @if (loading()) {
      <span
        class="size-4 animate-spin-fast rounded-full border-2 border-accent-800 border-t-accent"
        aria-hidden="true"
      ></span>
    }
    <ng-content />
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly block = input(false, { transform: booleanAttribute });
  readonly large = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  /** Declared as an input because the host binding above would otherwise drop a static `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() =>
    [
      BASE,
      VARIANTS[this.variant()],
      this.block() ? 'w-full' : '',
      this.large() ? 'h-11 text-[15px]' : '',
    ].join(' '),
  );
}
