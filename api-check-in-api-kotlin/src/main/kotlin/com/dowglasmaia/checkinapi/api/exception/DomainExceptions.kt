package com.dowglasmaia.checkinapi.api.exception

/** Business failure with a stable machine-readable [code] that clients can branch on. */
abstract class DomainException(val code: String, message: String) : RuntimeException(message)

class FlightNotFoundException(message: String) : DomainException("FLIGHT_NOT_FOUND", message)

class PassengerNotFoundException(message: String) : DomainException("PASSENGER_NOT_FOUND", message)

class PassengerNotOnFlightException(message: String) : DomainException("PASSENGER_NOT_ON_FLIGHT", message)

class CheckinAlreadyExistsException(message: String) : DomainException("CHECKIN_ALREADY_DONE", message)

class CheckinNotAllowedException(message: String) : DomainException("CHECKIN_NOT_ALLOWED", message)
