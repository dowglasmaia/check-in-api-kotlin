package com.dowglasmaia.checkinapi.application.usecase

import com.dowglasmaia.checkinapi.application.usecase.impl.SearchFlightsUseCaseImpl
import com.dowglasmaia.checkinapi.application.usecase.input.SearchFlightsInput
import com.dowglasmaia.checkinapi.domain.model.Flight
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
import java.time.LocalDateTime

/**
 * Unit tests for [SearchFlightsUseCaseImpl].
 *
 * Strategy and policy are mocked — only the use case orchestration logic is exercised.
 * Each test clears mocks in [beforeTest] to prevent expectations leaking between tests.
 */
class SearchFlightsUseCaseTest : FunSpec({

    val strategyResolver = mockk<FlightSearchStrategyResolver>()
    val checkinPolicy = mockk<CheckinPolicy>()
    val strategy = mockk<FlightSearchStrategy>()

    val useCase: SearchFlightsUseCase = SearchFlightsUseCaseImpl(strategyResolver, checkinPolicy)

    val eligibleFlight = Flight(
        id = "FL-001",
        flightNumber = "MF100",
        bookingCode = "ABC123",
        origin = "GRU",
        destination = "JFK",
        departureTime = LocalDateTime.now().plusHours(24),
        status = FlightStatus.SCHEDULED,
        passengerIds = listOf("P-001")
    )

    val ineligibleFlight = eligibleFlight.copy(id = "FL-002", status = FlightStatus.CANCELLED)

    beforeTest { clearMocks(strategyResolver, checkinPolicy, strategy) }

    // ── Happy path ──────────────────────────────────────────────────────────

    test("returns eligible flights when the strategy finds matching results") {
        every { strategyResolver.resolve(SearchType.FLIGHT_NUMBER) } returns strategy
        every { strategy.search("MF100") } returns listOf(eligibleFlight)
        every { checkinPolicy.canCheckin(eligibleFlight) } returns true

        val result = useCase.execute(SearchFlightsInput(SearchType.FLIGHT_NUMBER, "MF100"))

        result shouldHaveSize 1
        result[0].id shouldBe "FL-001"
        verify(exactly = 1) { strategy.search("MF100") }
    }

    test("delegates to BOOKING_CODE strategy when search type is BOOKING_CODE") {
        every { strategyResolver.resolve(SearchType.BOOKING_CODE) } returns strategy
        every { strategy.search("ABC123") } returns listOf(eligibleFlight)
        every { checkinPolicy.canCheckin(eligibleFlight) } returns true

        val result = useCase.execute(SearchFlightsInput(SearchType.BOOKING_CODE, "ABC123"))

        result shouldHaveSize 1
        verify(exactly = 1) { strategyResolver.resolve(SearchType.BOOKING_CODE) }
    }

    test("delegates to DOCUMENT strategy when search type is DOCUMENT") {
        every { strategyResolver.resolve(SearchType.DOCUMENT) } returns strategy
        every { strategy.search("123.456.789-00") } returns listOf(eligibleFlight)
        every { checkinPolicy.canCheckin(eligibleFlight) } returns true

        val result = useCase.execute(SearchFlightsInput(SearchType.DOCUMENT, "123.456.789-00"))

        result shouldHaveSize 1
        verify(exactly = 1) { strategyResolver.resolve(SearchType.DOCUMENT) }
    }

    // ── Filtering ───────────────────────────────────────────────────────────

    test("returns empty list when no flight passes the check-in policy") {
        every { strategyResolver.resolve(SearchType.FLIGHT_NUMBER) } returns strategy
        every { strategy.search("MF100") } returns listOf(ineligibleFlight)
        every { checkinPolicy.canCheckin(ineligibleFlight) } returns false

        val result = useCase.execute(SearchFlightsInput(SearchType.FLIGHT_NUMBER, "MF100"))

        result.shouldBeEmpty()
    }

    test("returns only eligible flights when strategy results contain a mix") {
        every { strategyResolver.resolve(SearchType.FLIGHT_NUMBER) } returns strategy
        every { strategy.search("MF100") } returns listOf(eligibleFlight, ineligibleFlight)
        every { checkinPolicy.canCheckin(eligibleFlight) } returns true
        every { checkinPolicy.canCheckin(ineligibleFlight) } returns false

        val result = useCase.execute(SearchFlightsInput(SearchType.FLIGHT_NUMBER, "MF100"))

        result shouldHaveSize 1
        result[0].id shouldBe "FL-001"
    }

    test("returns empty list when strategy finds no flights") {
        every { strategyResolver.resolve(SearchType.FLIGHT_NUMBER) } returns strategy
        every { strategy.search("UNKNOWN") } returns emptyList()

        val result = useCase.execute(SearchFlightsInput(SearchType.FLIGHT_NUMBER, "UNKNOWN"))

        result.shouldBeEmpty()
        verify(exactly = 0) { checkinPolicy.canCheckin(any()) }
    }

    // ── Input validation ────────────────────────────────────────────────────

    test("throws IllegalArgumentException when search value is blank") {
        shouldThrow<IllegalArgumentException> {
            useCase.execute(SearchFlightsInput(SearchType.FLIGHT_NUMBER, "   "))
        }
    }

    test("throws IllegalArgumentException when search value is empty") {
        shouldThrow<IllegalArgumentException> {
            useCase.execute(SearchFlightsInput(SearchType.FLIGHT_NUMBER, ""))
        }
    }
})
