import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Button } from '../../../shared/ui/button';
import { Icon } from '../../../shared/ui/icon';
import { Tooltip } from './tooltip';

@Component({
  selector: 'app-copy-code',
  imports: [Button, Icon, Tooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      mfBtn
      variant="ghost"
      class="px-2"
      [mfTooltip]="copied() ? 'Copied' : 'Copy code'"
      aria-label="Copy confirmation code"
      (click)="copy()"
    >
      <i [mfIcon]="copied() ? 'check' : 'copy'" class="text-lg"></i>
    </button>
    <span class="sr-only" role="status">{{ copied() ? 'Confirmation code copied' : '' }}</span>
  `,
})
export class CopyCode {
  readonly text = input.required<string>();
  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.text());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      this.copied.set(false);
    }
  }
}
