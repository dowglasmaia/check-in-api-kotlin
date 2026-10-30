import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../../shared/ui/icon';
import { Tag } from '../../shared/ui/tag';

interface ProfileLink {
  label: string;
  handle: string;
  href: string;
  icon: string;
  fill: boolean;
}

export const DEVELOPER = {
  name: 'Dowglas Maia',
  role: 'Senior Java Engineer',
  initials: 'DM',
} as const;

export const PROFILE_LINKS: readonly ProfileLink[] = [
  {
    label: 'LinkedIn',
    handle: 'in/dowglasmaia',
    href: 'https://www.linkedin.com/in/dowglasmaia/',
    icon: 'linkedin-logo',
    fill: true,
  },
  {
    label: 'GitHub',
    handle: 'dowglasmaia',
    href: 'https://github.com/dowglasmaia',
    icon: 'github-logo',
    fill: true,
  },
  {
    label: 'Malt',
    handle: 'dowglasmaia',
    href: 'https://www.malt.com/profile/dowglasmaia',
    icon: 'briefcase',
    fill: false,
  },
];

/** What this prototype is built with, for the "references" column. */
export const STACK: readonly string[] = [
  'Angular 21',
  'Tailwind CSS 4',
  'ApexCharts',
  'Kotlin',
  'Spring Boot 4',
  'OpenAPI',
];

@Component({
  selector: 'app-site-footer',
  imports: [Icon, Tag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block print:hidden' },
  template: `
    <footer class="mx-auto w-full max-w-6xl px-5 pb-8 pt-4 sm:px-12">
      <div
        class="h-px w-full bg-linear-to-r from-transparent via-accent/50 to-transparent"
        aria-hidden="true"
      ></div>

      <div class="grid gap-8 py-8 md:grid-cols-[1.2fr_1fr_1fr] md:gap-10">
        <section aria-labelledby="footer-author" class="flex items-start gap-4">
          <span
            class="grid size-12 shrink-0 place-items-center rounded-full border border-accent bg-accent/10 text-base font-medium text-accent-200 shadow-[0_0_22px_color-mix(in_srgb,var(--color-accent)_30%,transparent)]"
            aria-hidden="true"
          >
            {{ developer.initials }}
          </span>
          <div class="min-w-0">
            <p class="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
              Designed &amp; developed by
            </p>
            <h2 id="footer-author" class="mt-1 text-lg font-medium tracking-tight">
              {{ developer.name }}
            </h2>
            <p class="text-sm text-accent-300">{{ developer.role }}</p>
            <p class="mt-3 max-w-[38ch] text-[13px] leading-relaxed text-neutral-400">
              A full-stack portfolio prototype: a Kotlin API and this Angular app, built
              contract-first and covered by automated tests.
            </p>
          </div>
        </section>

        <nav aria-labelledby="footer-profiles">
          <h2 id="footer-profiles" class="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
            Find me
          </h2>
          <ul class="mt-3 flex flex-col gap-2">
            @for (link of links; track link.label) {
              <li>
                <a
                  [href]="link.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="group flex items-center gap-3 rounded-md border border-divider px-3 py-2 text-sm text-neutral-200 no-underline transition-colors hover:border-accent/60 hover:bg-accent/10 hover:text-ink"
                >
                  <i [mfIcon]="link.icon" [fill]="link.fill" class="text-lg text-accent-300"></i>
                  <span class="flex min-w-0 flex-1 flex-col leading-tight">
                    <span class="font-medium">{{ link.label }}</span>
                    <span class="truncate text-xs text-neutral-500">{{ link.handle }}</span>
                  </span>
                  <i
                    mfIcon="arrow-up-right"
                    class="text-neutral-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-300"
                  ></i>
                  <span class="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            }
          </ul>
        </nav>

        <section aria-labelledby="footer-stack">
          <h2 id="footer-stack" class="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
            Built with
          </h2>
          <ul class="mt-3 flex flex-wrap gap-2">
            @for (item of stack; track item) {
              <li>
                <mf-tag tone="outline">{{ item }}</mf-tag>
              </li>
            }
          </ul>
          <p class="mt-4 flex gap-2 text-xs leading-relaxed text-neutral-500">
            <i mfIcon="flask" class="mt-0.5 shrink-0"></i>
            <span>All names, documents and codes in this app are fictitious.</span>
          </p>
        </section>
      </div>

      <div
        class="flex flex-col gap-1 border-t border-divider pt-4 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between"
      >
        <p>© {{ year }} {{ developer.name }}. MaiaFlight is a demo product, not a real airline.</p>
        <p>Times are shown in your device's time zone.</p>
      </div>
    </footer>
  `,
})
export class SiteFooter {
  protected readonly developer = DEVELOPER;
  protected readonly links = PROFILE_LINKS;
  protected readonly stack = STACK;
  protected readonly year = new Date().getFullYear();
}
