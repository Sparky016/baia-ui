import { TestBed } from '@angular/core/testing';

import { ExploreEvent } from '@baia/shared';

import {
  IEventSource,
  SseMessageEvent,
  EVENT_SOURCE_FACTORY,
  RunEventsService,
} from './run-events.service';
import { BAIA_API_BASE_URL } from './runs-api.service';

const TEST_BASE_URL = 'http://test-api:4200';

/** Controllable fake EventSource for use in tests. */
class FakeEventSource implements IEventSource {
  readonly readyState = 0;
  onmessage: ((ev: SseMessageEvent) => void) | null = null;
  onerror: ((ev: Record<string, unknown>) => void) | null = null;
  closed = false;

  close(): void {
    this.closed = true;
  }

  /** Simulate a server-sent message. */
  emit(data: unknown): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  /** Simulate the SSE connection emitting a raw (invalid JSON) message. */
  emitRaw(data: string): void {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }

  /** Simulate a connection error. */
  triggerError(): void {
    if (this.onerror) {
      this.onerror({});
    }
  }
}

describe('RunEventsService', () => {
  let service: RunEventsService;
  let fakeSource: FakeEventSource;

  beforeEach(() => {
    fakeSource = new FakeEventSource();

    TestBed.configureTestingModule({
      providers: [
        { provide: BAIA_API_BASE_URL, useValue: TEST_BASE_URL },
        {
          provide: EVENT_SOURCE_FACTORY,
          useValue: (_url: string) => fakeSource,
        },
      ],
    });

    service = TestBed.inject(RunEventsService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // ─── getRunEvents ─────────────────────────────────────────────────────────

  describe('getRunEvents', () => {
    it('emits a parsed ExploreEvent when the server sends a message', () => {
      const received: ExploreEvent[] = [];
      const actionEvent: ExploreEvent = {
        timestamp: new Date('2024-01-01T00:00:00Z'),
        type: 'action',
        message: 'Clicking the login button',
      };

      service.getRunEvents('run-123').subscribe((ev) => received.push(ev));
      fakeSource.emit(actionEvent);

      expect(received.length).toBe(1);
      expect(received[0].type).toBe('action');
      expect(received[0].message).toBe('Clicking the login button');
    });

    it('emits multiple events in order', () => {
      const received: ExploreEvent[] = [];

      const events: ExploreEvent[] = [
        { timestamp: new Date(), type: 'action', message: 'step 1' },
        { timestamp: new Date(), type: 'observation', message: 'step 2' },
      ];

      service.getRunEvents('run-456').subscribe((ev) => received.push(ev));

      events.forEach((ev) => fakeSource.emit(ev));

      expect(received.length).toBe(2);
      expect(received[0].message).toBe('step 1');
      expect(received[1].message).toBe('step 2');
    });

    it('completes the Observable when a "complete" event is received', () => {
      let completed = false;

      const completeEvent: ExploreEvent = {
        timestamp: new Date(),
        type: 'complete',
        message: 'Analysis finished',
      };

      service.getRunEvents('run-789').subscribe({ complete: () => (completed = true) });
      fakeSource.emit(completeEvent);

      expect(completed).toBeTrue();
      expect(fakeSource.closed).toBeTrue();
    });

    it('errors the Observable on a connection error', () => {
      let receivedError: unknown;

      service.getRunEvents('run-err').subscribe({
        error: (err) => (receivedError = err),
      });

      fakeSource.triggerError();

      expect(receivedError).toBeInstanceOf(Error);
      expect((receivedError as Error).message).toContain('SSE connection error');
    });

    it('errors the Observable when JSON is unparseable', () => {
      let receivedError: unknown;

      service.getRunEvents('run-bad-json').subscribe({
        error: (err) => (receivedError = err),
      });

      fakeSource.emitRaw('{not valid json}');

      expect(receivedError).toBeInstanceOf(Error);
      expect((receivedError as Error).message).toContain('Failed to parse SSE event');
    });

    it('closes the EventSource when the subscriber unsubscribes', () => {
      const sub = service.getRunEvents('run-unsub').subscribe(() => undefined);
      expect(fakeSource.closed).toBeFalse();

      sub.unsubscribe();

      expect(fakeSource.closed).toBeTrue();
    });

    it('passes the correct SSE URL to the EventSource factory', () => {
      const capturedUrls: string[] = [];
      const secondFake = new FakeEventSource();

      // Override factory for this specific test to capture the URL
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: BAIA_API_BASE_URL, useValue: TEST_BASE_URL },
          {
            provide: EVENT_SOURCE_FACTORY,
            useValue: (url: string) => {
              capturedUrls.push(url);
              return secondFake;
            },
          },
        ],
      });

      const localService = TestBed.inject(RunEventsService);
      localService.getRunEvents('run-url-check').subscribe();

      expect(capturedUrls).toEqual([`${TEST_BASE_URL}/runs/run-url-check/events`]);
    });

    it('includes details in the emitted event when present', () => {
      const received: ExploreEvent[] = [];

      const eventWithDetails: ExploreEvent = {
        timestamp: new Date(),
        type: 'observation',
        message: 'Found form element',
        details: { selector: '#login-form', attributes: { action: '/login' } },
      };

      service.getRunEvents('run-details').subscribe((ev) => received.push(ev));
      fakeSource.emit(eventWithDetails);

      expect(received.length).toBe(1);
      expect(received[0].details).toEqual({
        selector: '#login-form',
        attributes: { action: '/login' },
      });
    });
  });

  // ─── streamRunEvents ──────────────────────────────────────────────────────

  describe('streamRunEvents', () => {
    it('returns an Observable that emits events via the subject', () => {
      const received: ExploreEvent[] = [];
      const { events$, stop } = service.streamRunEvents('run-stream');

      events$.subscribe((ev) => received.push(ev));

      const actionEvent: ExploreEvent = {
        timestamp: new Date(),
        type: 'action',
        message: 'Navigating to /about',
      };
      fakeSource.emit(actionEvent);

      expect(received.length).toBe(1);
      expect(received[0].type).toBe('action');

      stop();
    });

    it('stop() closes the underlying EventSource', () => {
      const { events$, stop } = service.streamRunEvents('run-stop');
      events$.subscribe();

      stop();

      expect(fakeSource.closed).toBeTrue();
    });

    it('completes the subject when a complete event is received', () => {
      let completed = false;
      const { events$ } = service.streamRunEvents('run-complete-subject');

      events$.subscribe({ complete: () => (completed = true) });

      const completeEvent: ExploreEvent = {
        timestamp: new Date(),
        type: 'complete',
        message: 'Done',
      };
      fakeSource.emit(completeEvent);

      expect(completed).toBeTrue();
    });

    it('propagates errors through the subject', () => {
      let caughtError: unknown;
      const { events$ } = service.streamRunEvents('run-error-subject');

      events$.subscribe({ error: (err) => (caughtError = err) });
      fakeSource.triggerError();

      expect(caughtError).toBeInstanceOf(Error);
    });
  });

  // ─── ngOnDestroy ──────────────────────────────────────────────────────────

  describe('ngOnDestroy', () => {
    it('closes the active EventSource on service destroy', () => {
      service.getRunEvents('run-destroy').subscribe();
      expect(fakeSource.closed).toBeFalse();

      service.ngOnDestroy();

      expect(fakeSource.closed).toBeTrue();
    });
  });
});
