import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config';
import {
  CheckinResponse,
  PerformCheckinRequest,
  SearchFlightsRequest,
  SearchFlightsResponse,
} from './checkin.dto';

@Injectable({ providedIn: 'root' })
export class CheckinApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  searchFlights(request: SearchFlightsRequest): Observable<SearchFlightsResponse> {
    return this.http.post<SearchFlightsResponse>(
      `${this.config.apiBaseUrl}/checkins/flights/search`,
      request,
    );
  }

  performCheckin(request: PerformCheckinRequest): Observable<CheckinResponse> {
    return this.http.post<CheckinResponse>(`${this.config.apiBaseUrl}/checkins`, request);
  }
}
