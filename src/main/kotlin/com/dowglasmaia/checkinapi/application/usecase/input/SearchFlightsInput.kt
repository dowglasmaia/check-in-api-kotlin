package com.dowglasmaia.checkinapi.application.usecase.input

import com.dowglasmaia.checkinapi.domain.model.SearchType

/**
 * Immutable input for the [com.dowglasmaia.checkinapi.application.usecase.SearchFlightsUseCase].
 *
 * Using a dedicated input class instead of individual parameters:
 * - keeps the use case signature stable when new optional filters are added;
 * - makes the contract explicit and self-documenting;
 * - enables validation at construction time via [require].
 *
 * @property searchType the strategy the system will use to locate flights.
 * @property value the raw search term (flight number, booking code, or document number).
 */
data class SearchFlightsInput(
    val searchType: SearchType,
    val value: String
)
