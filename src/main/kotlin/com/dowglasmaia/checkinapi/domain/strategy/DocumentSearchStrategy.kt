package com.dowglasmaia.checkinapi.domain.strategy

import com.dowglasmaia.checkinapi.application.port.FlightRepository
import com.dowglasmaia.checkinapi.application.port.PassengerRepository
import com.dowglasmaia.checkinapi.domain.model.Flight

class DocumentSearchStrategy(
    private val flightRepository: FlightRepository,
    private val passengerRepository: PassengerRepository
) : FlightSearchStrategy {

    override fun search(value: String): List<Flight> {
        val passenger = passengerRepository.findByDocument(value) ?: return emptyList()
        return flightRepository.findByPassengerId(passenger.id)
    }
}
