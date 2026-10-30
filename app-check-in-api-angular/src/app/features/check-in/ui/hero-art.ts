import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../../../shared/ui/icon';

/** Decorative route map for the landing screen. */
@Component({
  selector: 'app-hero-art',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'relative block aspect-square overflow-hidden rounded-lg border border-divider bg-[radial-gradient(70%_60%_at_70%_20%,color-mix(in_srgb,var(--color-accent)_22%,transparent),transparent_70%),linear-gradient(160deg,var(--color-surface),var(--color-canvas))]',
    'aria-hidden': 'true',
  },
  template: `
    <svg viewBox="0 0 400 410" class="absolute inset-0 size-full">
      <g stroke="var(--color-neutral-800)" stroke-width="1" fill="none" opacity=".7">
        <circle cx="200" cy="205" r="70" />
        <circle cx="200" cy="205" r="130" />
        <circle cx="200" cy="205" r="190" />
      </g>
      <path
        d="M70 320 C 120 120, 280 60, 336 110"
        fill="none"
        stroke="var(--color-accent)"
        stroke-width="1.5"
        stroke-dasharray="3 7"
        class="animate-dash"
      />
      <path
        d="M70 320 C 150 340, 250 300, 300 250"
        fill="none"
        stroke="var(--color-neutral-600)"
        stroke-width="1"
        stroke-dasharray="2 6"
        opacity=".6"
      />
      <circle cx="70" cy="320" r="5" fill="var(--color-accent)" />
      <circle cx="70" cy="320" r="12" fill="none" stroke="var(--color-accent)" opacity=".4" />
      <circle cx="336" cy="110" r="5" fill="var(--color-accent-300)" />
      <circle cx="300" cy="250" r="3.5" fill="var(--color-neutral-400)" />
    </svg>
    <i
      mfIcon="airplane-tilt"
      fill
      class="absolute left-[46%] top-[20%] rotate-18 text-[34px] text-accent-200 drop-shadow-[0_0_14px_var(--color-accent)]"
    ></i>
    <div class="absolute bottom-[8%] left-[6%] text-xs text-neutral-300">
      <div class="text-3xl font-medium tracking-tight text-ink">GRU</div>
      São Paulo
    </div>
    <div class="absolute right-[8%] top-[8%] text-right text-xs text-neutral-300">
      <div class="text-3xl font-medium tracking-tight text-ink">LIS</div>
      Lisbon
    </div>
    <div class="absolute bottom-[8%] right-[8%] text-right text-xs text-neutral-400">
      <div class="text-lg font-medium text-neutral-200">SSA</div>
      Salvador
    </div>
  `,
})
export class HeroArt {}
