import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-progress',
  standalone: true,
  templateUrl: './progress.component.html',
  styleUrl: './progress.component.css'
})
export class ProgressComponent {
  runId: string | null = null;

  constructor(private route: ActivatedRoute) {
    this.runId = this.route.snapshot.paramMap.get('id');
  }
}
