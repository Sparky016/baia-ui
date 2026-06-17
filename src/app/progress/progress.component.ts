import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExploreEvent, RunStatus } from '@baia/shared';
import { Subscription } from 'rxjs';

import { RunEventsService } from '../core/api/run-events.service';
import { RunStore } from '../core/state/run.store';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress.component.html',
  styleUrl: './progress.component.css',
})
export class ProgressComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly runEventsService = inject(RunEventsService);
  readonly store = inject(RunStore);

  runId: string | null = null;

  private sseSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.runId = this.route.snapshot.paramMap.get('id');

    if (this.runId) {
      this.store.setRunId(this.runId);
      this.startSseStream(this.runId);
    }
  }

  ngOnDestroy(): void {
    this.sseSubscription?.unsubscribe();
    this.sseSubscription = null;
  }

  private startSseStream(runId: string): void {
    this.sseSubscription = this.runEventsService.getRunEvents(runId).subscribe({
      next: (event: ExploreEvent) => {
        this.store.appendEvent(event);

        if (event.type === 'error') {
          this.store.setError(event.message);
          this.store.setStatus(RunStatus.Failed);
        } else if (event.type === 'complete') {
          this.store.setStatus(RunStatus.Review);
          void this.router.navigate(['/review', runId]);
        }
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'SSE connection failed';
        this.store.setError(msg);
        this.store.setStatus(RunStatus.Failed);
      },
    });
  }

  /** Expose RunStatus enum to the template. */
  readonly RunStatus = RunStatus;

  get events(): ExploreEvent[] {
    return this.store.events();
  }

  get status(): RunStatus | null {
    return this.store.status();
  }

  get errorMessage(): string | null {
    return this.store.error();
  }

  get isRunning(): boolean {
    return this.store.isRunning();
  }
}
