import { FlightStatus } from '../data-access/checkin.dto';

export type FlightAvailability = 'available' | 'not-open' | 'cancelled' | 'closed';

export interface FlightView {
  id: string;
  /** As sent by the API, e.g. `MF214`. */
  number: string;
  /** For display, e.g. `MF 214`. */
  displayNumber: string;
  origin: string;
  destination: string;
  departureTime: Date;
  checkinOpensAt: Date;
  status: FlightStatus;
  checkinAvailable: boolean;
  availability: FlightAvailability;
}

export interface BoardingPassView {
  checkinId: string;
  status: string;
  boardingGate: string;
  boardingTime: Date;
  /** Client clock at the moment the API confirmed the check-in. */
  checkedInAt: Date;
  flight: FlightView;
  passengerId: string;
}
