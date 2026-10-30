import { HttpErrorResponse } from '@angular/common/http';

export type ApiErrorCode =
  | 'FLIGHT_NOT_FOUND'
  | 'PASSENGER_NOT_FOUND'
  | 'PASSENGER_NOT_ON_FLIGHT'
  | 'CHECKIN_NOT_ALLOWED'
  | 'CHECKIN_ALREADY_DONE'
  | 'VALIDATION_ERROR'
  | 'MALFORMED_REQUEST'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

const KNOWN_CODES: readonly ApiErrorCode[] = [
  'FLIGHT_NOT_FOUND',
  'PASSENGER_NOT_FOUND',
  'PASSENGER_NOT_ON_FLIGHT',
  'CHECKIN_NOT_ALLOWED',
  'CHECKIN_ALREADY_DONE',
  'VALIDATION_ERROR',
  'MALFORMED_REQUEST',
  'INTERNAL_ERROR',
];

interface ApiErrorBody {
  status?: number;
  message?: string;
  code?: string;
}

/** A failed API call, classified by the stable `code` the backend sends (never by message text). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    readonly serverMessage: string,
    readonly requestId: string | null,
  ) {
    super(serverMessage || code);
    this.name = 'ApiError';
  }

  get isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR';
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (!(error instanceof HttpErrorResponse)) return new ApiError(-1, 'UNKNOWN', '', null);

  const requestId = error.headers?.get('X-Request-Id') ?? null;
  if (error.status === 0) return new ApiError(0, 'NETWORK_ERROR', '', requestId);

  const body = (error.error ?? {}) as ApiErrorBody;
  const code = KNOWN_CODES.find((known) => known === body.code) ?? codeFromStatus(error.status);
  return new ApiError(
    error.status,
    code,
    typeof body.message === 'string' ? body.message : '',
    requestId,
  );
}

function codeFromStatus(status: number): ApiErrorCode {
  if (status === 400) return 'VALIDATION_ERROR';
  if (status >= 500) return 'INTERNAL_ERROR';
  return 'UNKNOWN';
}
