import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../../../shared/ui/icon';
import { cityOf } from '../model/airports';
import { BoardingPassView } from '../model/flight';
import { CopyCode } from './copy-code';
import { FlightTimePipe } from './flight-time.pipe';

@Component({
  selector: 'app-boarding-pass',
  imports: [Icon, CopyCode],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article
      class="overflow-hidden rounded-lg border border-divider bg-[linear-gradient(165deg,var(--color-accent-800),var(--color-surface)_55%)] shadow-elev-lg"
      aria-label="Boarding pass"
    >
      <div class="flex flex-col gap-4 p-4 sm:p-5">
        <div class="flex items-center justify-between">
          <span class="flex items-center gap-2 text-sm font-medium"
            ><i mfIcon="airplane-tilt" fill class="text-accent-200"></i>MaiaFlight</span
          >
          <span
            class="inline-flex items-center gap-1.5 rounded-full border border-ok/50 bg-ok/10 px-2.5 py-0.5 text-xs tracking-wider text-ok"
          >
            <i mfIcon="check-circle" fill></i>{{ pass().status }}
          </span>
        </div>

        <div class="flex items-center gap-3">
          <div>
            <p class="text-4xl font-medium leading-none tracking-tight">{{ flight().origin }}</p>
            <p class="mt-1 text-xs text-neutral-300">{{ origin() }}</p>
          </div>
          <span class="flex flex-1 items-center gap-1.5" aria-hidden="true">
            <span class="h-px flex-1 bg-neutral-500"></span>
            <i mfIcon="airplane-tilt" fill class="rotate-90 text-accent-200"></i>
            <span class="h-px flex-1 bg-neutral-500"></span>
          </span>
          <div class="text-right">
            <p class="text-4xl font-medium leading-none tracking-tight">
              {{ flight().destination }}
            </p>
            <p class="mt-1 text-xs text-neutral-300">{{ destination() }}</p>
          </div>
        </div>

        <dl class="grid grid-cols-3 gap-3.5">
          @for (field of fields(); track field.key) {
            <div>
              <dt class="text-[10px] uppercase tracking-widest text-neutral-400">
                {{ field.key }}
              </dt>
              <dd class="mt-0.5 text-lg font-medium">{{ field.value }}</dd>
            </div>
          }
        </dl>
      </div>

      <div class="relative h-5" aria-hidden="true">
        <span class="absolute -left-2.5 top-0 size-5 rounded-full bg-canvas"></span>
        <span class="absolute -right-2.5 top-0 size-5 rounded-full bg-canvas"></span>
        <span class="absolute inset-x-3.5 top-2.5 border-t border-dashed border-neutral-600"></span>
      </div>

      <div class="flex items-center justify-between gap-3 px-4 pb-4 pt-3 sm:px-5">
        <div class="min-w-0">
          <p class="text-[10px] uppercase tracking-widest text-neutral-400">Confirmation code</p>
          <p class="mt-0.5 break-all font-mono text-sm tracking-wider">{{ pass().checkinId }}</p>
        </div>
        <app-copy-code [text]="pass().checkinId" />
      </div>
    </article>
    <p class="mt-3 flex gap-2 text-xs leading-snug text-neutral-500">
      <i mfIcon="info" class="mt-px shrink-0"></i>Visual preview only. Download and QR code aren't
      available yet.
    </p>
  `,
})
export class BoardingPass {
  readonly pass = input.required<BoardingPassView>();

  protected readonly flight = computed(() => this.pass().flight);
  protected readonly origin = computed(() => cityOf(this.flight().origin));
  protected readonly destination = computed(() => cityOf(this.flight().destination));

  private readonly time = new FlightTimePipe();
  protected readonly fields = computed(() => {
    const pass = this.pass();
    return [
      { key: 'Flight', value: pass.flight.displayNumber },
      { key: 'Date', value: this.time.transform(pass.flight.departureTime, 'day') },
      { key: 'Departs', value: this.time.transform(pass.flight.departureTime) },
      { key: 'Boarding', value: this.time.transform(pass.boardingTime) },
      { key: 'Gate', value: pass.boardingGate },
      { key: 'Passenger', value: pass.passengerId },
    ];
  });
}
