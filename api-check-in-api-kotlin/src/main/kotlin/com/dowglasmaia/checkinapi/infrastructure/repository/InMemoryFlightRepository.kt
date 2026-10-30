package com.dowglasmaia.checkinapi.infrastructure.repository

import com.dowglasmaia.checkinapi.application.port.FlightRepository
import com.dowglasmaia.checkinapi.domain.model.Flight
import com.dowglasmaia.checkinapi.domain.model.FlightStatus
import java.time.LocalDateTime

class InMemoryFlightRepository : FlightRepository {

    private val flights: List<Flight> = listOf(
        Flight(
            id = "FL-001",
            flightNumber = "MF100",
            bookingCode = "ABC123",
            origin = "GRU",
            destination = "JFK",
            departureTime = LocalDateTime.now().plusHours(24),
            status = FlightStatus.SCHEDULED,
            passengerIds = listOf("P-001", "P-002")
        ),
        Flight(
            id = "FL-002",
            flightNumber = "MF200",
            bookingCode = "XYZ789",
            origin = "CGH",
            destination = "LHR",
            departureTime = LocalDateTime.now().plusHours(48),
            status = FlightStatus.SCHEDULED,
            passengerIds = listOf("P-001")
        ),
        Flight(
            id = "FL-003",
            flightNumber = "MF300",
            bookingCode = "DEF456",
            origin = "GIG",
            destination = "MIA",
            departureTime = LocalDateTime.now().plusHours(100),
            status = FlightStatus.SCHEDULED,
            passengerIds = listOf("P-003")
        )
    )

    override fun findById(id: String): Flight? =
        flights.find { it.id == id }

    override fun findByFlightNumber(flightNumber: String): List<Flight> =
        flights.filter { it.flightNumber.equals(flightNumber, ignoreCase = true) }

    override fun findByBookingCode(bookingCode: String): List<Flight> =
        flights.filter { it.bookingCode.equals(bookingCode, ignoreCase = true) }

    override fun findByPassengerId(passengerId: String): List<Flight> =
        flights.filter { passengerId in it.passengerIds }
}
