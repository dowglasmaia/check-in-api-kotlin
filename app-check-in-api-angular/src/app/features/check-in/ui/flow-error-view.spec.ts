import { TestBed } from '@angular/core/testing';
import { FlowError, FlowErrorKind } from '../model/flow-error';
import { FlowErrorAction, FlowErrorContext, describeFlowError } from '../model/flow-error-copy';
import { flightView } from '../testing/fixtures';
import { FlowErrorView } from './flow-error-view';

const context: FlowErrorContext = {
  searchType: 'BOOKING_CODE',
  searchLabel: 'MAIA7K',
  hasFlights: true,
  hasCheckin: false,
};

const KINDS: FlowErrorKind[] = [
  'invalid',
  'none',
  'notfound',
  'window',
  'cancelled',
  'unavailable',
  'already',
  'passenger',
  'api',
];

describe('describeFlowError', () => {
  it.each(KINDS)('has complete copy for "%s"', (kind) => {
    const copy = describeFlowError({ kind, flight: flightView() }, context);
    expect(copy.kicker).toBeTruthy();
    expect(copy.title).toBeTruthy();
    expect(copy.body).toBeTruthy();
    expect(copy.tips.length).toBeGreaterThan(0);
    expect(copy.primary.label).not.toBe(copy.secondary.label);
  });

  it('names the flight and when check-in opens', () => {
    const copy = describeFlowError({ kind: 'window', flight: flightView() }, context);
    expect(copy.title).toMatch(/^Check-in opens \d+ Mar at 15:40$/);
    expect(copy.body).toContain('MF 214');
  });

  it('offers to view the existing check-in only when there is one', () => {
    const error: FlowError = { kind: 'already', flight: flightView() };
    expect(describeFlowError(error, { ...context, hasCheckin: true }).primary.action).toBe(
      'view-checkin',
    );
    expect(describeFlowError(error, { ...context, hasCheckin: false }).primary.action).not.toBe(
      'view-checkin',
    );
  });

  it('falls back to a new search when there are no flights to go back to', () => {
    const copy = describeFlowError(
      { kind: 'cancelled', flight: flightView() },
      { ...context, hasFlights: false },
    );
    expect(copy.primary.action).toBe('new-search');
  });

  it('adapts the invalid copy to the search type', () => {
    const copy = describeFlowError({ kind: 'invalid' }, { ...context, searchType: 'DOCUMENT' });
    expect(copy.kicker).toBe('Invalid personal document');
  });
});

describe('FlowErrorView', () => {
  async function render(error: FlowError) {
    const fixture = TestBed.createComponent(FlowErrorView);
    fixture.componentRef.setInput('error', error);
    fixture.componentRef.setInput('context', context);
    const actions: FlowErrorAction[] = [];
    fixture.componentInstance.act.subscribe((action) => actions.push(action));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return { el, actions, buttons: Array.from(el.querySelectorAll('button')) };
  }

  it('is announced as an alert and shows the copy', async () => {
    const { el } = await render({ kind: 'api' });
    expect(el.getAttribute('role')).toBe('alert');
    expect(el.textContent).toContain("We can't reach MaiaFlight right now");
  });

  it('emits the primary and secondary actions', async () => {
    const { buttons, actions } = await render({ kind: 'none' });
    buttons[0].click();
    buttons[1].click();
    expect(actions).toEqual(['edit-search', 'new-search']);
  });

  it('shows the support code when the API sent a request id', async () => {
    const { el } = await render({ kind: 'api', requestId: 'req-123' });
    expect(el.textContent).toContain('req-123');
  });

  describe('demo reset', () => {
    async function renderWith(kind: FlowError['kind'], canResetDemo: boolean) {
      const fixture = TestBed.createComponent(FlowErrorView);
      fixture.componentRef.setInput('error', { kind });
      fixture.componentRef.setInput('context', context);
      fixture.componentRef.setInput('canResetDemo', canResetDemo);
      let resets = 0;
      fixture.componentInstance.resetDemo.subscribe(() => resets++);
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      const button = Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Reset test data'),
      );
      return { el, button, resets: () => resets };
    }

    it('is offered on "already checked in" while the API serves demo data', async () => {
      const { button, el, resets } = await renderWith('already', true);
      expect(el.textContent).toContain('The API keeps check-ins in memory');
      button!.click();
      expect(resets()).toBe(1);
    });

    it('is not offered without demo data', async () => {
      expect((await renderWith('already', false)).button).toBeUndefined();
    });

    it('is not offered on other errors', async () => {
      expect((await renderWith('api', true)).button).toBeUndefined();
    });
  });

  it('omits the support code otherwise', async () => {
    const { el } = await render({ kind: 'api' });
    expect(el.textContent).not.toContain('Support code');
  });
});
