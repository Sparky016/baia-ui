import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { RunRequest, RunSummary } from '@baia/shared';
import { Observable } from 'rxjs';

/** Base URL for the BAIA backend API. Override in tests or environments as needed. */
export const BAIA_API_BASE_URL = new InjectionToken<string>('BAIA_API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:3000',
});

@Injectable({ providedIn: 'root' })
export class RunsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(BAIA_API_BASE_URL);

  /** POST /runs — create a new analysis run. */
  createRun(request: RunRequest): Observable<RunSummary> {
    return this.http.post<RunSummary>(`${this.baseUrl}/runs`, request);
  }

  /** GET /runs/:id — fetch a run's current state. */
  getRun(runId: string): Observable<RunSummary> {
    return this.http.get<RunSummary>(`${this.baseUrl}/runs/${runId}`);
  }

  /** POST /runs/:id/export — trigger Confluence export for an approved run. */
  exportRun(runId: string): Observable<RunSummary> {
    return this.http.post<RunSummary>(`${this.baseUrl}/runs/${runId}/export`, {});
  }
}
