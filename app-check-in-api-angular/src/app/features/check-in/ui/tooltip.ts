import { Directive, input } from '@angular/core';

/** CSS-only tooltip: `<button mfTooltip="Copy">`. Shown on hover and keyboard focus. */
@Directive({
  selector: '[mfTooltip]',
  host: {
    class:
      'relative after:pointer-events-none after:absolute after:bottom-full after:left-1/2 after:mb-1.5 after:-translate-x-1/2 after:whitespace-nowrap after:rounded-sm after:bg-neutral-100 after:px-2 after:py-1 after:text-xs after:text-canvas after:opacity-0 after:transition-opacity after:content-[attr(data-tip)] hover:after:opacity-100 focus-visible:after:opacity-100',
    '[attr.data-tip]': 'mfTooltip()',
  },
})
export class Tooltip {
  readonly mfTooltip = input.required<string>();
}
