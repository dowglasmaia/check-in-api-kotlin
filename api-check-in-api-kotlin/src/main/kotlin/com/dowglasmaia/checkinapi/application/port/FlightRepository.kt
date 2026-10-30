package com.dowglasmaia.checkinapi.application.port

import com.dowglasmaia.checkinapi.domain.model.Flight

interface FlightRepository {
    fun findById(id: String): Flight?
    fun findByFlightNumber(flightNumber: String): List<Flight>
    fun findByBookingCode(bookingCode: String): List<Flight>
    fun findByPassengerId(passengerId: String): List<Flight>
}
