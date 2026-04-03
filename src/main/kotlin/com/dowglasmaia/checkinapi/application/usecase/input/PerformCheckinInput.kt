package com.dowglasmaia.checkinapi.application.usecase.input

/**
 * Immutable input for the [com.dowglasmaia.checkinapi.application.usecase.PerformCheckinUseCase].
 *
 * @property flightId unique identifier of the flight the passenger wants to check in for.
 * @property passengerId unique identifier of the passenger performing the check-in.
 */
data class PerformCheckinInput(
    val flightId: String,
    val passengerId: String
)
