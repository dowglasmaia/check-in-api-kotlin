import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ApiError, toApiError } from './api-error';

function failure(status: number, body: unknown = null, requestId?: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: body,
    headers: requestId ? new HttpHeaders({ 'X-Request-Id': requestId }) : undefined,
  });
}

describe('toApiError', () => {
  it.each([
    'FLIGHT_NOT_FOUND',
    'PASSENGER_NOT_FOUND',
    'PASSENGER_NOT_ON_FLIGHT',
    'CHECKIN_NOT_ALLOWED',
    'CHECKIN_ALREADY_DONE',
    'VALIDATION_ERROR',
    'MALFORMED_REQUEST',
    'INTERNAL_ERROR',
  ])('keeps the backend code %s', (code) => {
    const error = toApiError(failure(409, { status: 409, error: 'Conflict', message: 'm', code }));
    expect(error.code).toBe(code);
    expect(error.serverMessage).toBe('m');
  });

  it('never classifies by message text', () => {
    const error = toApiError(
      failure(409, { message: 'Passenger P-001 already checked in', code: 'SOMETHING_ELSE' }),
    );
    expect(error.code).toBe('UNKNOWN');
  });

  it('falls back to the HTTP status when the body has no known code', () => {
    expect(toApiError(failure(400)).code).toBe('VALIDATION_ERROR');
    expect(toApiError(failure(503, '<html>')).code).toBe('INTERNAL_ERROR');
    expect(toApiError(failure(418)).code).toBe('UNKNOWN');
  });

  it('detects a network failure', () => {
    const error = toApiError(failure(0));
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.isNetworkError).toBe(true);
  });

  it('exposes the request id for support', () => {
    expect(toApiError(failure(500, null, 'req-1')).requestId).toBe('req-1');
  });

  it('returns ApiError instances untouched and wraps unknown values', () => {
    const existing = new ApiError(500, 'INTERNAL_ERROR', '', null);
    expect(toApiError(existing)).toBe(existing);
    expect(toApiError(new Error('boom')).code).toBe('UNKNOWN');
  });
});
