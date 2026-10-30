import { ApiError } from '../../../core/http/api-error';
import { FlightView } from './flight';

export type FlowErrorKind =
  | 'invalid'
  | 'none'
  | 'notfound'
  | 'window'
  | 'cancelled'
  | 'unavailable'
  | 'already'
  | 'passenger'
  | 'api';

export interface FlowError {
  kind: FlowErrorKind;
  flight?: FlightView;
  requestId?: string;
}

export function errorFromSearch(error: ApiError): FlowError {
  const kind: FlowErrorKind =
    error.code === 'VALIDATION_ERROR' || error.code === 'MALFORMED_REQUEST' ? 'invalid' : 'api';
  return { kind, requestId: error.requestId ?? undefined };
}

export function errorFromCheckin(error: ApiError, flight: FlightView): FlowError {
  const requestId = error.requestId ?? undefined;
  switch (error.code) {
    case 'CHECKIN_ALREADY_DONE':
      return { kind: 'already', flight, requestId };
    case 'CHECKIN_NOT_ALLOWED':
      return {
        kind: flight.availability === 'cancelled' ? 'cancelled' : 'window',
        flight,
        requestId,
      };
    case 'FLIGHT_NOT_FOUND':
      return { kind: 'notfound', flight, requestId };
    case 'PASSENGER_NOT_FOUND':
    case 'PASSENGER_NOT_ON_FLIGHT':
      return { kind: 'passenger', flight, requestId };
    default:
      return { kind: 'api', flight, requestId };
  }
}
