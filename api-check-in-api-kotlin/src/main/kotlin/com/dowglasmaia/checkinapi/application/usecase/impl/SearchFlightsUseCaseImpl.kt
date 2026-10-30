package com.dowglasmaia.checkinapi.application.usecase.impl

import com.dowglasmaia.checkinapi.application.usecase.SearchFlightsUseCase
import com.dowglasmaia.checkinapi.application.usecase.input.SearchFlightsInput
import com.dowglasmaia.checkinapi.application.usecase.output.SearchFlightsOutput
import com.dowglasmaia.checkinapi.application.usecase.output.SearchedFlight
import com.dowglasmaia.checkinapi.domain.policy.CheckinPolicy
import com.dowglasmaia.checkinapi.domain.strategy.FlightSearchStrategyResolver
import org.slf4j.LoggerFactory
import java.time.Clock
import java.time.LocalDateTime

class SearchFlightsUseCaseImpl(
    private val strategyResolver: FlightSearchStrategyResolver,
    private val checkinPolicy: CheckinPolicy,
    private val clock: Clock = Clock.systemUTC()
) : SearchFlightsUseCase {

    private val logger = LoggerFactory.getLogger(SearchFlightsUseCaseImpl::class.java)

    override fun execute(input: SearchFlightsInput): SearchFlightsOutput {
        require(input.value.isNotBlank()) { "Search value cannot be blank" }
        val value = input.value.trim()

        // The value can be a personal document or booking code: log its length only.
        logger.info("action=search_flights_start searchType={} valueLength={}", input.searchType, value.length)

        val result = strategyResolver.resolve(input.searchType).search(value)

        val now = LocalDateTime.now(clock)
        val flights = result.flights
            .filter { !it.departureTime.isBefore(now) }
            .map { SearchedFlight(it, checkinPolicy.canCheckin(it), checkinPolicy.checkinOpensAt(it)) }

        logger.info(
            "action=search_flights_completed searchType={} found={} checkinAvailable={}",
            input.searchType, flights.size, flights.count { it.checkinAvailable }
        )

        return SearchFlightsOutput(flights, result.passengerId)
    }
}
