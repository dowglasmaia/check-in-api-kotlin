import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { toApiError } from './api-error';

/** Sends `X-Request-Id` so a failure can be correlated with the backend logs. */
export const requestIdInterceptor: HttpInterceptorFn = (req, next) =>
  req.headers.has('X-Request-Id')
    ? next(req)
    : next(req.clone({ setHeaders: { 'X-Request-Id': crypto.randomUUID() } }));

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((error) => throwError(() => toApiError(error))));
