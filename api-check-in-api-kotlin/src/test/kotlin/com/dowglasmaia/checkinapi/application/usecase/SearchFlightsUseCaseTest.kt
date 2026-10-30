package com.dowglasmaia.checkinapi.application.usecase

import com.dowglasmaia.checkinapi.application.usecase.impl.SearchFlightsUseCaseImpl
import com.dowglasmaia.checkinapi.application.usecase.input.SearchFlightsInput
import com.dowglasmaia.checkinapi.domain.model.Flight
import com.dowglasmaia.checkinapi.domain.model.FlightSearchResult
import com.dowglasmaia.checkinapi.domain.model.FlightStatus
import com.dowglasmaia.checkinapi.domain.model.SearchType
import com.dowglasmaia.checkinapi.domain.policy.CheckinPolicy
import com.dowglasmaia.checkinapi.domain.strategy.FlightSearchStrategy
import com.dowglasmaia.checkinapi.domain.strategy.FlightSearchStrategyResolver
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.mockk.clearMocks
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.time.Clock
import java.time.LocalDateTime
import java.time.ZoneOffset

class SearchFlightsUseCaseTest : FunSpec({

    val now = LocalDateTime.of(2026, 1, 10, 12, 0)
    val strategyResolver = mockk<FlightSearchStrategyResolver>()
    val checkinPolicy = mockk<CheckinPolicy>()
    val strategy = mockk<FlightSearchStrategy>()

    val useCase: SearchFlightsUseCase = SearchFlightsUseCaseImpl(
        strategyResolver, checkinPolicy, Clock.fixed(now.toInstant(ZoneOffset.UTC), ZoneOffset.UTC)
    )

    val upcoming = Flight(
        id = "FL-001",
        flightNumber = "MF100",
        bookingCode = "ABC123",
        origin = "GRU",
        destination = "JFK",
        departureTime = now.plusHours(24),
        status = FlightStatus.SCHEDULED,
        passengerIds = listOf("P-001")
    )
    val cancelled = upcoming.copy(id = "FL-002", status = FlightStatus.CANCELLED)
    val departed = upcoming.copy(id = "FL-003", departureTime = now.minusHours(1))

    beforeTest {
        clearMocks(strategyResolver, checkinPolicy, strategy)
        every { checkinPolicy.checkinOpensAt(any()) } answers { firstArg<Flight>().departureTime.minusHours(72) }
    }

    fun searchReturning(type: SearchType, value: String, result: FlightSearchResult) {
        every { strategyResolver.resolve(type) } returns strategy
        every { strategy.search(value) } returns result
    }

    test("returns the flight with its availability and the moment check-in opens") {
        searchReturning(SearchType.FLIGHT_NUMBER, "MF100", FlightSearchResult(listOf(upcoming)))
        every { checkinPolicy.canCheckin(upcoming) } returns true

        val output = useCase.execute(SearchFlightsInput(SearchType.FLIGHT_NUMBER, "MF100"))

        output.flights shouldHaveSize 1
        output.flights[0].flight.id shouldBe "FL-001"
        output.flights[0].checkinAvailable shouldBe true
        output.flights[0].checkinOpensAt shouldBe now.plusHours(24).minusHours(72)
        output.passengerId shouldBe null
    }

    test("keeps flights whose check-in is not available, flagged as unavailable") {
        searchReturning(SearchType.BOOKING_CODE, "ABC123", FlightSearchResult(listOf(upcoming, cancelled)))
        every { checkinPolicy.canCheckin(upcoming) } returns true
        every { checkinPolicy.canCheckin(cancelled) } returns false

        val output = useCase.execute(SearchFlightsInput(SearchType.BOOKING_CODE, "ABC123"))

        output.flights.map { it.flight.id to it.checkinAvailable } shouldBe listOf("FL-001" to true, "FL-002" to false)
    }

    test("drops flights that have already departed") {
        searchReturning(SearchType.FLIGHT_NUMBER, "MF100", FlightSearchResult(listOf(departed, upcoming)))
        every { checkinPolicy.canCheckin(any()) } returns true

        val output = useCase.execute(SearchFlightsInput(SearchType.FLIGHT_NUMBER, "MF100"))

        output.flights.map { it.flight.id } shouldBe listOf("FL-001")
    }

    test("passes the passenger id of a DOCUMENT search through") {
        searchReturning(SearchType.DOCUMENT, "123.456.789-00", FlightSearchResult(listOf(upcoming), "P-001"))
        every { checkinPolicy.canCheckin(upcoming) } returns true

        val output = useCase.execute(SearchFlightsInput(SearchType.DOCUMENT, "123.456.789-00"))

        output.passengerId shouldBe "P-001"
        verify(exactly = 1) { strategyResolver.resolve(SearchType.DOCUMENT) }
    }

    test("trims the search value before delegating to the strategy") {
        searchReturning(SearchType.FLIGHT_NUMBER, "MF100", FlightSearchResult(emptyList()))

        useCase.execute(SearchFlightsInput(SearchType.FLIGHT_NUMBER, "  MF100 "))

        verify(exactly = 1) { strategy.search("MF100") }
    }

    test("returns an empty list when the strategy finds nothing") {
        searchReturning(SearchType.FLIGHT_NUMBER, "UNKNOWN", FlightSearchResult(emptyList()))

        val output = useCase.execute(SearchFlightsInput(SearchType.FLIGHT_NUMBER, "UNKNOWN"))

        output.flights.shouldBeEmpty()
        verify(exactly = 0) { checkinPolicy.canCheckin(any()) }
    }

    test("rejects a blank search value") {
        shouldThrow<IllegalArgumentException> {
            useCase.execute(SearchFlightsInput(SearchType.FLIGHT_NUMBER, "   "))
        }
        shouldThrow<IllegalArgumentException> {
            useCase.execute(SearchFlightsInput(SearchType.FLIGHT_NUMBER, ""))
        }
    }
})
