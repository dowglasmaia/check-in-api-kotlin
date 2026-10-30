import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../shared/ui/button';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-xl animate-rise py-10">
      <p class="text-6xl font-medium text-accent">404</p>
      <h1 class="mt-3 font-heading text-3xl font-medium tracking-tight">Page not found</h1>
      <p class="mt-2 text-neutral-300">The page you are looking for does not exist.</p>
      <a mfBtn routerLink="/search" class="mt-6">Go to flight search</a>
    </section>
  `,
})
export class NotFound {}
