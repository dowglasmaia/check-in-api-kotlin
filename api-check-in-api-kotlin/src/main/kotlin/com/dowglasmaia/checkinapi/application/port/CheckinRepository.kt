package com.dowglasmaia.checkinapi.application.port

import com.dowglasmaia.checkinapi.domain.model.Checkin

interface CheckinRepository {

    /**
     * Saves [checkin] only if none exists for the same flight and passenger.
     * The check and the save must be one atomic step, or concurrent requests could both succeed.
     *
     * @return `false` when a check-in already existed.
     */
    fun saveIfAbsent(checkin: Checkin): Boolean

    fun existsByFlightIdAndPassengerId(flightId: String, passengerId: String): Boolean

    /** Removes every check-in. Only the demo reset uses it. */
    fun deleteAll()
}
