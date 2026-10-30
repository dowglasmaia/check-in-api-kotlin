import { formatDate } from '@angular/common';
import { SearchType } from '../data-access/checkin.dto';
import { FlowError } from './flow-error';
import { SEARCH_TYPES } from './search-type';

export type FlowErrorAction =
  | 'edit-search'
  | 'new-search'
  | 'back-to-flights'
  | 'use-booking-code'
  | 'view-checkin'
  | 'try-again';

export type FlowErrorTone = 'warn' | 'accent' | 'bad' | 'ok';

export interface FlowErrorCopy {
  icon: string;
  tone: FlowErrorTone;
  kicker: string;
  title: string;
  body: string;
  tips: string[];
  primary: { label: string; action: FlowErrorAction };
  secondary: { label: string; action: FlowErrorAction };
}

export interface FlowErrorContext {
  searchType: SearchType;
  searchLabel: string;
  hasFlights: boolean;
  hasCheckin: boolean;
}

const when = (date: Date) => formatDate(date, 'EEE, d MMM · HH:mm', 'en-US');
const opens = (date: Date) => formatDate(date, "d MMM 'at' HH:mm", 'en-US');

export function describeFlowError(error: FlowError, context: FlowErrorContext): FlowErrorCopy {
  const config = SEARCH_TYPES[context.searchType];
  const flight = error.flight;
  const flightName = flight?.displayNumber ?? 'this flight';
  const route = flight ? `${flight.origin} → ${flight.destination}` : '';
  const toFlights = context.hasFlights
    ? { label: 'Back to my flights', action: 'back-to-flights' as const }
    : { label: 'New search', action: 'new-search' as const };

  switch (error.kind) {
    case 'invalid':
      return {
        icon: 'warning-circle',
        tone: 'warn',
        kicker: `Invalid ${config.label.toLowerCase()}`,
        title: "That doesn't look right",
        body: `The ${config.label.toLowerCase()} you entered was not accepted, so no flights were searched.`,
        tips: config.tips,
        primary: { label: 'Edit and try again', action: 'edit-search' },
        secondary: { label: 'Search another way', action: 'edit-search' },
      };
    case 'none':
      return {
        icon: 'airplane-tilt',
        tone: 'accent',
        kicker: 'No flights found',
        title: 'No flights to check in for',
        body: 'We found no upcoming flights linked to what you entered.',
        tips: [
          'Make sure you used the details from your latest booking.',
          'Try another search type — your booking code or document.',
          "Check-in only lists flights that haven't departed yet.",
        ],
        primary: { label: 'Try another search', action: 'edit-search' },
        secondary: { label: 'Back to start', action: 'new-search' },
      };
    case 'notfound':
      return {
        icon: 'map-pin-line',
        tone: 'accent',
        kicker: 'Flight not found',
        title: "We couldn't locate that flight",
        body: flight
          ? `${flightName} is no longer available.`
          : `No flight matches ${context.searchLabel || 'that number'}. It may have a different number or already be operated by a partner.`,
        tips: [
          'Find the flight number on your e-ticket or confirmation email.',
          'Search with your booking code instead.',
        ],
        primary: { label: 'Search again', action: 'edit-search' },
        secondary: { label: 'Use booking code', action: 'use-booking-code' },
      };
    case 'window':
      return {
        icon: 'clock-countdown',
        tone: 'warn',
        kicker: 'Check-in not open yet',
        title: flight ? `Check-in opens ${opens(flight.checkinOpensAt)}` : 'Check-in is not open',
        body: flight
          ? `Online check-in is available up to 72 hours before departure for ${flightName} (${route}, ${when(flight.departureTime)}).`
          : 'Online check-in is available up to 72 hours before departure.',
        tips: [
          'Come back once the window opens — nothing is lost.',
          'Your reservation stays safe in the meantime.',
        ],
        primary: toFlights,
        secondary: { label: 'New search', action: 'new-search' },
      };
    case 'cancelled':
      return {
        icon: 'x-circle',
        tone: 'bad',
        kicker: 'Flight cancelled',
        title: `${flightName} has been cancelled`,
        body: "Check-in isn't possible for this flight. We're sorry for the disruption to your plans.",
        tips: [
          'Look for a rebooking confirmation in your email.',
          'Contact MaiaFlight support to choose a new flight or request a refund.',
        ],
        primary: toFlights,
        secondary: { label: 'New search', action: 'new-search' },
      };
    case 'unavailable':
      return {
        icon: 'lock',
        tone: 'warn',
        kicker: 'Check-in closed',
        title: `Check-in is closed for ${flightName}`,
        body: 'This flight is no longer accepting online check-in.',
        tips: ['Contact MaiaFlight support if you still need to travel.'],
        primary: toFlights,
        secondary: { label: 'New search', action: 'new-search' },
      };
    case 'already':
      return {
        icon: 'seal-check',
        tone: 'ok',
        kicker: 'Already checked in',
        title: "You're already checked in",
        body: `Check-in for ${flightName}${route ? ` (${route})` : ''} was completed earlier. There's nothing more to do.`,
        tips: [
          'Keep your confirmation code handy for the airport.',
          'Arrive at the gate before boarding time.',
        ],
        primary: context.hasCheckin
          ? { label: 'View my check-in', action: 'view-checkin' }
          : toFlights,
        secondary: {
          label: toFlights.label === 'New search' ? 'Back to start' : 'New search',
          action: 'new-search',
        },
      };
    case 'passenger':
      return {
        icon: 'user-circle-minus',
        tone: 'warn',
        kicker: 'Passenger not found',
        title: "We couldn't match that passenger",
        body: `The passenger code is not part of the reservation for ${flightName}.`,
        tips: [
          'Check the passenger code on your confirmation email.',
          'Search with your document to identify the passenger automatically.',
        ],
        primary: { label: 'Try again', action: 'try-again' },
        secondary: toFlights,
      };
    default:
      return {
        icon: 'wifi-slash',
        tone: 'bad',
        kicker: 'Something went wrong',
        title: "We can't reach MaiaFlight right now",
        body: "The request didn't go through, and it isn't anything you did. Your data wasn't changed.",
        tips: [
          'Check your connection and try again in a moment.',
          "If it keeps happening, contact support — we'll help you check in manually.",
        ],
        primary: { label: 'Try again', action: 'try-again' },
        secondary: { label: 'Back to start', action: 'new-search' },
      };
  }
}
