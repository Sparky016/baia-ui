import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-review',
  standalone: true,
  templateUrl: './review.component.html',
  styleUrl: './review.component.css'
})
export class ReviewComponent {
  runId: string | null = null;

  constructor(private route: ActivatedRoute) {
    this.runId = this.route.snapshot.paramMap.get('id');
  }
}
