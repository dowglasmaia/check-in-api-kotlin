package com.dowglasmaia.checkinapi.domain.policy

import com.dowglasmaia.checkinapi.domain.model.Flight
import com.dowglasmaia.checkinapi.domain.model.FlightStatus
import org.slf4j.LoggerFactory
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit

class HoursBeforeDeparturePolicy(
    private val maxHoursBeforeDeparture: Long = 72
) : CheckinPolicy {

    private val logger = LoggerFactory.getLogger(HoursBeforeDeparturePolicy::class.java)

    override fun canCheckin(flight: Flight): Boolean {
        if (flight.status in setOf(FlightStatus.CANCELLED, FlightStatus.BOARDED, FlightStatus.CLOSED)) {
            logger.debug(
                "action=policy_rejected_status flightId={} status={}",
                flight.id,
                flight.status
            )
            return false
        }
        val now = LocalDateTime.now()
        val hoursUntilDeparture = ChronoUnit.HOURS.between(now, flight.departureTime)
        val eligible = hoursUntilDeparture in 0..maxHoursBeforeDeparture

        logger.debug(
            "action=policy_window_check flightId={} hoursUntilDeparture={} maxHours={} eligible={}",
            flight.id,
            hoursUntilDeparture,
            maxHoursBeforeDeparture,
            eligible
        )

        return eligible
    }
}
