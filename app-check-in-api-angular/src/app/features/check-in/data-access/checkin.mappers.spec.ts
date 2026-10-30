import {
  CANCELLED,
  CHECKIN_RESPONSE,
  NOT_OPEN,
  NOW,
  flightDto,
  flightView,
} from '../testing/fixtures';
import { toBoardingPass, toFlightView } from './checkin.mappers';

describe('checkin mappers', () => {
  it('converts the API flight to a view with real dates', () => {
    const view = toFlightView(flightDto());
    expect(view.id).toBe('FL-004');
    expect(view.displayNumber).toBe('MF 214');
    expect(view.number).toBe('MF214');
    expect(view.departureTime).toEqual(new Date('2026-03-06T15:40:00Z'));
    expect(view.checkinOpensAt).toEqual(new Date('2026-03-03T15:40:00Z'));
  });

  it.each([
    [flightDto(), 'available'],
    [NOT_OPEN, 'not-open'],
    [CANCELLED, 'cancelled'],
    [flightDto({ status: 'BOARDED', checkinAvailable: false }), 'closed'],
    [flightDto({ status: 'CLOSED', checkinAvailable: false }), 'closed'],
  ])('derives the availability of %#', (dto, availability) => {
    expect(toFlightView(dto).availability).toBe(availability);
  });

  it('trusts checkinAvailable from the API over any date arithmetic', () => {
    expect(toFlightView(flightDto({ checkinAvailable: false })).availability).toBe('not-open');
  });

  it('builds the boarding pass from the check-in response', () => {
    const pass = toBoardingPass(CHECKIN_RESPONSE, flightView(), 'P-004', NOW);
    expect(pass).toMatchObject({
      boardingGate: 'C1',
      status: 'CONFIRMED',
      passengerId: 'P-004',
      checkedInAt: NOW,
    });
    expect(pass.boardingTime).toEqual(new Date(CHECKIN_RESPONSE.boardingTime));
  });
});
