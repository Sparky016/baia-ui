import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { GherkinDoc, GherkinStep } from '@baia/shared';

import { RunStore } from '../core/state/run.store';

import { GherkinEditorComponent } from './gherkin-editor.component';

const SAMPLE_DOC: GherkinDoc = {
  generatedAt: new Date('2025-01-01T00:00:00.000Z'),
  features: [
    {
      name: 'User Login',
      description: 'As a user I want to log in.',
      scenarios: [
        {
          name: 'Successful login',
          steps: [
            { keyword: 'Given', text: 'the user is on the login page', provenance: 'ui' },
            { keyword: 'When', text: 'the user enters valid credentials', provenance: 'code' },
            {
              keyword: 'Then',
              text: 'the user is redirected to the dashboard',
              provenance: 'merged',
            },
          ],
        },
      ],
    },
    {
      name: 'User Logout',
      scenarios: [
        {
          name: 'Logout clears session',
          steps: [{ keyword: 'Given', text: 'the user is logged in', provenance: 'ui' }],
        },
      ],
    },
  ],
};

/** Minimal mock of RunStore — avoids the NgRx/Signals provider chain. */
const buildMockStore = (initialDoc: GherkinDoc | null = SAMPLE_DOC) => {
  let currentDoc = initialDoc;
  return {
    doc: () => currentDoc,
    setDoc: (doc: GherkinDoc) => {
      currentDoc = doc;
    },
    /** Allow tests to inspect the latest doc that was set. */
    _getDoc: () => currentDoc,
  };
};

