package com.dowglasmaia.checkinapi.infrastructure.seed

import com.dowglasmaia.checkinapi.application.usecase.impl.SearchFlightsUseCaseImpl
import com.dowglasmaia.checkinapi.application.usecase.input.SearchFlightsInput
import com.dowglasmaia.checkinapi.domain.model.SearchType
import com.dowglasmaia.checkinapi.domain.policy.HoursBeforeDeparturePolicy
import com.dowglasmaia.checkinapi.domain.strategy.BookingCodeSearchStrategy
import com.dowglasmaia.checkinapi.domain.strategy.DocumentSearchStrategy
import com.dowglasmaia.checkinapi.domain.strategy.FlightNumberSearchStrategy
import com.dowglasmaia.checkinapi.domain.strategy.FlightSearchStrategyResolver
import com.dowglasmaia.checkinapi.infrastructure.repository.InMemoryFlightRepository
import com.dowglasmaia.checkinapi.infrastructure.repository.InMemoryPassengerRepository
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.collections.shouldContainAll
import io.kotest.matchers.shouldBe
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

class DemoSeedTest : FunSpec({

    fun clockAt(iso: String) = Clock.fixed(Instant.parse(iso), ZoneOffset.UTC)

    test("every scenario returns the number of flights it announces") {
        val clock = clockAt("2026-03-05T14:37:00Z")
        val seed = DemoSeed(clock)
        val flights = InMemoryFlightRepository(seed)
        val passengers = InMemoryPassengerRepository(seed)
        val useCase = SearchFlightsUseCaseImpl(
            FlightSearchStrategyResolver(
                mapOf(
                    SearchType.FLIGHT_NUMBER to FlightNumberSearchStrategy(flights),
                    SearchType.BOOKING_CODE to BookingCodeSearchStrategy(flights),
                    SearchType.DOCUMENT to DocumentSearchStrategy(flights, passengers)
                )
            ),
            HoursBeforeDeparturePolicy(clock = clock),
            clock
        )

        seed.scenarios().forEach { scenario ->
            val output = useCase.execute(SearchFlightsInput(scenario.searchType, scenario.value))
            output.flights.size shouldBe scenario.expectedFlights
        }
    }

    test("the booking scenario mixes an open, a not-yet-open and a cancelled flight") {
        val clock = clockAt("2026-03-05T14:37:00Z")
        val seed = DemoSeed(clock)
        val policy = HoursBeforeDeparturePolicy(clock = clock)

        val maia7k = seed.flights().filter { it.bookingCode == "MAIA7K" }

        maia7k.associate { it.flightNumber to policy.canCheckin(it) } shouldBe
            mapOf("MF214" to true, "MF215" to false, "MF3010" to false)
    }

    test("departures are stable within an hour and move with the clock, so the data never expires") {
        val early = DemoSeed(clockAt("2026-03-05T14:05:00Z")).flights().map { it.departureTime }
        val late = DemoSeed(clockAt("2026-03-05T14:55:00Z")).flights().map { it.departureTime }
        val nextDay = DemoSeed(clockAt("2026-03-06T14:05:00Z")).flights().map { it.departureTime }

        early shouldBe late
        nextDay.map { it.minusDays(1) } shouldBe early
    }

    test("every flight lists the fictitious passengers booked on it") {
        val seed = DemoSeed(clockAt("2026-03-05T14:37:00Z"))
        val byFlight = seed.passengersByFlight().mapKeys { it.key.id }.mapValues { entry -> entry.value.map { it.id } }

        byFlight["FL-004"] shouldBe listOf("P-004", "P-005")
        byFlight["FL-007"] shouldBe listOf("P-006")
        seed.flights().forEach { flight -> byFlight[flight.id] shouldBe flight.passengerIds }
    }

    test("passenger documents are unique") {
        val documents = DemoSeed(clockAt("2026-03-05T14:00:00Z")).passengers.map { it.document }
        documents.distinct().size shouldBe documents.size
        documents shouldContainAll listOf("123.456.789-00", "123.456.789-09")
    }
})
