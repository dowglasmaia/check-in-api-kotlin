import { TestBed } from '@angular/core/testing';
import { CANCELLED, NOT_OPEN, flightDto, flightView } from '../testing/fixtures';
import { FlightCard } from './flight-card';

describe('FlightCard', () => {
  async function render(dto = flightDto(), checkedIn = false) {
    const fixture = TestBed.createComponent(FlightCard);
    fixture.componentRef.setInput('flight', flightView(dto));
    fixture.componentRef.setInput('checkedIn', checkedIn);
    const chosen: string[] = [];
    fixture.componentInstance.choose.subscribe((flight) => chosen.push(flight.id));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return { el, chosen, button: el.querySelector('button')!, text: el.textContent ?? '' };
  }

  it('presents an open flight with a primary action', async () => {
    const { text, button } = await render();
    expect(text).toContain('MF 214');
    expect(text).toContain('Check-in available');
    expect(text).toContain('Check-in is open');
    expect(text).toContain('São Paulo');
    expect(text).toContain('Lisbon');
    expect(button.textContent).toContain('Continue');
  });

  it('says when check-in opens for a flight that is not open yet', async () => {
    const { text, button } = await render(NOT_OPEN);
    expect(text).toContain('Not yet available');
    expect(text).toMatch(/Opens \d+ Mar at 11:15/);
    expect(button.textContent).toContain('Details');
  });

  it('marks a cancelled flight', async () => {
    const { text, button } = await render(CANCELLED);
    expect(text).toContain('Cancelled');
    expect(text).toContain('This flight was cancelled');
    expect(button.textContent).toContain('See options');
  });

  it('marks a closed flight', async () => {
    const { text } = await render(flightDto({ status: 'BOARDED', checkinAvailable: false }));
    expect(text).toContain('Check-in closed');
  });

  it('shows "Checked in" once the check-in was completed in this session', async () => {
    const { text, button } = await render(flightDto(), true);
    expect(text).toContain('Checked in');
    expect(button.textContent).toContain('View status');
  });

  it('emits the flight when the action is clicked', async () => {
    const { button, chosen } = await render();
    button.click();
    expect(chosen).toEqual(['FL-004']);
  });

  it('leaves the city blank for an unknown airport instead of inventing one', async () => {
    const { text } = await render(flightDto({ origin: 'XYZ' }));
    expect(text).toContain('XYZ');
  });
});
