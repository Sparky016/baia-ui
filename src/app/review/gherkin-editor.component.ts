import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  GherkinDoc,
  GherkinFeature,
  GherkinScenario,
  GherkinStep,
  StepProvenance,
} from '@baia/shared';

import { RunStore } from '../core/state/run.store';

export interface EditingTarget {
  type: 'feature' | 'scenario' | 'step';
  featureIndex: number;
  scenarioIndex?: number;
  stepIndex?: number;
}

@Component({
  selector: 'app-gherkin-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gherkin-editor.component.html',
  styleUrl: './gherkin-editor.component.css',
})
export class GherkinEditorComponent {
  private readonly store = inject(RunStore);

  /** Expose the reactive doc signal to the template. */
  readonly doc = this.store.doc;

  /** Currently active inline-edit target (null = view mode). */
  editingTarget: EditingTarget | null = null;

  /** Temporary value held while an inline edit is in progress. */
  editValue = '';

  // ── Inline-edit lifecycle ────────────────────────────────────────────────

  startEditFeature(featureIndex: number, currentName: string): void {
    this.editingTarget = { type: 'feature', featureIndex };
    this.editValue = currentName;
  }

  startEditScenario(featureIndex: number, scenarioIndex: number, currentName: string): void {
    this.editingTarget = { type: 'scenario', featureIndex, scenarioIndex };
    this.editValue = currentName;
  }

  startEditStep(
    featureIndex: number,
    scenarioIndex: number,
    stepIndex: number,
    currentText: string
  ): void {
    this.editingTarget = { type: 'step', featureIndex, scenarioIndex, stepIndex };
    this.editValue = currentText;
  }

  cancelEdit(): void {
    this.editingTarget = null;
    this.editValue = '';
  }

  confirmEdit(): void {
    const target = this.editingTarget;
    const currentDoc = this.store.doc();
    if (!target || !currentDoc) {
      this.cancelEdit();
      return;
    }

    const updatedDoc = this.applyEdit(currentDoc, target, this.editValue.trim());
    this.store.setDoc(updatedDoc);
    this.editingTarget = null;
    this.editValue = '';
  }

  // ── Edit helpers ────────────────────────────────────────────────────────

  private applyEdit(doc: GherkinDoc, target: EditingTarget, value: string): GherkinDoc {
    const features = doc.features.map((feature, fi): GherkinFeature => {
      if (fi !== target.featureIndex) return feature;

      if (target.type === 'feature') {
        return { ...feature, name: value };
      }

      const scenarios = feature.scenarios.map((scenario, si): GherkinScenario => {
        if (si !== target.scenarioIndex) return scenario;

        if (target.type === 'scenario') {
          return { ...scenario, name: value };
        }

        const steps = scenario.steps.map((step, sti): GherkinStep => {
          if (sti !== target.stepIndex) return step;
          return { ...step, text: value };
        });

        return { ...scenario, steps };
      });

      return { ...feature, scenarios };
    });

    return { ...doc, features };
  }

  // ── Edit-state query helpers ─────────────────────────────────────────────

  isEditingFeature(featureIndex: number): boolean {
    return (
      this.editingTarget?.type === 'feature' && this.editingTarget.featureIndex === featureIndex
    );
  }

  isEditingScenario(featureIndex: number, scenarioIndex: number): boolean {
    return (
      this.editingTarget?.type === 'scenario' &&
      this.editingTarget.featureIndex === featureIndex &&
      this.editingTarget.scenarioIndex === scenarioIndex
    );
  }

  isEditingStep(featureIndex: number, scenarioIndex: number, stepIndex: number): boolean {
    return (
      this.editingTarget?.type === 'step' &&
      this.editingTarget.featureIndex === featureIndex &&
      this.editingTarget.scenarioIndex === scenarioIndex &&
      this.editingTarget.stepIndex === stepIndex
    );
  }

  // ── Provenance badge helpers ─────────────────────────────────────────────

  provenanceLabel(provenance: StepProvenance): string {
    const labels: Record<StepProvenance, string> = {
      ui: 'UI',
      code: 'Code',
      merged: 'Merged',
    };
    return labels[provenance];
  }

  provenanceCssClass(provenance: StepProvenance): string {
    return `provenance-badge provenance-${provenance}`;
  }

  /** A step has a conflict indicator when provenance is 'merged'. */
  hasConflict(step: GherkinStep): boolean {
    return step.provenance === 'merged';
  }

  trackByIndex(_index: number, _item: unknown): number {
    return _index;
  }
}
