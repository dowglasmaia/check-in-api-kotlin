package com.dowglasmaia.checkinapi.infrastructure.repository

import com.dowglasmaia.checkinapi.application.port.FlightRepository
import com.dowglasmaia.checkinapi.domain.model.Flight
import com.dowglasmaia.checkinapi.infrastructure.seed.DemoSeed

class InMemoryFlightRepository(private val seed: DemoSeed) : FlightRepository {

    override fun findById(id: String): Flight? =
        seed.flights().find { it.id == id }

    override fun findByFlightNumber(flightNumber: String): List<Flight> =
        seed.flights().filter { it.flightNumber.equals(flightNumber, ignoreCase = true) }

    override fun findByBookingCode(bookingCode: String): List<Flight> =
        seed.flights().filter { it.bookingCode.equals(bookingCode, ignoreCase = true) }

    override fun findByPassengerId(passengerId: String): List<Flight> =
        seed.flights().filter { passengerId in it.passengerIds }
}
