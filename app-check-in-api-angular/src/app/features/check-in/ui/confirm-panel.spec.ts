import { TestBed } from '@angular/core/testing';
import { flightView } from '../testing/fixtures';
import { TestPassenger } from '../../test-data/public-api';
import { ConfirmPanel } from './confirm-panel';

const PASSENGERS: TestPassenger[] = [
  { passengerId: 'P-004', name: 'Ana Costa' },
  { passengerId: 'P-005', name: 'Bruno Lima' },
];

type Fixture = ReturnType<typeof TestBed.createComponent<ConfirmPanel>>;

describe('ConfirmPanel', () => {
  async function setup(
    inputs: { passengerKnown?: boolean; submitting?: boolean; suggestions?: TestPassenger[] } = {},
  ) {
    const fixture = TestBed.createComponent(ConfirmPanel);
    fixture.componentRef.setInput('flight', flightView());
    fixture.componentRef.setInput('passengerKnown', inputs.passengerKnown ?? false);
    fixture.componentRef.setInput('submitting', inputs.submitting ?? false);
    fixture.componentRef.setInput('suggestions', inputs.suggestions ?? []);
    const confirmed: (string | undefined)[] = [];
    fixture.componentInstance.confirm.subscribe((code) => confirmed.push(code));
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement, confirmed };
  }

  async function submit(fixture: Fixture) {
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('summarizes the trip', async () => {
    const { fixture, el } = await setup();
    await fixture.whenStable();
    expect(el.textContent).toContain('GRU → LIS');
    expect(el.textContent).toContain('MF 214');
    expect(el.textContent).toContain(
      'Boarding gate and time are issued once check-in is confirmed.',
    );
  });

  it('requires a passenger code when the passenger is not known', async () => {
    const { fixture, el, confirmed } = await setup();
    await submit(fixture);
    expect(confirmed).toEqual([]);
    expect(el.querySelector('[role=alert]')?.textContent).toContain(
      'Enter the passenger code to continue.',
    );
  });

  it('emits the trimmed passenger code', async () => {
    const { fixture, el, confirmed } = await setup();
    const input = el.querySelector<HTMLInputElement>('#passenger-code')!;
    input.value = ' P-004 ';
    input.dispatchEvent(new Event('input'));
    await submit(fixture);
    expect(confirmed).toEqual(['P-004']);
  });

  describe('test passenger suggestions', () => {
    it('lists the passengers of the flight and pre-fills the first one', async () => {
      const { el, confirmed, fixture } = await setup({ suggestions: PASSENGERS });
      expect(el.textContent).toContain('Test passengers on this flight');
      expect(el.textContent).toContain('Ana Costa');
      expect(el.textContent).toContain('Bruno Lima');
      expect(el.querySelector<HTMLInputElement>('#passenger-code')!.value).toBe('P-004');

      await submit(fixture);
      expect(confirmed).toEqual(['P-004']);
    });

    it('switches the code when another passenger is picked', async () => {
      const { el, fixture, confirmed } = await setup({ suggestions: PASSENGERS });
      const chips = el.querySelectorAll<HTMLButtonElement>('button[aria-pressed]');
      expect(chips[0].getAttribute('aria-pressed')).toBe('true');

      chips[1].click();
      await fixture.whenStable();
      expect(el.querySelector<HTMLInputElement>('#passenger-code')!.value).toBe('P-005');
      expect(chips[1].getAttribute('aria-pressed')).toBe('true');

      await submit(fixture);
      expect(confirmed).toEqual(['P-005']);
    });

    it('does not override what the user already typed', async () => {
      const { el, fixture, confirmed } = await setup();
      const input = el.querySelector<HTMLInputElement>('#passenger-code')!;
      input.value = 'P-009';
      input.dispatchEvent(new Event('input'));
      fixture.componentRef.setInput('suggestions', PASSENGERS);
      await submit(fixture);
      expect(confirmed).toEqual(['P-009']);
    });

    it('shows no suggestions when demo data is off', async () => {
      const { el } = await setup();
      expect(el.textContent).not.toContain('Test passengers');
      expect(el.querySelector<HTMLInputElement>('#passenger-code')!.value).toBe('');
    });

    it('does not suggest anyone when the passenger is already known', async () => {
      const { el } = await setup({ passengerKnown: true, suggestions: PASSENGERS });
      expect(el.textContent).not.toContain('Test passengers');
    });
  });

  describe('when check-in is not available', () => {
    it('replaces the form with a disabled action and a way back', async () => {
      const { fixture, el } = await setup();
      fixture.componentRef.setInput('unavailable', true);
      await fixture.whenStable();

      expect(el.querySelector('form')).toBeNull();
      expect(el.querySelector('button[disabled]')?.textContent).toContain('Check-in not available');
      expect(el.textContent).toContain('Back to my flights');
    });

    it('emits back', async () => {
      const { fixture, el } = await setup();
      fixture.componentRef.setInput('unavailable', true);
      await fixture.whenStable();
      let backs = 0;
      fixture.componentInstance.back.subscribe(() => backs++);

      Array.from(el.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Back to my flights'))!
        .click();
      expect(backs).toBe(1);
    });

    it('hides the passenger note', async () => {
      const { fixture, el } = await setup({ passengerKnown: true });
      fixture.componentRef.setInput('unavailable', true);
      await fixture.whenStable();
      expect(el.textContent).not.toContain('Passenger is identified');
    });

    it('shows the flight status in the summary', async () => {
      const { fixture, el } = await setup();
      fixture.componentRef.setInput('flight', flightView({ checkinAvailable: false }));
      await fixture.whenStable();
      expect(el.textContent).toContain('Not open yet');
    });
  });

  it('confirms directly when the search identified the passenger', async () => {
    const { fixture, el, confirmed } = await setup({ passengerKnown: true });
    await fixture.whenStable();
    expect(el.querySelector('#passenger-code')).toBeNull();
    expect(el.textContent).toContain('Passenger is identified from the document you entered.');
    await submit(fixture);
    expect(confirmed).toEqual([undefined]);
  });

  it('blocks a second submission while confirming', async () => {
    const { fixture, el, confirmed } = await setup({ passengerKnown: true, submitting: true });
    await submit(fixture);
    expect(confirmed).toEqual([]);
    expect(el.querySelector('button[type=submit]')?.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('button[type=submit]')?.hasAttribute('disabled')).toBe(true);
  });
});
