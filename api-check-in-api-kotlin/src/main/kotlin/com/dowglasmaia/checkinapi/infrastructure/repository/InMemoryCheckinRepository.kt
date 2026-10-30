package com.dowglasmaia.checkinapi.infrastructure.repository

import com.dowglasmaia.checkinapi.application.port.CheckinRepository
import com.dowglasmaia.checkinapi.domain.model.Checkin
import java.util.concurrent.ConcurrentHashMap

/**
 * In-memory implementation of [CheckinRepository] backed by [ConcurrentHashMap].
 *
 * <p><strong>Thread safety — how [saveIfAbsent] prevents duplicate check-ins:</strong></p>
 *
 * <p>A naive implementation would look like:</p>
 * <pre>
 *   if (!exists(flightId, passengerId)) {   // check
 *       checkins[key] = checkin             // act
 *   }
 * </pre>
 *
 * <p>Under concurrent load two threads can both pass the "check" step and then both
 * insert — a TOCTOU (time-of-check / time-of-use) race condition.  This
 * implementation eliminates the race by using
 * [ConcurrentHashMap.putIfAbsent], which is a single atomic CAS (compare-and-swap)
 * operation provided by the JDK:</p>
 * <ul>
 *   <li>If no entry exists for the composite key, the new value is stored and
 *       {@code null} is returned → save succeeded.</li>
 *   <li>If an entry already exists, the existing value is returned → duplicate
 *       detected, no write occurs.</li>
 * </ul>
 *
 * <p>Because [putIfAbsent] is atomic, only one of the two concurrent threads can
 * "win" the insertion, and the other will see the existing entry and return
 * {@code false}.</p>
 *
 * <p>This approach requires no [synchronized] blocks or locks, avoiding contention
 * and keeping throughput high — particularly important when running under
 * virtual threads (Project Loom).</p>
 */
class InMemoryCheckinRepository : CheckinRepository {

    /**
     * Primary index: composite key `"flightId::passengerId"` → [Checkin].
     * Used for atomic duplicate detection via [ConcurrentHashMap.putIfAbsent].
     */
    private val checkinByFlightAndPassenger = ConcurrentHashMap<String, Checkin>()

    /**
     * Secondary index by check-in ID for future lookups (e.g., GET /checkins/{id}).
     */
    private val checkinById = ConcurrentHashMap<String, Checkin>()

    /**
     * Atomically saves the check-in only if no record exists for the same
     * flight and passenger.
     *
     * @param checkin the record to persist.
     * @return `true` if saved successfully; `false` if a duplicate was detected.
     */
    override fun saveIfAbsent(checkin: Checkin): Boolean {
        val key = compositeKey(checkin.flightId, checkin.passengerId)
        // putIfAbsent is a single atomic operation on ConcurrentHashMap.
        // Returns null  → key was absent → we inserted the record.
        // Returns value → key was present → duplicate, we do nothing.
        val existing = checkinByFlightAndPassenger.putIfAbsent(key, checkin)
        return if (existing == null) {
            checkinById[checkin.id] = checkin
            true
        } else {
            false
        }
    }

    /**
     * Returns `true` if a check-in already exists for the given flight and passenger.
     *
     * @param flightId the flight identifier.
     * @param passengerId the passenger identifier.
     */
    override fun existsByFlightIdAndPassengerId(flightId: String, passengerId: String): Boolean =
        checkinByFlightAndPassenger.containsKey(compositeKey(flightId, passengerId))

    private fun compositeKey(flightId: String, passengerId: String) = "$flightId::$passengerId"
}
