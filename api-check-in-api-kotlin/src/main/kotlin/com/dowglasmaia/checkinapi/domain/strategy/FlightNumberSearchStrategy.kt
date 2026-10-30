package com.dowglasmaia.checkinapi.domain.strategy

import com.dowglasmaia.checkinapi.application.port.FlightRepository
import com.dowglasmaia.checkinapi.domain.model.Flight

class FlightNumberSearchStrategy(
    private val flightRepository: FlightRepository
) : FlightSearchStrategy {

    override fun search(value: String): List<Flight> =
        flightRepository.findByFlightNumber(value)
}
