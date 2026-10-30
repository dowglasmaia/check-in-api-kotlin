import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormField, form, submit, validate } from '@angular/forms/signals';
import { Button } from '../../../shared/ui/button';
import { Icon } from '../../../shared/ui/icon';
import { Scenario } from '../../test-data/public-api';
import { SearchType } from '../data-access/checkin.dto';
import { SEARCH_TYPES, SEARCH_TYPE_LIST } from '../model/search-type';

export interface SearchRequest {
  searchType: SearchType;
  value: string;
}

@Component({
  selector: 'app-search-form',
  imports: [FormField, Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex max-w-140 flex-col gap-4 rounded-lg border border-divider bg-surface p-4 shadow-elev-md sm:p-5"
    >
      <div
        role="tablist"
        aria-label="Search by"
        class="grid grid-cols-3 gap-1 rounded-md border border-divider bg-canvas p-1"
      >
        @for (option of types; track option.type) {
          <button
            type="button"
            role="tab"
            class="flex cursor-pointer flex-col items-center gap-1 rounded-sm border px-1 py-2 text-xs transition-colors"
            [class]="
              model().searchType === option.type
                ? 'border-accent bg-accent/15 text-accent-100'
                : 'border-transparent text-neutral-400 hover:bg-neutral-700/20'
            "
            [attr.aria-selected]="model().searchType === option.type"
            (click)="pickType(option.type)"
          >
            <i [mfIcon]="option.tabIcon" class="text-lg"></i>{{ option.tabLabel }}
          </button>
        }
      </div>

      <form class="flex flex-col gap-3.5" novalidate (submit)="onSubmit($event)">
        <div class="flex flex-col gap-1.5">
          <label for="search-value" class="text-[13px] text-neutral-300">{{
            config().label
          }}</label>
          <div class="relative">
            <i
              [mfIcon]="config().icon"
              class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-neutral-500"
            ></i>
            <input
              id="search-value"
              type="text"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              class="h-11.5 w-full rounded-md border bg-canvas pl-10 pr-3 text-base text-ink transition-colors focus:border-accent"
              [class]="showError() ? 'border-bad' : 'border-neutral-700'"
              [class.tracking-widest]="model().searchType === 'BOOKING_CODE'"
              [placeholder]="config().placeholder"
              [attr.aria-invalid]="showError()"
              aria-describedby="search-hint"
              [formField]="searchForm.value"
            />
          </div>
          <p
            id="search-hint"
            class="flex min-h-4 items-center gap-1.5 text-xs"
            [class]="showError() ? 'text-bad' : 'text-neutral-500'"
            [attr.role]="showError() ? 'alert' : null"
          >
            <i [mfIcon]="showError() ? 'warning-circle' : 'info'"></i>{{ message() }}
          </p>
        </div>

        <button mfBtn type="submit" large block [loading]="loading()">
          Find my flight<i mfIcon="arrow-right"></i>
        </button>
      </form>

      <p class="flex items-start gap-2.5 text-[13px] leading-snug text-neutral-300">
        <i mfIcon="clock-countdown" class="mt-px shrink-0 text-lg text-accent-300"></i>
        <span
          >Check-in is available up to
          <strong class="font-medium text-ink">72 hours before departure</strong>.</span
        >
      </p>
    </div>

    @if (scenarios().length) {
      <div class="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        Try:
        @for (scenario of scenarios(); track scenario.label) {
          <button
            type="button"
            class="cursor-pointer rounded-full bg-neutral-700/30 px-2.5 py-0.5 text-neutral-300 transition-colors hover:bg-neutral-700/50"
            (click)="fill(scenario)"
          >
            {{ scenario.value }}
          </button>
        }
      </div>
    }
  `,
})
export class SearchForm implements OnInit {
  readonly loading = input(false);
  readonly scenarios = input<Scenario[]>([]);
  readonly initial = input<SearchRequest>();
  readonly submitted = output<SearchRequest>();

  protected readonly types = SEARCH_TYPE_LIST;
  protected readonly model = signal<SearchRequest>({ searchType: 'BOOKING_CODE', value: '' });

  protected readonly searchForm = form(this.model, (path) => {
    validate(path.value, ({ value, valueOf }) => {
      const config = SEARCH_TYPES[valueOf(path.searchType)];
      const normalized = config.normalize(value());
      if (!normalized)
        return {
          kind: 'required',
          message: `Enter your ${config.label.toLowerCase()} to continue.`,
        };
      return config.isValid(normalized)
        ? undefined
        : { kind: 'format', message: config.formatError };
    });
  });

  protected readonly config = computed(() => SEARCH_TYPES[this.model().searchType]);
  protected readonly showError = computed(
    () => this.searchForm.value().touched() && this.searchForm.value().invalid(),
  );
  protected readonly message = computed(() =>
    this.showError()
      ? (this.searchForm.value().errors()[0]?.message ?? this.config().hint)
      : this.config().hint,
  );

  ngOnInit(): void {
    const initial = this.initial();
    if (initial) this.model.set(initial);
  }

  protected pickType(searchType: SearchType): void {
    this.model.set({ searchType, value: '' });
  }

  protected fill(scenario: Scenario): void {
    this.model.set({ searchType: scenario.searchType, value: scenario.value });
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.loading()) return;
    submit(this.searchForm, async () => {
      this.submitted.emit(this.model());
    });
  }
}
