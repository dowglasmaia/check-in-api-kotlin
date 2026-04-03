package com.dowglasmaia.checkinapi.application.usecase

import com.dowglasmaia.checkinapi.application.usecase.input.SearchFlightsInput
import com.dowglasmaia.checkinapi.domain.model.Flight

/**
 * Use case that searches for flights available for check-in.
 *
 * <p>The caller provides a [SearchFlightsInput] describing how to locate the flights
 * (by flight number, booking code, or passenger document). The use case delegates
 * the actual search to the appropriate [com.dowglasmaia.checkinapi.domain.strategy.FlightSearchStrategy]
 * and then filters results through the [com.dowglasmaia.checkinapi.domain.policy.CheckinPolicy]
 * to return only flights within the allowed check-in window.</p>
 *
 * <p><strong>Design note — interface over concrete class:</strong>
 * Declaring a port (interface) here respects the Dependency Inversion Principle:
 * the controller depends on an abstraction, not on the implementation class.
 * This also simplifies mocking in unit tests without loading the Spring context.</p>
 */
interface SearchFlightsUseCase {

    /**
     * Executes the flight search use case.
     *
     * @param input the search criteria; [SearchFlightsInput.value] must not be blank.
     * @return list of [Flight] objects that are eligible for check-in; never null, may be empty.
     * @throws IllegalArgumentException if [SearchFlightsInput.value] is blank.
     */
    fun execute(input: SearchFlightsInput): List<Flight>
}
