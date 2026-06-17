import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { RunRequest, RunStatus, RunSummary } from '@baia/shared';

import { BAIA_API_BASE_URL, RunsApiService } from './runs-api.service';

const TEST_BASE_URL = 'http://test-api:4200';

const mockRequest: RunRequest = {
  targetUrl: 'https://example.com',
  instructions: 'Explore the home page',
  repoUrl: 'https://github.com/acme/repo',
  repoProvider: 'github',
  credentialsRef: 'creds-001',
};

const mockRunSummary: RunSummary = {
  runId: 'run-abc-123',
  status: RunStatus.Queued,
  targetUrl: 'https://example.com',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

describe('RunsApiService', () => {
  let service: RunsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BAIA_API_BASE_URL, useValue: TEST_BASE_URL },
      ],
    });
    service = TestBed.inject(RunsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ─── createRun ────────────────────────────────────────────────────────────

  describe('createRun', () => {
    it('sends a POST to /runs with the request body and returns a RunSummary', () => {
      let result: RunSummary | undefined;

      service.createRun(mockRequest).subscribe((res) => (result = res));

      const req = httpMock.expectOne(`${TEST_BASE_URL}/runs`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockRequest);

      req.flush(mockRunSummary);

      expect(result).toEqual(mockRunSummary);
    });

    it('propagates HTTP errors from createRun', () => {
      let error: unknown;

      service.createRun(mockRequest).subscribe({
        error: (err) => (error = err),
      });

      const req = httpMock.expectOne(`${TEST_BASE_URL}/runs`);
      req.flush({ message: 'Bad Request' }, { status: 400, statusText: 'Bad Request' });

      expect(error).toBeTruthy();
    });

    it('propagates 500 server error from createRun', () => {
      let errorStatus: number | undefined;

      service.createRun(mockRequest).subscribe({
        error: (err: { status: number }) => (errorStatus = err.status),
      });

      const req = httpMock.expectOne(`${TEST_BASE_URL}/runs`);
      req.flush('Internal Server Error', { status: 500, statusText: 'Server Error' });

      expect(errorStatus).toBe(500);
    });
  });

  // ─── getRun ───────────────────────────────────────────────────────────────

  describe('getRun', () => {
    it('sends a GET to /runs/:id and returns a RunSummary', () => {
      const runId = 'run-abc-123';
      let result: RunSummary | undefined;

      service.getRun(runId).subscribe((res) => (result = res));

      const req = httpMock.expectOne(`${TEST_BASE_URL}/runs/${runId}`);
      expect(req.request.method).toBe('GET');

      const exploringRun: RunSummary = { ...mockRunSummary, status: RunStatus.Exploring };
      req.flush(exploringRun);

      expect(result).toEqual(exploringRun);
      expect(result?.status).toBe(RunStatus.Exploring);
    });

    it('propagates 404 when run is not found', () => {
      let error: unknown;

      service.getRun('nonexistent-id').subscribe({
        error: (err) => (error = err),
      });

      const req = httpMock.expectOne(`${TEST_BASE_URL}/runs/nonexistent-id`);
      req.flush({ message: 'Not Found' }, { status: 404, statusText: 'Not Found' });

      expect(error).toBeTruthy();
    });

    it('propagates 500 server error from getRun', () => {
      let errorStatus: number | undefined;

      service.getRun('run-xyz').subscribe({
        error: (err: { status: number }) => (errorStatus = err.status),
      });

      const req = httpMock.expectOne(`${TEST_BASE_URL}/runs/run-xyz`);
      req.flush('Server error', { status: 500, statusText: 'Server Error' });

      expect(errorStatus).toBe(500);
    });
  });

  // ─── exportRun ────────────────────────────────────────────────────────────

  describe('exportRun', () => {
    it('sends a POST to /runs/:id/export and returns updated RunSummary', () => {
      const runId = 'run-abc-123';
      let result: RunSummary | undefined;

      service.exportRun(runId).subscribe((res) => (result = res));

      const req = httpMock.expectOne(`${TEST_BASE_URL}/runs/${runId}/export`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});

      const doneRun: RunSummary = { ...mockRunSummary, status: RunStatus.Done };
      req.flush(doneRun);

      expect(result?.status).toBe(RunStatus.Done);
    });

    it('propagates 409 when run is not in exportable state', () => {
      let error: unknown;

      service.exportRun('run-abc-123').subscribe({
        error: (err) => (error = err),
      });

      const req = httpMock.expectOne(`${TEST_BASE_URL}/runs/run-abc-123/export`);
      req.flush({ message: 'Conflict' }, { status: 409, statusText: 'Conflict' });

      expect(error).toBeTruthy();
    });

    it('propagates 500 server error from exportRun', () => {
      let errorStatus: number | undefined;

      service.exportRun('run-abc-123').subscribe({
        error: (err: { status: number }) => (errorStatus = err.status),
      });

      const req = httpMock.expectOne(`${TEST_BASE_URL}/runs/run-abc-123/export`);
      req.flush('Server error', { status: 500, statusText: 'Server Error' });

      expect(errorStatus).toBe(500);
    });
  });
});
