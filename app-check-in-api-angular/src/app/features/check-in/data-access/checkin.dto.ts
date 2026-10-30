/** Wire contracts of the check-in API (api-check-in-api-kotlin/src/main/resources/openapi/check-in-api.yaml). */

export type SearchType = 'FLIGHT_NUMBER' | 'BOOKING_CODE' | 'DOCUMENT';

export type FlightStatus = 'SCHEDULED' | 'CANCELLED' | 'BOARDED' | 'CLOSED';

export interface SearchFlightsRequest {
  searchType: SearchType;
  value: string;
}

export interface FlightSummaryDto {
  flightId: string;
  flightNumber: string;
  origin: string;
  destination: string;
  /** ISO-8601, UTC. */
  departureTime: string;
  status: FlightStatus;
  checkinAvailable: boolean;
  /** ISO-8601, UTC. */
  checkinOpensAt: string;
}

export interface SearchFlightsResponse {
  flights: FlightSummaryDto[];
  /** Present only when the search identified a passenger (DOCUMENT). */
  passengerId?: string;
}

export interface PerformCheckinRequest {
  flightId: string;
  passengerId: string;
}

export interface CheckinResponse {
  checkinId: string;
  status: string;
  boardingGate: string;
  /** ISO-8601, UTC. */
  boardingTime: string;
}
