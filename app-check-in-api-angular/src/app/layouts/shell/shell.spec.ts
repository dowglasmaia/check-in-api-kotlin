import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestScenarios } from '../../features/test-data/public-api';
import { Shell } from './shell';

@Component({ selector: 'app-dummy', template: 'page' })
class Dummy {}

function configure(testDataAvailable: boolean) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        {
          path: '',
          component: Shell,
          children: [
            { path: 'search', component: Dummy },
            { path: 'flights', component: Dummy, data: { step: 1 } },
            { path: 'confirmation', component: Dummy, data: { step: 3 } },
          ],
        },
      ]),
      {
        provide: TestScenarios,
        useValue: {
          available: signal(testDataAvailable),
          scenarios: signal([]),
          loading: signal(false),
          notice: signal(''),
        },
      },
    ],
  });
  return RouterTestingHarness.create();
}

describe('Shell', () => {
  it('hides the stepper on pages without a step', async () => {
    const harness = await configure(true);
    await harness.navigateByUrl('/search');
    expect(
      (harness.routeNativeElement as HTMLElement).ownerDocument.querySelector(
        'nav[aria-label=Progress]',
      ),
    ).toBeNull();
  });

  it('marks earlier steps as done and the current one as current', async () => {
    const harness = await configure(true);
    await harness.navigateByUrl('/flights');
    const el = harness.fixture.nativeElement as HTMLElement;
    const steps = el.querySelectorAll('nav[aria-label=Progress] li');
    expect(steps).toHaveLength(4);
    expect(steps[1].getAttribute('aria-current')).toBe('step');
    expect(steps[0].textContent).toContain('✓');
    expect(steps[2].getAttribute('aria-current')).toBeNull();
  });

  it('follows the route to the last step', async () => {
    const harness = await configure(true);
    await harness.navigateByUrl('/confirmation');
    const steps = (harness.fixture.nativeElement as HTMLElement).querySelectorAll(
      'nav[aria-label=Progress] li',
    );
    expect(steps[3].getAttribute('aria-current')).toBe('step');
  });

  it('shows the test-data link only when the API serves demo data', async () => {
    const withData = await configure(true);
    await withData.navigateByUrl('/search');
    expect(
      (withData.fixture.nativeElement as HTMLElement).querySelector('a[href="/test-data"]'),
    ).not.toBeNull();
  });

  it('hides the test-data link when demo data is disabled', async () => {
    const withoutData = await configure(false);
    await withoutData.navigateByUrl('/search');
    expect(
      (withoutData.fixture.nativeElement as HTMLElement).querySelector('a[href="/test-data"]'),
    ).toBeNull();
  });

  it('has a skip link and a labelled help button', async () => {
    const harness = await configure(true);
    await harness.navigateByUrl('/search');
    const el = harness.fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="#content"]')).not.toBeNull();
    expect(el.querySelector('button[aria-label=Help]')).not.toBeNull();
  });
});
