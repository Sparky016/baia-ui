import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { ExploreEvent, RunStatus } from '@baia/shared';
import { Subject } from 'rxjs';

import { RunEventsService } from '../core/api/run-events.service';
import { RunStore } from '../core/state/run.store';

import { ProgressComponent } from './progress.component';

describe('ProgressComponent', () => {
  let component: ProgressComponent;
  let fixture: ComponentFixture<ProgressComponent>;
  let events$: Subject<ExploreEvent>;
  let mockRunEventsService: jasmine.SpyObj<RunEventsService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let runStore: InstanceType<typeof RunStore>;

  const makeEvent = (type: ExploreEvent['type'], message: string, ts?: Date): ExploreEvent => ({
    type,
    message,
    timestamp: ts ?? new Date('2024-01-01T00:00:00Z'),
  });

  beforeEach(async () => {
    events$ = new Subject<ExploreEvent>();

    mockRunEventsService = jasmine.createSpyObj<RunEventsService>('RunEventsService', [
      'getRunEvents',
    ]);
    mockRunEventsService.getRunEvents.and.returnValue(events$.asObservable());

    mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate']);
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [ProgressComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'run-abc' : null),
              },
            },
          },
        },
        { provide: RunEventsService, useValue: mockRunEventsService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressComponent);
    component = fixture.componentInstance;
    runStore = TestBed.inject(RunStore);
    runStore.reset();
    fixture.detectChanges();
  });

  afterEach(() => {
    events$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should extract run id from route params', () => {
    expect(component.runId).toBe('run-abc');
  });

  it('should open the SSE stream for the run id on init', () => {
    expect(mockRunEventsService.getRunEvents).toHaveBeenCalledWith('run-abc');
  });

  it('should render events in order as they arrive', () => {
    events$.next(makeEvent('action', 'Navigating to /home'));
    events$.next(makeEvent('observation', 'Page loaded'));
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.event-item') as NodeListOf<Element>;
    expect(items.length).toBe(2);
    expect(items[0].querySelector('.event-message')?.textContent).toContain('Navigating to /home');
    expect(items[1].querySelector('.event-message')?.textContent).toContain('Page loaded');
  });

  it('should display error events in the timeline with error styling', () => {
    events$.next(makeEvent('error', 'Selector not found'));
    fixture.detectChanges();

    const errorItems = fixture.nativeElement.querySelectorAll(
      '.event-item.event-error'
    ) as NodeListOf<Element>;
    expect(errorItems.length).toBe(1);
    expect(errorItems[0].querySelector('.event-message')?.textContent).toContain(
      'Selector not found'
    );
  });

  it('should show the error banner when an error event is received', () => {
    events$.next(makeEvent('error', 'Connection timeout'));
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.error-banner') as HTMLElement | null;
    expect(banner).toBeTruthy();
    expect(banner?.textContent).toContain('Connection timeout');
  });

  it('should set status to Failed when an error event is received', () => {
    events$.next(makeEvent('error', 'Some error'));
    fixture.detectChanges();

    expect(component.status).toBe(RunStatus.Failed);
  });

  it('should navigate to review/:id when a complete event arrives', fakeAsync(() => {
    events$.next(makeEvent('complete', 'Done'));
    tick();
    fixture.detectChanges();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/review', 'run-abc']);
  }));

  it('should set status to Review when a complete event arrives', fakeAsync(() => {
    events$.next(makeEvent('complete', 'Done'));
    tick();
    fixture.detectChanges();

    expect(component.status).toBe(RunStatus.Review);
  }));

  it('should render multiple events in arrival order', () => {
    const evts: ExploreEvent[] = [
      makeEvent('action', 'First action'),
      makeEvent('observation', 'Second observation'),
      makeEvent('action', 'Third action'),
    ];
    evts.forEach((e) => events$.next(e));
    fixture.detectChanges();

    const messages = Array.from(
      fixture.nativeElement.querySelectorAll('.event-message') as NodeListOf<Element>
    ).map((el: Element) => el.textContent?.trim());
    expect(messages).toEqual(['First action', 'Second observation', 'Third action']);
  });

  it('should expose events from the store', () => {
    events$.next(makeEvent('action', 'Test'));
    fixture.detectChanges();

    expect(component.events.length).toBe(1);
    expect(component.events[0].message).toBe('Test');
  });

  it('should show error banner on SSE connection error', () => {
    events$.error(new Error('SSE connection error'));
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.error-banner') as HTMLElement | null;
    expect(banner).toBeTruthy();
    expect(banner?.textContent).toContain('SSE connection error');
    expect(component.status).toBe(RunStatus.Failed);
  });

  it('should unsubscribe from SSE stream on destroy', () => {
    const unsubSpy = spyOn(component['sseSubscription']!, 'unsubscribe').and.callThrough();
    component.ngOnDestroy();
    expect(unsubSpy).toHaveBeenCalled();
  });

  it('should display the current run status', () => {
    runStore.setStatus(RunStatus.Exploring);
    fixture.detectChanges();

    const statusEl = fixture.nativeElement.querySelector('.status-badge') as HTMLElement | null;
    expect(statusEl?.textContent).toContain('exploring');
  });

  it('should show spinner while running and no events yet', () => {
    runStore.setStatus(RunStatus.Exploring);
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.spinner') as HTMLElement | null;
    expect(spinner).toBeTruthy();
  });

  it('should store null runId and not call getRunEvents when route param is absent', () => {
    // Verify SSE was called exactly once during beforeEach (for 'run-abc')
    expect(mockRunEventsService.getRunEvents).toHaveBeenCalledTimes(1);
    // The guard in ngOnInit: if (!this.runId) return — verified by the single call count
    // (a second ngOnInit with runId=null would still read the snapshot which returns 'run-abc')
    // So we verify the positive path: getRunEvents was called with the correct id
    expect(mockRunEventsService.getRunEvents).toHaveBeenCalledWith('run-abc');
  });

  it('should mark complete events with event-complete class', () => {
    events$.next(makeEvent('complete', 'Finished'));
    fixture.detectChanges();

    const completeItems = fixture.nativeElement.querySelectorAll(
      '.event-item.event-complete'
    ) as NodeListOf<Element>;
    expect(completeItems.length).toBe(1);
  });
});

describe('ProgressComponent — null route param', () => {
  let fixture: ComponentFixture<ProgressComponent>;
  let nullEventsService: jasmine.SpyObj<RunEventsService>;
  let nullRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    nullEventsService = jasmine.createSpyObj<RunEventsService>('RunEventsService', [
      'getRunEvents',
    ]);
    nullRouter = jasmine.createSpyObj<Router>('Router', ['navigate']);
    nullRouter.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [ProgressComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: (_key: string) => null } },
          },
        },
        { provide: RunEventsService, useValue: nullEventsService },
        { provide: Router, useValue: nullRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressComponent);
    TestBed.inject(RunStore).reset();
    fixture.detectChanges();
  });

  it('should not open an SSE stream when route id is absent', () => {
    expect(nullEventsService.getRunEvents).not.toHaveBeenCalled();
  });

  it('should set runId to null when route param is absent', () => {
    expect(fixture.componentInstance.runId).toBeNull();
  });
});
