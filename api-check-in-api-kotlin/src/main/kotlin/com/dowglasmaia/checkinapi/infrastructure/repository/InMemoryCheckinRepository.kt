package com.dowglasmaia.checkinapi.infrastructure.repository

import com.dowglasmaia.checkinapi.application.port.CheckinRepository
import com.dowglasmaia.checkinapi.domain.model.Checkin
import java.util.concurrent.ConcurrentHashMap

class InMemoryCheckinRepository : CheckinRepository {

    private val byFlightAndPassenger = ConcurrentHashMap<String, Checkin>()
    private val byId = ConcurrentHashMap<String, Checkin>()

    override fun saveIfAbsent(checkin: Checkin): Boolean {
        var inserted = false
        // computeIfAbsent is atomic per key; the by-id index is written inside it so readers never see one index without the other.
        byFlightAndPassenger.computeIfAbsent("${checkin.flightId}::${checkin.passengerId}") {
            inserted = true
            byId[checkin.id] = checkin
            checkin
        }
        return inserted
    }

    override fun deleteAll() {
        byFlightAndPassenger.clear()
        byId.clear()
    }

    override fun existsByFlightIdAndPassengerId(flightId: String, passengerId: String): Boolean =
        byFlightAndPassenger.containsKey("$flightId::$passengerId")
}
