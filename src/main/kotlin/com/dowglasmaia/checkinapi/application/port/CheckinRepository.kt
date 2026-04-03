package com.dowglasmaia.checkinapi.application.port

import com.dowglasmaia.checkinapi.domain.model.Checkin

/**
 * Output port for check-in persistence.
 *
 * <p>Implementations must guarantee thread safety on [saveIfAbsent] to prevent
 * duplicate check-in records under concurrent requests for the same
 * flight/passenger pair.</p>
 */
interface CheckinRepository {

    /**
     * Atomically saves [checkin] only if no check-in already exists for the same
     * flight and passenger.
     *
     * <p>The check-then-save sequence must be a single atomic operation at the
     * implementation level. This prevents the classic TOCTOU (time-of-check /
     * time-of-use) race condition where two concurrent requests both observe
     * "no duplicate" and then both proceed to insert.</p>
     *
     * @param checkin the check-in record to persist.
     * @return `true` if the record was saved; `false` if a duplicate already existed.
     */
    fun saveIfAbsent(checkin: Checkin): Boolean

    /**
     * Returns `true` if a check-in record exists for the given flight and passenger.
     *
     * @param flightId the flight identifier.
     * @param passengerId the passenger identifier.
     */
    fun existsByFlightIdAndPassengerId(flightId: String, passengerId: String): Boolean
}
