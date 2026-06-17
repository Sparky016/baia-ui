import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppComponent } from './app.component';
import { appConfig } from './app.config';
import { Location } from '@angular/common';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [appConfig.providers],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'baia-ui' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('baia-ui');
  });

  it('should render navigation links', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('nav a');
    expect(links.length).toBeGreaterThan(0);
  });
});

describe('Routing', () => {
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [appConfig.providers],
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  it('should navigate to input', async () => {
    await router.navigate(['/input']);
    expect(location.path()).toBe('/input');
  });

  it('should navigate to progress with id', async () => {
    await router.navigate(['/progress', 'run-123']);
    expect(location.path()).toBe('/progress/run-123');
  });

  it('should navigate to review with id', async () => {
    await router.navigate(['/review', 'run-456']);
    expect(location.path()).toBe('/review/run-456');
  });

  it('should redirect empty path to input', async () => {
    await router.navigate(['']);
    expect(location.path()).toBe('/input');
  });
});
