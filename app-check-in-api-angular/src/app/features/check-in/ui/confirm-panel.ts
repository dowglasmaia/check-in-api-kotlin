import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormField, form, submit, validate } from '@angular/forms/signals';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Icon } from '../../../shared/ui/icon';
import { FlightView } from '../model/flight';
import { TestPassenger } from '../../test-data/public-api';
import { FlightTimePipe } from './flight-time.pipe';

const STATUS_LABEL: Record<FlightView['availability'], string> = {
  available: 'Check-in open',
  'not-open': 'Not open yet',
  cancelled: 'Cancelled',
  closed: 'Check-in closed',
};

/** Trip summary and the confirm action. Asks for a passenger code only when the search did not identify the passenger. */
@Component({
  selector: 'app-confirm-panel',
  imports: [Button, Card, Icon, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <mf-card elevation="md" class="flex flex-col gap-4 p-4 sm:p-5">
      <p class="text-xs uppercase tracking-widest text-neutral-400">Trip summary</p>
      <dl class="flex flex-col gap-2.5 text-sm">
        @for (row of rows(); track row.key) {
          <div class="flex justify-between gap-3">
            <dt class="text-neutral-400">{{ row.key }}</dt>
            <dd class="text-right">{{ row.value }}</dd>
          </div>
        }
      </dl>

      @if (passengerKnown() && !unavailable()) {
        <p
          class="flex gap-2.5 rounded-md border border-accent/25 bg-accent/10 px-3 py-2.5 text-xs leading-snug text-neutral-400"
        >
          <i mfIcon="identification-card" class="shrink-0 text-lg text-accent-300"></i>
          Passenger is identified from the document you entered.
        </p>
      }

      @if (unavailable()) {
        <div class="flex flex-col gap-3">
          <button mfBtn type="button" large block disabled>Check-in not available</button>
          <button mfBtn type="button" variant="secondary" block (click)="back.emit()">
            <i mfIcon="arrow-left"></i>Back to my flights
          </button>
        </div>
      } @else {
        <form class="flex flex-col gap-4" novalidate (submit)="onSubmit($event)">
          @if (!passengerKnown()) {
            <div class="flex flex-col gap-1.5">
              <label for="passenger-code" class="text-[13px] text-neutral-300"
                >Passenger code</label
              >
              <input
                id="passenger-code"
                type="text"
                autocomplete="off"
                placeholder="e.g. P-004"
                class="h-11 w-full rounded-md border bg-canvas px-3 text-base text-ink transition-colors focus:border-accent"
                [class]="showError() ? 'border-bad' : 'border-neutral-700'"
                [attr.aria-invalid]="showError()"
                aria-describedby="passenger-hint"
                [formField]="codeForm.passengerCode"
              />
              <p
                id="passenger-hint"
                class="text-xs"
                [class]="showError() ? 'text-bad' : 'text-neutral-500'"
                [attr.role]="showError() ? 'alert' : null"
              >
                {{
                  showError()
                    ? codeForm.passengerCode().errors()[0]?.message
                    : 'The code of the passenger who is checking in.'
                }}
              </p>
              @if (suggestions().length) {
                <div class="mt-1 flex flex-col gap-1.5">
                  <p class="text-xs text-neutral-500">
                    Test passengers on this flight
                    <span class="text-neutral-600">(fictitious)</span>
                  </p>
                  <div class="flex flex-wrap gap-2">
                    @for (passenger of suggestions(); track passenger.passengerId) {
                      <button
                        type="button"
                        class="cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors"
                        [class]="
                          model().passengerCode === passenger.passengerId
                            ? 'border-accent bg-accent/15 text-accent-100'
                            : 'border-neutral-700 text-neutral-300 hover:bg-neutral-700/30'
                        "
                        [attr.aria-pressed]="model().passengerCode === passenger.passengerId"
                        (click)="pick(passenger)"
                      >
                        <span class="font-mono">{{ passenger.passengerId }}</span> ·
                        {{ passenger.name }}
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <button mfBtn type="submit" large block [loading]="submitting()">
            {{ submitting() ? 'Confirming…' : 'Confirm check-in' }}
          </button>
          <p class="text-center text-xs text-neutral-500">
            Boarding gate and time are issued once check-in is confirmed.
          </p>
        </form>
      }
    </mf-card>
  `,
})
export class ConfirmPanel {
  readonly flight = input.required<FlightView>();
  readonly passengerKnown = input(false);
  /** Test passengers of this flight (demo data). The first one is pre-filled so the flow can be completed. */
  readonly suggestions = input<TestPassenger[]>([]);
  readonly submitting = input(false);
  /** Check-in cannot be confirmed for this flight (not open yet, cancelled, closed): no form, just the way back. */
  readonly unavailable = input(false);
  readonly back = output<void>();
  readonly confirm = output<string | undefined>();

  protected readonly model = signal({ passengerCode: '' });
  protected readonly codeForm = form(this.model, (path) => {
    validate(path.passengerCode, ({ value }) =>
      !this.passengerKnown() && !value().trim()
        ? { kind: 'required', message: 'Enter the passenger code to continue.' }
        : undefined,
    );
  });

  constructor() {
    effect(() => {
      const first = this.suggestions()[0];
      if (first && !this.passengerKnown() && !untracked(this.model).passengerCode) {
        this.pick(first);
      }
    });
  }

  protected pick(passenger: TestPassenger): void {
    this.model.set({ passengerCode: passenger.passengerId });
  }

  protected readonly showError = computed(
    () => this.codeForm.passengerCode().touched() && this.codeForm.passengerCode().invalid(),
  );

  private readonly pipe = new FlightTimePipe();
  protected readonly rows = computed(() => {
    const flight = this.flight();
    return [
      { key: 'Route', value: `${flight.origin} → ${flight.destination}` },
      { key: 'Flight', value: flight.displayNumber },
      {
        key: 'Departs',
        value: `${this.pipe.transform(flight.departureTime, 'day')} · ${this.pipe.transform(flight.departureTime)}`,
      },
      { key: 'Status', value: STATUS_LABEL[flight.availability] },
    ];
  });

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.submitting()) return;
    submit(this.codeForm, async () => {
      this.confirm.emit(this.passengerKnown() ? undefined : this.model().passengerCode.trim());
    });
  }
}
