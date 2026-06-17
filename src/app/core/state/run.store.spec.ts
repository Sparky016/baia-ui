import { TestBed } from '@angular/core/testing';

import { ExploreEvent, GherkinDoc, RunStatus } from '@baia/shared';

import { RunStore } from './run.store';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEvent(
  type: ExploreEvent['type'] = 'action',
  message = 'test event'
): ExploreEvent {
  return { timestamp: new Date('2024-01-01T00:00:00Z'), type, message };
}

const stubDoc: GherkinDoc = {
  features: [
    {
      name: 'Home',
      scenarios: [
        {
          name: 'Load page',
          steps: [{ keyword: 'Given', text: 'I am on the home page', provenance: 'ui' }],
        },
      ],
    },
  ],
  generatedAt: new Date('2024-01-01T00:00:00Z'),
};

// ─── RunStore ────────────────────────────────────────────────────────────────

describe('RunStore', () => {
  let store: InstanceType<typeof RunStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RunStore],
    });
    store = TestBed.inject(RunStore);
  });

  // ─── Initial state ─────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with runId null', () => {
      expect(store.runId()).toBeNull();
    });

    it('starts with status null', () => {
      expect(store.status()).toBeNull();
    });

    it('starts with an empty events array', () => {
      expect(store.events()).toEqual([]);
    });

    it('starts with doc null', () => {
      expect(store.doc()).toBeNull();
    });

    it('starts with error null', () => {
      expect(store.error()).toBeNull();
    });
  });

  // ─── setRunId ──────────────────────────────────────────────────────────────

  describe('setRunId', () => {
    it('sets the runId', () => {
      store.setRunId('run-001');
      expect(store.runId()).toBe('run-001');
    });

    it('overwrites a previously set runId', () => {
      store.setRunId('run-001');
      store.setRunId('run-002');
      expect(store.runId()).toBe('run-002');
    });
  });

  // ─── setStatus ─────────────────────────────────────────────────────────────

  describe('setStatus', () => {
    it('transitions to Queued', () => {
      store.setStatus(RunStatus.Queued);
      expect(store.status()).toBe(RunStatus.Queued);
    });

    it('transitions to Exploring', () => {
      store.setStatus(RunStatus.Exploring);
      expect(store.status()).toBe(RunStatus.Exploring);
    });

    it('transitions to Analyzing', () => {
      store.setStatus(RunStatus.Analyzing);
      expect(store.status()).toBe(RunStatus.Analyzing);
    });

    it('transitions to Reconciling', () => {
      store.setStatus(RunStatus.Reconciling);
      expect(store.status()).toBe(RunStatus.Reconciling);
    });

    it('transitions to Review', () => {
      store.setStatus(RunStatus.Review);
      expect(store.status()).toBe(RunStatus.Review);
    });

    it('transitions to Exporting', () => {
      store.setStatus(RunStatus.Exporting);
      expect(store.status()).toBe(RunStatus.Exporting);
    });

    it('transitions to Done', () => {
      store.setStatus(RunStatus.Done);
      expect(store.status()).toBe(RunStatus.Done);
    });

    it('transitions to Failed', () => {
      store.setStatus(RunStatus.Failed);
      expect(store.status()).toBe(RunStatus.Failed);
    });

    it('can transition between statuses multiple times', () => {
      store.setStatus(RunStatus.Queued);
      store.setStatus(RunStatus.Exploring);
      store.setStatus(RunStatus.Analyzing);
      expect(store.status()).toBe(RunStatus.Analyzing);
    });
  });

  // ─── appendEvent ───────────────────────────────────────────────────────────

  describe('appendEvent', () => {
    it('appends a single event to the empty list', () => {
      const ev = makeEvent('action', 'click button');
      store.appendEvent(ev);
      expect(store.events().length).toBe(1);
      expect(store.events()[0]).toEqual(ev);
    });

    it('appends multiple events preserving order', () => {
      const ev1 = makeEvent('action', 'first');
      const ev2 = makeEvent('observation', 'second');
      const ev3 = makeEvent('complete', 'third');
      store.appendEvent(ev1);
      store.appendEvent(ev2);
      store.appendEvent(ev3);
      expect(store.events().length).toBe(3);
      expect(store.events()[0]).toEqual(ev1);
      expect(store.events()[1]).toEqual(ev2);
      expect(store.events()[2]).toEqual(ev3);
    });

    it('does not mutate previous events reference (immutable append)', () => {
      const ev1 = makeEvent('action', 'first');
      store.appendEvent(ev1);
      const snapshot = store.events();

      const ev2 = makeEvent('observation', 'second');
      store.appendEvent(ev2);

      // Original snapshot must not have grown.
      expect(snapshot.length).toBe(1);
      expect(store.events().length).toBe(2);
    });
  });

  // ─── setDoc ────────────────────────────────────────────────────────────────

  describe('setDoc', () => {
    it('stores the provided GherkinDoc', () => {
      store.setDoc(stubDoc);
      expect(store.doc()).toEqual(stubDoc);
    });

    it('replaces a previously stored doc', () => {
      const firstDoc: GherkinDoc = { features: [], generatedAt: new Date('2024-01-01') };
      store.setDoc(firstDoc);
      store.setDoc(stubDoc);
      expect(store.doc()).toEqual(stubDoc);
    });
  });

  // ─── setError ──────────────────────────────────────────────────────────────

  describe('setError', () => {
    it('stores the error message', () => {
      store.setError('Something went wrong');
      expect(store.error()).toBe('Something went wrong');
    });

    it('overwrites a previous error message', () => {
      store.setError('First error');
      store.setError('Second error');
      expect(store.error()).toBe('Second error');
    });
  });

  // ─── reset ─────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('clears all state back to initial values', () => {
      store.setRunId('run-xyz');
      store.setStatus(RunStatus.Exploring);
      store.appendEvent(makeEvent('action'));
      store.setDoc(stubDoc);
      store.setError('oops');

      store.reset();

      expect(store.runId()).toBeNull();
      expect(store.status()).toBeNull();
      expect(store.events()).toEqual([]);
      expect(store.doc()).toBeNull();
      expect(store.error()).toBeNull();
    });
  });

  // ─── isRunning computed ────────────────────────────────────────────────────

  describe('isRunning', () => {
    it('is false when status is null (initial)', () => {
      expect(store.isRunning()).toBeFalse();
    });

    it('is true when status is Queued', () => {
      store.setStatus(RunStatus.Queued);
      expect(store.isRunning()).toBeTrue();
    });

    it('is true when status is Exploring', () => {
      store.setStatus(RunStatus.Exploring);
      expect(store.isRunning()).toBeTrue();
    });

    it('is true when status is Analyzing', () => {
      store.setStatus(RunStatus.Analyzing);
      expect(store.isRunning()).toBeTrue();
    });

    it('is true when status is Reconciling', () => {
      store.setStatus(RunStatus.Reconciling);
      expect(store.isRunning()).toBeTrue();
    });

    it('is true when status is Exporting', () => {
      store.setStatus(RunStatus.Exporting);
      expect(store.isRunning()).toBeTrue();
    });

    it('is false when status is Review', () => {
      store.setStatus(RunStatus.Review);
      expect(store.isRunning()).toBeFalse();
    });

    it('is false when status is Done', () => {
      store.setStatus(RunStatus.Done);
      expect(store.isRunning()).toBeFalse();
    });

    it('is false when status is Failed', () => {
      store.setStatus(RunStatus.Failed);
      expect(store.isRunning()).toBeFalse();
    });

    it('transitions from true to false when reaching Done', () => {
      store.setStatus(RunStatus.Exploring);
      expect(store.isRunning()).toBeTrue();
      store.setStatus(RunStatus.Done);
      expect(store.isRunning()).toBeFalse();
    });

    it('returns false after reset', () => {
      store.setStatus(RunStatus.Exploring);
      store.reset();
      expect(store.isRunning()).toBeFalse();
    });
  });

  // ─── canExport computed ────────────────────────────────────────────────────

  describe('canExport', () => {
    it('is false when status is null (initial)', () => {
      expect(store.canExport()).toBeFalse();
    });

    it('is false when status is Queued', () => {
      store.setStatus(RunStatus.Queued);
      expect(store.canExport()).toBeFalse();
    });

    it('is false when status is Exploring', () => {
      store.setStatus(RunStatus.Exploring);
      expect(store.canExport()).toBeFalse();
    });

    it('is false when status is Analyzing', () => {
      store.setStatus(RunStatus.Analyzing);
      expect(store.canExport()).toBeFalse();
    });

    it('is false when status is Reconciling', () => {
      store.setStatus(RunStatus.Reconciling);
      expect(store.canExport()).toBeFalse();
    });

    it('is true when status is Review', () => {
      store.setStatus(RunStatus.Review);
      expect(store.canExport()).toBeTrue();
    });

    it('is false when status is Exporting', () => {
      store.setStatus(RunStatus.Exporting);
      expect(store.canExport()).toBeFalse();
    });

    it('is false when status is Done', () => {
      store.setStatus(RunStatus.Done);
      expect(store.canExport()).toBeFalse();
    });

    it('is false when status is Failed', () => {
      store.setStatus(RunStatus.Failed);
      expect(store.canExport()).toBeFalse();
    });

    it('transitions from false to true on entering Review', () => {
      store.setStatus(RunStatus.Reconciling);
      expect(store.canExport()).toBeFalse();
      store.setStatus(RunStatus.Review);
      expect(store.canExport()).toBeTrue();
    });

    it('transitions from true to false on moving from Review to Exporting', () => {
      store.setStatus(RunStatus.Review);
      expect(store.canExport()).toBeTrue();
      store.setStatus(RunStatus.Exporting);
      expect(store.canExport()).toBeFalse();
    });

    it('returns false after reset', () => {
      store.setStatus(RunStatus.Review);
      store.reset();
      expect(store.canExport()).toBeFalse();
    });
  });
});
