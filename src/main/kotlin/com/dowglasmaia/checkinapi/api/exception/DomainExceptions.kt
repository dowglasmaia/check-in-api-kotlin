package com.dowglasmaia.checkinapi.api.exception

class FlightNotFoundException(message: String) : RuntimeException(message)

class PassengerNotFoundException(message: String) : RuntimeException(message)

class CheckinAlreadyExistsException(message: String) : RuntimeException(message)

class CheckinNotAllowedException(message: String) : RuntimeException(message)
