import { Routes } from '@angular/router';
import { InputComponent } from './input/input.component';
import { ProgressComponent } from './progress/progress.component';
import { ReviewComponent } from './review/review.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'input',
    pathMatch: 'full',
  },
  {
    path: 'input',
    component: InputComponent,
  },
  {
    path: 'progress/:id',
    component: ProgressComponent,
  },
  {
    path: 'review/:id',
    component: ReviewComponent,
  },
];
