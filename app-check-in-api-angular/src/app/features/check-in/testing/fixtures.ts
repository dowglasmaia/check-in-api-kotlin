import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { signal } from '@angular/core';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { apiErrorInterceptor, requestIdInterceptor } from '../../../core/http/interceptors';
import { CheckinResponse, FlightSummaryDto } from '../data-access/checkin.dto';
import { toFlightView } from '../data-access/checkin.mappers';
import { TestScenarios, TestPassenger, Scenario } from '../../test-data/public-api';
import { BoardingPassView, FlightView } from '../model/flight';

export const NOW = new Date('2026-03-05T12:00:00Z');

export function flightDto(overrides: Partial<FlightSummaryDto> = {}): FlightSummaryDto {
  return {
    flightId: 'FL-004',
    flightNumber: 'MF214',
    origin: 'GRU',
    destination: 'LIS',
    departureTime: '2026-03-06T15:40:00Z',
    status: 'SCHEDULED',
    checkinAvailable: true,
    checkinOpensAt: '2026-03-03T15:40:00Z',
    ...overrides,
  };
}

export function flightView(overrides: Partial<FlightSummaryDto> = {}): FlightView {
  return toFlightView(flightDto(overrides));
}

export const NOT_OPEN = flightDto({
  flightId: 'FL-005',
  flightNumber: 'MF215',
  checkinAvailable: false,
  departureTime: '2026-03-13T11:15:00Z',
  checkinOpensAt: '2026-03-10T11:15:00Z',
});

export const CANCELLED = flightDto({
  flightId: 'FL-006',
  flightNumber: 'MF3010',
  status: 'CANCELLED',
  checkinAvailable: false,
});

export const CHECKIN_RESPONSE: CheckinResponse = {
  checkinId: '3e4e7abf-40ac-4e61-a5d9-46b06250daf7',
  status: 'CONFIRMED',
  boardingGate: 'C1',
  boardingTime: '2026-03-06T15:10:00Z',
};

export function boardingPass(overrides: Partial<BoardingPassView> = {}): BoardingPassView {
  return {
    checkinId: CHECKIN_RESPONSE.checkinId,
    status: 'CONFIRMED',
    boardingGate: 'C1',
    boardingTime: new Date(CHECKIN_RESPONSE.boardingTime),
    checkedInAt: NOW,
    flight: flightView(),
    passengerId: 'P-004',
    ...overrides,
  };
}

/** HttpClient wired like production (interceptors included) but backed by the testing controller. */
export const httpTestProviders = () => [
  provideHttpClient(withInterceptors([requestIdInterceptor, apiErrorInterceptor])),
  provideHttpClientTesting(),
];

export function apiErrorBody(status: number, code: string, message = 'error') {
  return { body: { status, error: 'x', message, code }, init: { status, statusText: 'x' } };
}

/** Stand-in for the demo-data service: no HTTP, and a controllable reset counter. */
export function testScenariosStub(
  options: {
    available?: boolean;
    scenarios?: Scenario[];
    passengers?: Record<string, TestPassenger[]>;
    resetResult?: boolean;
  } = {},
) {
  const resetCount = signal(0);
  const stub = {
    available: signal(options.available ?? true),
    scenarios: signal(options.scenarios ?? []),
    loading: signal(false),
    notice: signal(''),
    resetCount: resetCount.asReadonly(),
    passengersOf: (flightId: string) => options.passengers?.[flightId] ?? [],
    resetData: vi.fn(async () => {
      const ok = options.resetResult ?? true;
      if (ok) resetCount.update((count) => count + 1);
      return ok;
    }),
  };
  return { stub, provider: { provide: TestScenarios, useValue: stub } };
}
