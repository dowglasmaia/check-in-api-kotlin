import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config';

export type ScenarioSearchType = 'FLIGHT_NUMBER' | 'BOOKING_CODE' | 'DOCUMENT';

export interface Scenario {
  label: string;
  searchType: ScenarioSearchType;
  value: string;
  expectedOutcome: string;
  note?: string;
}

export interface TestPassenger {
  passengerId: string;
  name: string;
}

interface TestDataResponse {
  notice: string;
  scenarios: Scenario[];
  flights?: { flightId: string; passengers: TestPassenger[] }[];
}

/** Fictitious scenarios served by `GET /demo/test-data`. Empty when the backend has demo data disabled. */
@Injectable({ providedIn: 'root' })
export class TestScenarios {
  private readonly config = inject(APP_CONFIG);
  private readonly http = inject(HttpClient);

  private readonly resource = httpResource<TestDataResponse>(
    () => `${this.config.apiBaseUrl}/demo/test-data`,
  );

  /** True once the endpoint answered 200; stays false when it is disabled (404) or unreachable. */
  readonly available = computed(() => this.resource.hasValue());
  readonly notice = computed(() => (this.resource.hasValue() ? this.resource.value().notice : ''));
  readonly scenarios = computed<Scenario[]>(() =>
    this.resource.hasValue() ? this.resource.value().scenarios : [],
  );
  readonly loading = this.resource.isLoading;

  private readonly resets = signal(0);
  /** Increments every time the API forgot all check-ins; other modules react to it to drop what they remember. */
  readonly resetCount = this.resets.asReadonly();

  /** Makes the API forget every check-in (`POST /demo/reset`) so the flow can be repeated. */
  async resetData(): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post<void>(`${this.config.apiBaseUrl}/demo/reset`, null));
      this.resets.update((count) => count + 1);
      return true;
    } catch {
      return false;
    }
  }

  /** Fictitious passengers booked on a flight; empty when demo data is off. */
  passengersOf(flightId: string): TestPassenger[] {
    if (!this.resource.hasValue()) return [];
    return (
      this.resource.value().flights?.find((flight) => flight.flightId === flightId)?.passengers ??
      []
    );
  }
}
