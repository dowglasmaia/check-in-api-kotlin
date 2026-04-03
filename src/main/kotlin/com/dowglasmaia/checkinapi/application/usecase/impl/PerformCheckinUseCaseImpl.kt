package com.dowglasmaia.checkinapi.application.usecase.impl

import com.dowglasmaia.checkinapi.api.exception.CheckinAlreadyExistsException
import com.dowglasmaia.checkinapi.api.exception.CheckinNotAllowedException
import com.dowglasmaia.checkinapi.api.exception.FlightNotFoundException
import com.dowglasmaia.checkinapi.api.exception.PassengerNotFoundException
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
import java.time.LocalDateTime
import java.util.UUID

/**
 * Default implementation of [PerformCheckinUseCase].
 *
 * <p>Orchestrates the full passenger check-in flow:</p>
 * <ol>
 *   <li>Fetches and validates flight and passenger existence.</li>
 *   <li>Applies [CheckinPolicy] to confirm the flight is within the eligible window.</li>
 *   <li>Delegates duplicate detection and persistence to [CheckinRepository.saveIfAbsent],
 *       which executes both operations atomically — eliminating the classic
 *       check-then-act race condition under concurrent requests.</li>
 *   <li>Publishes a [CheckinCompletedEvent] after a successful save.</li>
 * </ol>
 *
 * <p><strong>Thread safety:</strong> this class holds no mutable state. The only
 * shared mutable state lives in [CheckinRepository], which guarantees atomicity
 * through [CheckinRepository.saveIfAbsent].</p>
 *
 * <p><strong>Event publication ordering:</strong> the event is published <em>after</em>
 * the repository save. If publishing fails, the check-in record already exists, so
 * a retry of the whole request will hit the duplicate guard and return 409.
 * For full atomicity, an Outbox pattern should be considered.</p>
 *
 * @param flightRepository port for flight lookup.
 * @param passengerRepository port for passenger lookup.
 * @param checkinRepository port for check-in persistence (thread-safe atomic save).
 * @param checkinPolicy domain rule that determines check-in eligibility.
 * @param eventPublisher port for publishing domain events after successful check-in.
 */
class PerformCheckinUseCaseImpl(
    private val flightRepository: FlightRepository,
    private val passengerRepository: PassengerRepository,
    private val checkinRepository: CheckinRepository,
    private val checkinPolicy: CheckinPolicy,
    private val eventPublisher: EventPublisher
) : PerformCheckinUseCase {

    private val logger = LoggerFactory.getLogger(PerformCheckinUseCaseImpl::class.java)

    /**
     * Executes the passenger check-in.
     *
     * @param input identifies the flight and the passenger.
     * @return the confirmed [Checkin] record with boarding gate and boarding time.
     * @throws FlightNotFoundException if no flight matches [PerformCheckinInput.flightId].
     * @throws PassengerNotFoundException if no passenger matches [PerformCheckinInput.passengerId].
     * @throws CheckinNotAllowedException if the flight is ineligible (status or time window).
     * @throws CheckinAlreadyExistsException if the passenger already checked in for this flight.
     */
    override fun execute(input: PerformCheckinInput): Checkin {
        logger.info(
            "action=perform_checkin_start flightId={} passengerId={}",
            input.flightId,
            input.passengerId
        )

        // Decision: fail-fast on missing resources before applying any business rule.
        // Returning null or an empty result here would push the responsibility
        // of handling "not found" to the caller — violating Tell Don't Ask.
        val flight = flightRepository.findById(input.flightId)
            ?: run {
                logger.warn("action=flight_not_found flightId={}", input.flightId)
                throw FlightNotFoundException("Flight not found: ${input.flightId}")
            }

        val passenger = passengerRepository.findById(input.passengerId)
            ?: run {
                logger.warn("action=passenger_not_found passengerId={}", input.passengerId)
                throw PassengerNotFoundException("Passenger not found: ${input.passengerId}")
            }

        // Decision: policy is evaluated before the duplicate check.
        // An ineligible flight must be rejected regardless of prior check-ins —
        // checking duplicates first would give misleading 409 responses for cancelled flights.
        if (!checkinPolicy.canCheckin(flight)) {
            logger.warn(
                "action=checkin_policy_rejected flightId={} flightStatus={} departureTime={}",
                flight.id, flight.status, flight.departureTime
            )
            throw CheckinNotAllowedException("Check-in not allowed for flight ${flight.id}")
        }

        val checkin = Checkin(
            id = UUID.randomUUID().toString(),
            flightId = flight.id,
            passengerId = passenger.id,
            timestamp = LocalDateTime.now(),
            boardingGate = assignBoardingGate(flight.flightNumber),
            // Decision: boarding time is set to 30 minutes before departure.
            // This is a fixed business rule. If it needs to vary per flight type,
            // extract it to a dedicated BoardingTimePolicy interface.
            boardingTime = flight.departureTime.minusMinutes(30)
        )

        // Decision: saveIfAbsent atomically combines the duplicate check and the save.
        // Without atomicity, two concurrent requests could both pass the "exists?" check
        // and then both proceed to save, creating duplicate check-in records.
        val saved = checkinRepository.saveIfAbsent(checkin)
        if (!saved) {
            logger.warn(
                "action=checkin_duplicate_rejected flightId={} passengerId={}",
                flight.id, passenger.id
            )
            throw CheckinAlreadyExistsException(
                "Passenger ${passenger.id} already checked in for flight ${flight.id}"
            )
        }

        logger.info(
            "action=checkin_saved checkinId={} flightId={} passengerId={} boardingGate={} boardingTime={}",
            checkin.id, checkin.flightId, checkin.passengerId, checkin.boardingGate, checkin.boardingTime
        )

        // Decision: event is published after the save succeeds.
        // See class-level JavaDoc for the trade-off regarding the Outbox pattern.
        eventPublisher.publish(
            CheckinCompletedEvent(
                passengerEmail = passenger.email,
                flightId = flight.id,
                checkinId = checkin.id
            )
        )
        logger.info(
            "action=checkin_event_published checkinId={} passengerEmail={}",
            checkin.id, passenger.email
        )

        return checkin
    }

    /**
     * Assigns a boarding gate deterministically based on the flight number.
     *
     * <p>The assignment is stable: the same flight number always maps to the same gate.
     * In a real system this would come from an airport resource management system.</p>
     *
     * @param flightNumber the flight's alphanumeric identifier.
     * @return a gate label from the predefined pool (e.g., "A1", "B2").
     */
    private fun assignBoardingGate(flightNumber: String): String {
        val gates = listOf("A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2")
        val index = flightNumber.hashCode().and(0x7FFF_FFFF) % gates.size
        return gates[index]
    }
}
