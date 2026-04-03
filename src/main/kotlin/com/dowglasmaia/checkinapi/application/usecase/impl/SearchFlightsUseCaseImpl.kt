package com.dowglasmaia.checkinapi.application.usecase.impl

import com.dowglasmaia.checkinapi.application.usecase.SearchFlightsUseCase
import com.dowglasmaia.checkinapi.application.usecase.input.SearchFlightsInput
import com.dowglasmaia.checkinapi.domain.model.Flight
import com.dowglasmaia.checkinapi.domain.policy.CheckinPolicy
import com.dowglasmaia.checkinapi.domain.strategy.FlightSearchStrategyResolver
import org.slf4j.LoggerFactory

/**
 * Default implementation of [SearchFlightsUseCase].
 *
 * <p>Responsibilities:</p>
 * <ul>
 *   <li>Validate that the search value is not blank (fail-fast, before any I/O).</li>
 *   <li>Delegate flight lookup to the correct [com.dowglasmaia.checkinapi.domain.strategy.FlightSearchStrategy]
 *       resolved at runtime by [FlightSearchStrategyResolver].</li>
 *   <li>Filter the results through [CheckinPolicy] to return only check-in-eligible flights.</li>
 * </ul>
 *
 * <p><strong>Why strategy resolution happens here and not in the controller:</strong>
 * The controller must remain ignorant of domain rules. Choosing a search strategy is
 * a domain/application concern — it belongs in the use case layer.</p>
 *
 * <p><strong>Thread safety:</strong> this class holds no mutable state; all dependencies
 * are injected as immutable references. It is safe to share a single instance across
 * virtual threads.</p>
 *
 * @param strategyResolver resolves the correct [com.dowglasmaia.checkinapi.domain.strategy.FlightSearchStrategy]
 *   for the given [com.dowglasmaia.checkinapi.domain.model.SearchType].
 * @param checkinPolicy evaluates whether a flight is within the check-in window.
 */
class SearchFlightsUseCaseImpl(
    private val strategyResolver: FlightSearchStrategyResolver,
    private val checkinPolicy: CheckinPolicy
) : SearchFlightsUseCase {

    private val logger = LoggerFactory.getLogger(SearchFlightsUseCaseImpl::class.java)

    /**
     * Searches for flights eligible for check-in.
     *
     * @param input search criteria; [SearchFlightsInput.value] must not be blank.
     * @return eligible flights filtered by [CheckinPolicy]; never null, may be empty.
     * @throws IllegalArgumentException if [SearchFlightsInput.value] is blank.
     */
    override fun execute(input: SearchFlightsInput): List<Flight> {
        require(input.value.isNotBlank()) { "Search value cannot be blank" }

        logger.info(
            "action=search_flights_start searchType={} value={}",
            input.searchType,
            input.value
        )

        // Decision: strategy is resolved at runtime from the search type.
        // Adding a new search type requires only a new strategy class + registration
        // in FlightSearchStrategyResolver — no changes here (Open/Closed Principle).
        val strategy = strategyResolver.resolve(input.searchType)
        logger.debug("action=strategy_resolved strategy={}", strategy::class.simpleName)

        val allFlights = strategy.search(input.value)

        // Decision: policy filtering is the use case's responsibility, not the strategy's.
        // Strategies are single-purpose (find flights by criterion);
        // policies are single-purpose (decide eligibility).
        val eligibleFlights = allFlights.filter { checkinPolicy.canCheckin(it) }

        logger.info(
            "action=search_flights_completed searchType={} totalFound={} eligible={}",
            input.searchType,
            allFlights.size,
            eligibleFlights.size
        )

        return eligibleFlights
    }
}
