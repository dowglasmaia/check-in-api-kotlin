package com.dowglasmaia.checkinapi.domain.policy

import com.dowglasmaia.checkinapi.domain.model.Flight

/**
 * Domain policy that determines whether a passenger is allowed to check in for a flight.
 *
 * <p>Encapsulating eligibility rules behind an interface keeps the use case layer
 * free of conditional business logic and enables alternative policies (e.g., a 48-hour
 * rule for certain airline tiers) to be introduced without modifying existing code.</p>
 *
 * <p>Implementations must be stateless and thread-safe.</p>
 */
interface CheckinPolicy {

    /**
     * Returns {@code true} if the given flight is eligible for check-in at the time
     * this method is called.
     *
     * @param flight the flight to evaluate; must not be null.
     * @return {@code true} if check-in is allowed; {@code false} otherwise.
     */
    fun canCheckin(flight: Flight): Boolean
}