describe('GherkinEditorComponent', () => {
  let component: GherkinEditorComponent;
  let fixture: ComponentFixture<GherkinEditorComponent>;
  let mockStore: ReturnType<typeof buildMockStore>;

  beforeEach(async () => {
    mockStore = buildMockStore();

    await TestBed.configureTestingModule({
      imports: [GherkinEditorComponent],
      providers: [{ provide: RunStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(GherkinEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the "no-doc" placeholder when doc is null', async () => {
    const nullStore = buildMockStore(null);
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [GherkinEditorComponent],
      providers: [{ provide: RunStore, useValue: nullStore }],
    }).compileComponents();
    const f = TestBed.createComponent(GherkinEditorComponent);
    f.detectChanges();
    const el = f.debugElement.query(By.css('[data-testid="no-doc"]'));
    expect(el).toBeTruthy();
  });

  it('renders all features from the doc', () => {
    const features = fixture.debugElement.queryAll(By.css('[data-testid="feature"]'));
    expect(features.length).toBe(2);
  });

  it('renders feature names', () => {
    const names = fixture.debugElement.queryAll(By.css('[data-testid="feature-name"]'));
    expect(names[0].nativeElement.textContent.trim()).toBe('User Login');
    expect(names[1].nativeElement.textContent.trim()).toBe('User Logout');
  });

  it('renders all scenarios', () => {
    const scenarios = fixture.debugElement.queryAll(By.css('[data-testid="scenario"]'));
    expect(scenarios.length).toBe(2);
  });

  it('renders scenario names', () => {
    const names = fixture.debugElement.queryAll(By.css('[data-testid="scenario-name"]'));
    expect(names[0].nativeElement.textContent.trim()).toBe('Successful login');
    expect(names[1].nativeElement.textContent.trim()).toBe('Logout clears session');
  });

  it('renders all steps', () => {
    const steps = fixture.debugElement.queryAll(By.css('[data-testid="step"]'));
    expect(steps.length).toBe(4); // 3 + 1
  });

  it('renders step text', () => {
    const stepTexts = fixture.debugElement.queryAll(By.css('[data-testid="step-text"]'));
    expect(stepTexts[0].nativeElement.textContent.trim()).toBe('the user is on the login page');
  });

  // ── Provenance badges ────────────────────────────────────────────────────

  it('renders a provenance badge per step', () => {
    const badges = fixture.debugElement.queryAll(By.css('[data-testid="provenance-badge"]'));
    expect(badges.length).toBe(4);
  });

  it('displays correct label for ui provenance', () => {
    const badges = fixture.debugElement.queryAll(By.css('[data-testid="provenance-badge"]'));
    expect(badges[0].nativeElement.textContent.trim()).toBe('UI');
  });

  it('displays correct label for code provenance', () => {
    const badges = fixture.debugElement.queryAll(By.css('[data-testid="provenance-badge"]'));
    expect(badges[1].nativeElement.textContent.trim()).toBe('Code');
  });

  it('displays correct label for merged provenance', () => {
    const badges = fixture.debugElement.queryAll(By.css('[data-testid="provenance-badge"]'));
    expect(badges[2].nativeElement.textContent.trim()).toBe('Merged');
  });

  it('applies provenance-ui css class to a ui step badge', () => {
    const badges = fixture.debugElement.queryAll(By.css('[data-testid="provenance-badge"]'));
    expect(badges[0].nativeElement.classList).toContain('provenance-ui');
  });

  it('applies provenance-code css class to a code step badge', () => {
    const badges = fixture.debugElement.queryAll(By.css('[data-testid="provenance-badge"]'));
    expect(badges[1].nativeElement.classList).toContain('provenance-code');
  });

  it('applies provenance-merged css class to a merged step badge', () => {
    const badges = fixture.debugElement.queryAll(By.css('[data-testid="provenance-badge"]'));
    expect(badges[2].nativeElement.classList).toContain('provenance-merged');
  });

  // ── Conflict indicators ──────────────────────────────────────────────────

  it('renders a conflict indicator only on merged steps', () => {
    const indicators = fixture.debugElement.queryAll(By.css('[data-testid="conflict-indicator"]'));
    expect(indicators.length).toBe(1);
  });

  it('adds has-conflict class to the merged step li', () => {
    const steps = fixture.debugElement.queryAll(By.css('[data-testid="step"]'));
    // index 2 is the merged step
    expect(steps[2].nativeElement.classList).toContain('has-conflict');
  });

  it('does not add has-conflict class to ui steps', () => {
    const steps = fixture.debugElement.queryAll(By.css('[data-testid="step"]'));
    expect(steps[0].nativeElement.classList).not.toContain('has-conflict');
  });

  // ── Inline edit — feature ────────────────────────────────────────────────

  it('enters edit mode when a feature name is clicked', () => {
    const featureName = fixture.debugElement.query(By.css('[data-testid="feature-name"]'));
    featureName.nativeElement.click();
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('[data-testid="edit-input"]'));
    expect(input).toBeTruthy();
    expect(component.editValue).toBe('User Login');
  });

  it('cancels feature edit on cancel button click', () => {
    component.startEditFeature(0, 'User Login');
    fixture.detectChanges();
    const cancelBtn = fixture.debugElement.query(By.css('[data-testid="btn-cancel"]'));
    cancelBtn.nativeElement.click();
    fixture.detectChanges();
    expect(component.editingTarget).toBeNull();
  });

  it('confirms feature edit and updates the store', () => {
    const setDocSpy = spyOn(mockStore, 'setDoc').and.callThrough();

    component.startEditFeature(0, 'User Login');
    component.editValue = 'Updated Feature';
    component.confirmEdit();

    expect(setDocSpy).toHaveBeenCalledTimes(1);
    const updatedDoc = setDocSpy.calls.mostRecent().args[0] as GherkinDoc;
    expect(updatedDoc.features[0].name).toBe('Updated Feature');
  });

  it('restores view mode after confirming feature edit', () => {
    component.startEditFeature(0, 'User Login');
    component.editValue = 'New Name';
    component.confirmEdit();
    fixture.detectChanges();
    expect(component.editingTarget).toBeNull();
  });

  // ── Inline edit — scenario ───────────────────────────────────────────────

  it('enters edit mode when a scenario name is clicked', () => {
    const scenarioName = fixture.debugElement.query(By.css('[data-testid="scenario-name"]'));
    scenarioName.nativeElement.click();
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('[data-testid="edit-input"]'));
    expect(input).toBeTruthy();
    expect(component.editValue).toBe('Successful login');
  });

  it('confirms scenario edit and updates the store', () => {
    const setDocSpy = spyOn(mockStore, 'setDoc').and.callThrough();

    component.startEditScenario(0, 0, 'Successful login');
    component.editValue = 'Updated Scenario';
    component.confirmEdit();

    expect(setDocSpy).toHaveBeenCalledTimes(1);
    const updatedDoc = setDocSpy.calls.mostRecent().args[0] as GherkinDoc;
    expect(updatedDoc.features[0].scenarios[0].name).toBe('Updated Scenario');
  });

  // ── Inline edit — step ───────────────────────────────────────────────────

  it('enters edit mode when a step text is clicked', () => {
    const stepText = fixture.debugElement.query(By.css('[data-testid="step-text"]'));
    stepText.nativeElement.click();
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('[data-testid="edit-input"]'));
    expect(input).toBeTruthy();
    expect(component.editValue).toBe('the user is on the login page');
  });

  it('confirms step edit and updates only the edited step in the store', () => {
    const setDocSpy = spyOn(mockStore, 'setDoc').and.callThrough();

    component.startEditStep(0, 0, 0, 'the user is on the login page');
    component.editValue = 'the admin is on the login page';
    component.confirmEdit();

    expect(setDocSpy).toHaveBeenCalledTimes(1);
    const updatedDoc = setDocSpy.calls.mostRecent().args[0] as GherkinDoc;
    expect(updatedDoc.features[0].scenarios[0].steps[0].text).toBe(
      'the admin is on the login page'
    );
    // Other steps untouched
    expect(updatedDoc.features[0].scenarios[0].steps[1].text).toBe(
      'the user enters valid credentials'
    );
  });

  it('step edit preserves provenance', () => {
    const setDocSpy = spyOn(mockStore, 'setDoc').and.callThrough();
    component.startEditStep(0, 0, 0, 'the user is on the login page');
    component.editValue = 'updated text';
    component.confirmEdit();

    const updatedDoc = setDocSpy.calls.mostRecent().args[0] as GherkinDoc;
    const step: GherkinStep = updatedDoc.features[0].scenarios[0].steps[0];
    expect(step.provenance).toBe('ui');
  });

  it('does not call setDoc when confirmEdit is called without an active edit', () => {
    const setDocSpy = spyOn(mockStore, 'setDoc');
    component.editingTarget = null;
    component.confirmEdit();
    expect(setDocSpy).not.toHaveBeenCalled();
  });

  // ── Helper unit tests ────────────────────────────────────────────────────

  it('provenanceLabel returns correct labels', () => {
    expect(component.provenanceLabel('ui')).toBe('UI');
    expect(component.provenanceLabel('code')).toBe('Code');
    expect(component.provenanceLabel('merged')).toBe('Merged');
  });

  it('provenanceCssClass returns the correct compound class string', () => {
    expect(component.provenanceCssClass('ui')).toBe('provenance-badge provenance-ui');
    expect(component.provenanceCssClass('code')).toBe('provenance-badge provenance-code');
    expect(component.provenanceCssClass('merged')).toBe('provenance-badge provenance-merged');
  });

  it('hasConflict returns true only for merged steps', () => {
    const uiStep: GherkinStep = { keyword: 'Given', text: 'x', provenance: 'ui' };
    const codeStep: GherkinStep = { keyword: 'When', text: 'y', provenance: 'code' };
    const mergedStep: GherkinStep = { keyword: 'Then', text: 'z', provenance: 'merged' };
    expect(component.hasConflict(uiStep)).toBeFalse();
    expect(component.hasConflict(codeStep)).toBeFalse();
    expect(component.hasConflict(mergedStep)).toBeTrue();
  });

  it('isEditingFeature returns true only for the active feature', () => {
    component.startEditFeature(1, 'User Logout');
    expect(component.isEditingFeature(1)).toBeTrue();
    expect(component.isEditingFeature(0)).toBeFalse();
  });

  it('isEditingScenario returns true only for the active scenario', () => {
    component.startEditScenario(0, 0, 'Successful login');
    expect(component.isEditingScenario(0, 0)).toBeTrue();
    expect(component.isEditingScenario(0, 1)).toBeFalse();
    expect(component.isEditingScenario(1, 0)).toBeFalse();
  });

  it('isEditingStep returns true only for the active step', () => {
    component.startEditStep(0, 0, 1, 'when text');
    expect(component.isEditingStep(0, 0, 1)).toBeTrue();
    expect(component.isEditingStep(0, 0, 0)).toBeFalse();
    expect(component.isEditingStep(1, 0, 1)).toBeFalse();
  });

  it('cancelEdit clears editingTarget and editValue', () => {
    component.startEditFeature(0, 'User Login');
    component.cancelEdit();
    expect(component.editingTarget).toBeNull();
    expect(component.editValue).toBe('');
  });
});
