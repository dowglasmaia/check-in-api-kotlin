package com.dowglasmaia.checkinapi.infrastructure.repository

import com.dowglasmaia.checkinapi.application.port.PassengerRepository
import com.dowglasmaia.checkinapi.domain.model.Passenger
import com.dowglasmaia.checkinapi.infrastructure.seed.DemoSeed

class InMemoryPassengerRepository(seed: DemoSeed) : PassengerRepository {

    private val passengers: List<Passenger> = seed.passengers

    override fun findById(id: String): Passenger? =
        passengers.find { it.id == id }

    override fun findByDocument(document: String): Passenger? =
        passengers.find { it.document == document }
}
