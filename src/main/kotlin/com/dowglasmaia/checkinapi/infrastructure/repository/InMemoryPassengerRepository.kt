package com.dowglasmaia.checkinapi.infrastructure.repository

import com.dowglasmaia.checkinapi.application.port.PassengerRepository
import com.dowglasmaia.checkinapi.domain.model.Passenger

class InMemoryPassengerRepository : PassengerRepository {

    private val passengers: List<Passenger> = listOf(
        Passenger(id = "P-001", name = "João Silva", document = "123.456.789-00", email = "joao.silva@email.com"),
        Passenger(id = "P-002", name = "Maria Santos", document = "987.654.321-00", email = "maria.santos@email.com"),
        Passenger(id = "P-003", name = "Carlos Oliveira", document = "111.222.333-44", email = "carlos.oliveira@email.com")
    )

    override fun findById(id: String): Passenger? =
        passengers.find { it.id == id }

    override fun findByDocument(document: String): Passenger? =
        passengers.find { it.document == document }
}
