import { Injectable, InjectionToken, OnDestroy, inject } from '@angular/core';
import { ExploreEvent } from '@baia/shared';
import { Observable, Subject } from 'rxjs';

import { BAIA_API_BASE_URL } from './runs-api.service';

/** Minimal message event shape used by EventSource — avoids reliance on browser globals in ESLint. */
export interface SseMessageEvent {
  readonly data: unknown;
}

/** Minimal interface describing the subset of EventSource we use. */
export interface IEventSource {
  readonly readyState: number;
  onmessage: ((ev: SseMessageEvent) => void) | null;
  onerror: ((ev: Record<string, unknown>) => void) | null;
  close(): void;
}

/** Factory function signature so we can swap the real EventSource in tests. */
export type EventSourceFactory = (url: string) => IEventSource;

/** DI token for the EventSource factory — replace in tests to avoid real HTTP. */
export const EVENT_SOURCE_FACTORY = new InjectionToken<EventSourceFactory>('EVENT_SOURCE_FACTORY', {
  providedIn: 'root',
  // eslint-disable-next-line no-undef
  factory: (): EventSourceFactory => (url: string) => new EventSource(url) as IEventSource,
});

@Injectable({ providedIn: 'root' })
export class RunEventsService implements OnDestroy {
  private readonly baseUrl = inject(BAIA_API_BASE_URL);
  private readonly eventSourceFactory = inject(EVENT_SOURCE_FACTORY);

  private activeSource: IEventSource | null = null;

  /**
   * Open an SSE connection to `/runs/:id/events` and return an Observable that
   * emits typed {@link ExploreEvent} values.  The connection is closed when the
   * Observable is unsubscribed from.
   */
  getRunEvents(runId: string): Observable<ExploreEvent> {
    return new Observable<ExploreEvent>((subscriber) => {
      const url = `${this.baseUrl}/runs/${runId}/events`;
      const source = this.eventSourceFactory(url);
      this.activeSource = source;

      source.onmessage = (ev: SseMessageEvent) => {
        try {
          const parsed: ExploreEvent = JSON.parse(String(ev.data)) as ExploreEvent;
          subscriber.next(parsed);
          if (parsed.type === 'complete') {
            subscriber.complete();
            source.close();
          }
        } catch {
          subscriber.error(new Error(`Failed to parse SSE event: ${String(ev.data)}`));
          source.close();
        }
      };

      source.onerror = (_ev: Record<string, unknown>) => {
        subscriber.error(new Error('SSE connection error'));
        source.close();
      };

      // Teardown: close the underlying connection when the subscriber unsubscribes.
      return () => {
        source.close();
        if (this.activeSource === source) {
          this.activeSource = null;
        }
      };
    });
  }

  /** Expose a convenience Subject-based stream for components that prefer push semantics. */
  streamRunEvents(runId: string): { events$: Observable<ExploreEvent>; stop: () => void } {
    const subject = new Subject<ExploreEvent>();
    const subscription = this.getRunEvents(runId).subscribe({
      next: (e) => subject.next(e),
      error: (err: unknown) => subject.error(err),
      complete: () => subject.complete(),
    });
    return {
      events$: subject.asObservable(),
      stop: () => subscription.unsubscribe(),
    };
  }

  ngOnDestroy(): void {
    this.activeSource?.close();
    this.activeSource = null;
  }
}
