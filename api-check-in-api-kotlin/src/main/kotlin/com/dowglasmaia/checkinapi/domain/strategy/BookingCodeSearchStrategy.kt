package com.dowglasmaia.checkinapi.domain.strategy

import com.dowglasmaia.checkinapi.application.port.FlightRepository
import com.dowglasmaia.checkinapi.domain.model.FlightSearchResult

class BookingCodeSearchStrategy(
    private val flightRepository: FlightRepository
) : FlightSearchStrategy {

    override fun search(value: String) =
        FlightSearchResult(flightRepository.findByBookingCode(value))
}
