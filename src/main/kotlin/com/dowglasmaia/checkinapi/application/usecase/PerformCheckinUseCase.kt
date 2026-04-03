package com.dowglasmaia.checkinapi.application.usecase

import com.dowglasmaia.checkinapi.application.usecase.input.PerformCheckinInput
import com.dowglasmaia.checkinapi.domain.model.Checkin

/**
 * Use case that performs a passenger's check-in for a specific flight.
 *
 * <p>This use case orchestrates the full check-in flow:</p>
 * <ol>
 *   <li>Validates that the flight and passenger exist.</li>
 *   <li>Applies the check-in eligibility policy (72-hour window, flight status).</li>
 *   <li>Prevents duplicate check-ins with a thread-safe atomic operation.</li>
 *   <li>Persists the check-in record.</li>
 *   <li>Publishes a domain event so downstream services can send confirmation e-mails.</li>
 * </ol>
 *
 * <p><strong>Thread safety:</strong> duplicate detection and persistence are performed
 * atomically by the repository — concurrent requests for the same passenger/flight
 * pair will not create two check-in records.</p>
 */
interface PerformCheckinUseCase {

    /**
     * Executes the check-in use case.
     *
     * @param input the flight and passenger identifiers.
     * @return the confirmed [Checkin] record containing the boarding gate and boarding time.
     * @throws com.dowglasmaia.checkinapi.api.exception.FlightNotFoundException if the flight does not exist.
     * @throws com.dowglasmaia.checkinapi.api.exception.PassengerNotFoundException if the passenger does not exist.
     * @throws com.dowglasmaia.checkinapi.api.exception.CheckinNotAllowedException if the flight is outside the check-in window or has an ineligible status.
     * @throws com.dowglasmaia.checkinapi.api.exception.CheckinAlreadyExistsException if the passenger already has a check-in for this flight.
     */
    fun execute(input: PerformCheckinInput): Checkin
}
