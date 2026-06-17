import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RunRequest, RunStatus } from '@baia/shared';
import { of, throwError } from 'rxjs';

import { RunsApiService } from '../core/api/runs-api.service';
import { InputComponent } from './input.component';

describe('InputComponent', () => {
  let component: InputComponent;
  let fixture: ComponentFixture<InputComponent>;
  let runsApiSpy: jasmine.SpyObj<RunsApiService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const validFormValue: RunRequest = {
    targetUrl: 'https://example.com',
    instructions: 'Navigate to the home page and verify the header.',
    repoUrl: 'https://github.com/org/repo',
    repoProvider: 'github',
    credentialsRef: 'my-github-pat',
  };

  const mockRunSummary = {
    runId: 'run-abc-123',
    status: RunStatus.Queued,
    targetUrl: 'https://example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    runsApiSpy = jasmine.createSpyObj<RunsApiService>('RunsApiService', ['createRun']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [InputComponent, ReactiveFormsModule],
      providers: [
        { provide: RunsApiService, useValue: runsApiSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form initialisation', () => {
    it('should initialise with an invalid form (all fields empty)', () => {
      expect(component.form.invalid).toBeTrue();
    });

    it('should default repoProvider to "github"', () => {
      expect(component.form.get('repoProvider')?.value).toBe('github');
    });

    it('should disable submit when form is invalid', () => {
      expect(component.isSubmitDisabled).toBeTrue();
    });
  });

  describe('URL validation', () => {
    it('should mark targetUrl as invalid when empty', () => {
      component.form.get('targetUrl')?.markAsTouched();
      expect(component.hasError('targetUrl', 'required')).toBeTrue();
    });

    it('should mark targetUrl as invalid when value is not a URL', () => {
      component.form.get('targetUrl')?.setValue('not-a-url');
      component.form.get('targetUrl')?.markAsTouched();
      expect(component.targetUrlPatternError).toBeTrue();
    });

    it('should accept a valid http targetUrl', () => {
      component.form.get('targetUrl')?.setValue('http://example.com');
      expect(component.form.get('targetUrl')?.valid).toBeTrue();
    });

    it('should accept a valid https targetUrl', () => {
      component.form.get('targetUrl')?.setValue('https://example.com/path?q=1');
      expect(component.form.get('targetUrl')?.valid).toBeTrue();
    });

    it('should mark repoUrl as invalid when not a URL', () => {
      component.form.get('repoUrl')?.setValue('just-a-name');
      component.form.get('repoUrl')?.markAsTouched();
      expect(component.repoUrlPatternError).toBeTrue();
    });

    it('should accept a valid repoUrl', () => {
      component.form.get('repoUrl')?.setValue('https://github.com/org/repo');
      expect(component.form.get('repoUrl')?.valid).toBeTrue();
    });
  });

  describe('submit gating', () => {
    it('should keep submit disabled while form is invalid', () => {
      component.form.patchValue({ targetUrl: 'not-a-url' });
      expect(component.isSubmitDisabled).toBeTrue();
    });

    it('should enable submit when all fields are valid', () => {
      component.form.patchValue(validFormValue);
      expect(component.isSubmitDisabled).toBeFalse();
    });

    it('should keep submit disabled while submission is in flight', () => {
      component.form.patchValue(validFormValue);
      component.submitting = true;
      expect(component.isSubmitDisabled).toBeTrue();
    });

    it('onSubmit should mark all controls as touched and not call API when form is invalid', () => {
      component.onSubmit();
      expect(runsApiSpy.createRun).not.toHaveBeenCalled();
      expect(component.form.touched).toBeTrue();
    });
  });

  describe('successful submission', () => {
    beforeEach(() => {
      runsApiSpy.createRun.and.returnValue(of(mockRunSummary));
      component.form.patchValue(validFormValue);
    });

    it('should call createRun with correct RunRequest', () => {
      component.onSubmit();
      expect(runsApiSpy.createRun).toHaveBeenCalledOnceWith(validFormValue);
    });

    it('should navigate to /progress/:id on success', () => {
      component.onSubmit();
      expect(routerSpy.navigate).toHaveBeenCalledOnceWith(['/progress', 'run-abc-123']);
    });

    it('should reset submitting to false after success', () => {
      component.onSubmit();
      expect(component.submitting).toBeFalse();
    });

    it('should leave submitError null after success', () => {
      component.onSubmit();
      expect(component.submitError).toBeNull();
    });
  });

  describe('submission error handling', () => {
    it('should set submitError message when API returns an Error', () => {
      runsApiSpy.createRun.and.returnValue(throwError(() => new Error('Network failure')));
      component.form.patchValue(validFormValue);
      component.onSubmit();
      expect(component.submitError).toBe('Network failure');
      expect(component.submitting).toBeFalse();
    });

    it('should set a fallback message when API returns a non-Error object', () => {
      runsApiSpy.createRun.and.returnValue(throwError(() => ({ status: 500 })));
      component.form.patchValue(validFormValue);
      component.onSubmit();
      expect(component.submitError).toBe('An unexpected error occurred. Please try again.');
      expect(component.submitting).toBeFalse();
    });

    it('should not navigate on error', () => {
      runsApiSpy.createRun.and.returnValue(throwError(() => new Error('Fail')));
      component.form.patchValue(validFormValue);
      component.onSubmit();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });

  describe('hasError helper', () => {
    it('should return false when control is pristine and untouched', () => {
      expect(component.hasError('instructions', 'required')).toBeFalse();
    });

    it('should return true only after touching a required control that is empty', () => {
      const ctrl = component.form.get('instructions');
      ctrl?.markAsTouched();
      expect(component.hasError('instructions', 'required')).toBeTrue();
    });
  });

  describe('template rendering', () => {
    it('should render a submit button', () => {
      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(btn).toBeTruthy();
    });

    it('should disable the submit button when form is invalid', () => {
      fixture.detectChanges();
      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(btn.disabled).toBeTrue();
    });

    it('should enable the submit button when form is valid', () => {
      component.form.patchValue(validFormValue);
      fixture.detectChanges();
      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(btn.disabled).toBeFalse();
    });

    it('should show targetUrl required error after touching empty field', () => {
      component.form.get('targetUrl')?.markAsTouched();
      fixture.detectChanges();
      const errEl = fixture.nativeElement.querySelector('#targetUrl-error');
      expect(errEl?.textContent?.trim()).toContain('Target URL is required');
    });

    it('should show targetUrl pattern error for an invalid URL', () => {
      component.form.get('targetUrl')?.setValue('bad-url');
      component.form.get('targetUrl')?.markAsTouched();
      fixture.detectChanges();
      const errEl = fixture.nativeElement.querySelector('#targetUrl-error');
      expect(errEl?.textContent?.trim()).toContain('valid URL');
    });

    it('should display submitError in the template', () => {
      component.submitError = 'Server error occurred';
      fixture.detectChanges();
      const errDiv = fixture.nativeElement.querySelector('.submit-error');
      expect(errDiv?.textContent).toContain('Server error occurred');
    });
  });
});
