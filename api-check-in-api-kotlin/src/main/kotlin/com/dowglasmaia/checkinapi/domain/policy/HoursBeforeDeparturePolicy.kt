package com.dowglasmaia.checkinapi.domain.policy

import com.dowglasmaia.checkinapi.domain.model.Flight
import com.dowglasmaia.checkinapi.domain.model.FlightStatus
import java.time.Clock
import java.time.Duration
import java.time.LocalDateTime

/** Check-in is open from [maxHoursBeforeDeparture] hours before departure until departure. */
class HoursBeforeDeparturePolicy(
    private val maxHoursBeforeDeparture: Long = 72,
    private val clock: Clock = Clock.systemUTC()
) : CheckinPolicy {

    override fun canCheckin(flight: Flight): Boolean {
        if (flight.status != FlightStatus.SCHEDULED) return false

        // Exact comparison: truncating to whole hours would accept a flight that departed 30 minutes ago.
        val untilDeparture = Duration.between(LocalDateTime.now(clock), flight.departureTime)
        return !untilDeparture.isNegative && untilDeparture <= Duration.ofHours(maxHoursBeforeDeparture)
    }

    override fun checkinOpensAt(flight: Flight): LocalDateTime =
        flight.departureTime.minusHours(maxHoursBeforeDeparture)
}
