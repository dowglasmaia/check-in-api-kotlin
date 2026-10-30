package com.dowglasmaia.checkinapi.domain.strategy

import com.dowglasmaia.checkinapi.application.port.FlightRepository
import com.dowglasmaia.checkinapi.application.port.PassengerRepository
import com.dowglasmaia.checkinapi.domain.model.FlightSearchResult

class DocumentSearchStrategy(
    private val flightRepository: FlightRepository,
    private val passengerRepository: PassengerRepository
) : FlightSearchStrategy {

    override fun search(value: String): FlightSearchResult {
        val passenger = passengerRepository.findByDocument(value) ?: return FlightSearchResult(emptyList())
        return FlightSearchResult(flightRepository.findByPassengerId(passenger.id), passenger.id)
    }
}
