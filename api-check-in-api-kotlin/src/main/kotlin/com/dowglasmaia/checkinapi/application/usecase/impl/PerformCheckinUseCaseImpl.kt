package com.dowglasmaia.checkinapi.application.usecase.impl

import com.dowglasmaia.checkinapi.api.exception.CheckinAlreadyExistsException
import com.dowglasmaia.checkinapi.api.exception.CheckinNotAllowedException
import com.dowglasmaia.checkinapi.api.exception.FlightNotFoundException
import com.dowglasmaia.checkinapi.api.exception.PassengerNotFoundException
import com.dowglasmaia.checkinapi.api.exception.PassengerNotOnFlightException
import com.dowglasmaia.checkinapi.application.port.CheckinRepository
import com.dowglasmaia.checkinapi.application.port.EventPublisher
import com.dowglasmaia.checkinapi.application.port.FlightRepository
import com.dowglasmaia.checkinapi.application.port.PassengerRepository
import com.dowglasmaia.checkinapi.application.usecase.PerformCheckinUseCase
import com.dowglasmaia.checkinapi.application.usecase.input.PerformCheckinInput
import com.dowglasmaia.checkinapi.domain.event.CheckinCompletedEvent
import com.dowglasmaia.checkinapi.domain.model.Checkin
import com.dowglasmaia.checkinapi.domain.policy.CheckinPolicy
import org.slf4j.LoggerFactory
import java.time.Clock
import java.time.LocalDateTime
import java.util.UUID

class PerformCheckinUseCaseImpl(
    private val flightRepository: FlightRepository,
    private val passengerRepository: PassengerRepository,
    private val checkinRepository: CheckinRepository,
    private val checkinPolicy: CheckinPolicy,
    private val eventPublisher: EventPublisher,
    private val clock: Clock = Clock.systemUTC()
) : PerformCheckinUseCase {

    private val logger = LoggerFactory.getLogger(PerformCheckinUseCaseImpl::class.java)

    override fun execute(input: PerformCheckinInput): Checkin {
        logger.info("action=perform_checkin_start flightId={} passengerId={}", input.flightId, input.passengerId)

        val flight = flightRepository.findById(input.flightId)
            ?: throw FlightNotFoundException("Flight not found: ${input.flightId}")

        val passenger = passengerRepository.findById(input.passengerId)
            ?: throw PassengerNotFoundException("Passenger not found: ${input.passengerId}")

        if (passenger.id !in flight.passengerIds) {
            throw PassengerNotOnFlightException("Passenger ${passenger.id} is not booked on flight ${flight.id}")
        }

        // Checked before duplicates so that a cancelled flight never answers "already checked in".
        if (!checkinPolicy.canCheckin(flight)) {
            logger.warn("action=checkin_policy_rejected flightId={} status={}", flight.id, flight.status)
            throw CheckinNotAllowedException("Check-in not allowed for flight ${flight.id}")
        }

        val checkin = Checkin(
            id = UUID.randomUUID().toString(),
            flightId = flight.id,
            passengerId = passenger.id,
            timestamp = LocalDateTime.now(clock),
            boardingGate = assignBoardingGate(flight.flightNumber),
            boardingTime = flight.departureTime.minusMinutes(BOARDING_LEAD_MINUTES)
        )

        if (!checkinRepository.saveIfAbsent(checkin)) {
            logger.warn("action=checkin_duplicate_rejected flightId={} passengerId={}", flight.id, passenger.id)
            throw CheckinAlreadyExistsException("Passenger ${passenger.id} already checked in for flight ${flight.id}")
        }

        logger.info("action=checkin_saved checkinId={} flightId={}", checkin.id, checkin.flightId)

        // The check-in is already persisted: a failing publisher must not turn it into a 500,
        // because the client would retry and get a misleading 409.
        try {
            eventPublisher.publish(CheckinCompletedEvent(passenger.email, flight.id, checkin.id))
        } catch (ex: Exception) {
            logger.error("action=checkin_event_publish_failed checkinId={}", checkin.id, ex)
        }

        return checkin
    }

    private fun assignBoardingGate(flightNumber: String): String =
        GATES[flightNumber.hashCode().and(0x7FFF_FFFF) % GATES.size]

    private companion object {
        const val BOARDING_LEAD_MINUTES = 30L
        val GATES = listOf("A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2")
    }
}
