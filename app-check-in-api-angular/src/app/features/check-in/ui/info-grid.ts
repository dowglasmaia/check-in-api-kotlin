import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../../../shared/ui/icon';

export interface InfoItem {
  icon: string;
  label: string;
  value: string;
  /** CSS color for the value; defaults to the text color. */
  color?: string;
}

@Component({
  selector: 'app-info-grid',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid grid-cols-2 gap-px overflow-hidden rounded-md bg-divider sm:grid-cols-3' },
  template: `
    @for (item of items(); track item.label) {
      <div class="bg-surface px-3.5 py-3">
        <p class="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-neutral-500">
          <i [mfIcon]="item.icon"></i>{{ item.label }}
        </p>
        <p class="mt-1 text-base" [style.color]="item.color ?? null">{{ item.value }}</p>
      </div>
    }
  `,
})
export class InfoGrid {
  readonly items = input.required<InfoItem[]>();
}
