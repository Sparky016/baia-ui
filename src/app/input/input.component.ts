import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RunRequest } from '@baia/shared';

import { RunsApiService } from '../core/api/runs-api.service';

/** Strongly-typed form value for the input form. */
interface InputFormValue {
  targetUrl: string;
  instructions: string;
  repoUrl: string;
  repoProvider: 'github' | 'azure';
  credentialsRef: string;
}

/** Regex pattern for basic URL validation (http/https). */
const URL_PATTERN = /^https?:\/\/.+/;

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.css',
})
export class InputComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly runsApi = inject(RunsApiService);
  private readonly router = inject(Router);

  form!: FormGroup;
  submitting = false;
  submitError: string | null = null;

  ngOnInit(): void {
    this.form = this.fb.group({
      targetUrl: ['', [Validators.required, Validators.pattern(URL_PATTERN)]],
      instructions: ['', [Validators.required]],
      repoUrl: ['', [Validators.required, Validators.pattern(URL_PATTERN)]],
      repoProvider: ['github' as 'github' | 'azure', [Validators.required]],
      credentialsRef: ['', [Validators.required]],
    });
  }

  /** Convenience getter: true when the form is invalid or a submission is in flight. */
  get isSubmitDisabled(): boolean {
    return this.form.invalid || this.submitting;
  }

  /** Whether a specific control has a validation error that should be shown. */
  hasError(controlName: keyof InputFormValue, errorCode: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.hasError(errorCode) && (control.dirty || control.touched);
  }

  /** Whether the targetUrl field should show URL-format error. */
  get targetUrlPatternError(): boolean {
    return this.hasError('targetUrl', 'pattern');
  }

  /** Whether the repoUrl field should show URL-format error. */
  get repoUrlPatternError(): boolean {
    return this.hasError('repoUrl', 'pattern');
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.submitError = null;

    const value = this.form.value as InputFormValue;
    const request: RunRequest = {
      targetUrl: value.targetUrl,
      instructions: value.instructions,
      repoUrl: value.repoUrl,
      repoProvider: value.repoProvider,
      credentialsRef: value.credentialsRef,
    };

    this.runsApi.createRun(request).subscribe({
      next: (run) => {
        this.submitting = false;
        void this.router.navigate(['/progress', run.runId]);
      },
      error: (err: unknown) => {
        this.submitting = false;
        this.submitError =
          err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      },
    });
  }
}
