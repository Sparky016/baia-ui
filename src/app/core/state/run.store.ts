import { computed } from '@angular/core';
import { ExploreEvent, GherkinDoc, RunStatus } from '@baia/shared';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

export interface RunState {
  runId: string | null;
  status: RunStatus | null;
  events: ExploreEvent[];
  doc: GherkinDoc | null;
  error: string | null;
}

const initialState: RunState = {
  runId: null,
  status: null,
  events: [],
  doc: null,
  error: null,
};

/** Statuses considered "actively running" — used for isRunning computed. */
const RUNNING_STATUSES: ReadonlySet<RunStatus> = new Set<RunStatus>([
  RunStatus.Queued,
  RunStatus.Exploring,
  RunStatus.Analyzing,
  RunStatus.Reconciling,
  RunStatus.Exporting,
]);

/** The run is exportable only when it has reached the Review stage. */
const EXPORTABLE_STATUS: RunStatus = RunStatus.Review;

export const RunStore = signalStore(
  { providedIn: 'root' },
  withState<RunState>(initialState),
  withComputed((store) => ({
    /** True while the run is in any non-terminal, non-review active state. */
    isRunning: computed(() => {
      const s = store.status();
      return s !== null && RUNNING_STATUSES.has(s);
    }),
    /** True only when the run is in Review — i.e. ready for Confluence export. */
    canExport: computed(() => store.status() === EXPORTABLE_STATUS),
  })),
  withMethods((store) => ({
    /** Transition to a new RunStatus. */
    setStatus(status: RunStatus): void {
      patchState(store, { status });
    },

    /** Record the active run identifier. */
    setRunId(runId: string): void {
      patchState(store, { runId });
    },

    /** Append a single progress event to the events list. */
    appendEvent(event: ExploreEvent): void {
      patchState(store, (state) => ({ events: [...state.events, event] }));
    },

    /** Replace the unified Gherkin document (set after reconciliation). */
    setDoc(doc: GherkinDoc): void {
      patchState(store, { doc });
    },

    /** Record an error message (transitions UI into error presentation state). */
    setError(error: string): void {
      patchState(store, { error });
    },

    /** Reset the entire store to its initial (idle) state. */
    reset(): void {
      patchState(store, initialState);
    },
  }))
);
