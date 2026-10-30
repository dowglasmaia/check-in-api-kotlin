import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TestScenarios } from '../../features/test-data/public-api';
import { Button } from '../../shared/ui/button';
import { Icon } from '../../shared/ui/icon';
import { Tag } from '../../shared/ui/tag';
import { SiteFooter } from './site-footer';
import { Stepper } from './stepper';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Stepper, SiteFooter, Button, Icon, Tag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly testScenarios = inject(TestScenarios);
  private readonly helpDialog = viewChild.required<ElementRef<HTMLDialogElement>>('helpDialog');

  protected openHelp(): void {
    this.helpDialog().nativeElement.showModal();
  }

  protected closeHelp(): void {
    this.helpDialog().nativeElement.close();
  }
}
