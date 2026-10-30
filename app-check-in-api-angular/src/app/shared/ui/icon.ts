import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
} from '@angular/core';

/** Phosphor icon: `<i mfIcon="airplane-tilt" fill></i>`. Decorative unless a label is provided by the parent. */
@Component({
  selector: 'i[mfIcon]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', 'aria-hidden': 'true' },
  template: '',
})
export class Icon {
  readonly mfIcon = input.required<string>();
  readonly fill = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(
    () => `${this.fill() ? 'ph-fill' : 'ph'} ph-${this.mfIcon()} leading-none`,
  );
}
