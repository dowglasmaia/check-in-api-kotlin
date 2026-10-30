import { BoardingPassView, FlightAvailability, FlightView } from '../model/flight';
import { CheckinResponse, FlightSummaryDto } from './checkin.dto';

function availabilityOf(dto: FlightSummaryDto): FlightAvailability {
  if (dto.checkinAvailable) return 'available';
  if (dto.status === 'CANCELLED') return 'cancelled';
  if (dto.status === 'BOARDED' || dto.status === 'CLOSED') return 'closed';
  return 'not-open';
}

export function toFlightView(dto: FlightSummaryDto): FlightView {
  return {
    id: dto.flightId,
    number: dto.flightNumber,
    displayNumber: dto.flightNumber.replace(/^([A-Za-z]{2})(\d+)$/, '$1 $2'),
    origin: dto.origin,
    destination: dto.destination,
    departureTime: new Date(dto.departureTime),
    checkinOpensAt: new Date(dto.checkinOpensAt),
    status: dto.status,
    checkinAvailable: dto.checkinAvailable,
    availability: availabilityOf(dto),
  };
}

export function toBoardingPass(
  dto: CheckinResponse,
  flight: FlightView,
  passengerId: string,
  now: Date,
): BoardingPassView {
  return {
    checkinId: dto.checkinId,
    status: dto.status,
    boardingGate: dto.boardingGate,
    boardingTime: new Date(dto.boardingTime),
    checkedInAt: now,
    flight,
    passengerId,
  };
}
