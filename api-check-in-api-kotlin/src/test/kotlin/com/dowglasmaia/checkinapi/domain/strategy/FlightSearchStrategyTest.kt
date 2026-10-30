package com.dowglasmaia.checkinapi.domain.strategy

import com.dowglasmaia.checkinapi.application.port.FlightRepository
import com.dowglasmaia.checkinapi.application.port.PassengerRepository
import com.dowglasmaia.checkinapi.domain.model.Flight
import com.dowglasmaia.checkinapi.domain.model.FlightStatus
import com.dowglasmaia.checkinapi.domain.model.Passenger
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.mockk.*
import java.time.LocalDateTime
import java.time.ZoneOffset

class FlightSearchStrategyTest : FunSpec({

    val flightRepository = mockk<FlightRepository>()
    val passengerRepository = mockk<PassengerRepository>()

    val sampleFlight = Flight(
        id = "FL-001",
        flightNumber = "MF100",
        bookingCode = "ABC123",
        origin = "GRU",
        destination = "JFK",
        departureTime = LocalDateTime.now(ZoneOffset.UTC).plusHours(24),
        status = FlightStatus.SCHEDULED,
        passengerIds = listOf("P-001")
    )

    context("FlightNumberSearchStrategy") {
        val strategy = FlightNumberSearchStrategy(flightRepository)

        test("returns flights matching the flight number") {
            every { flightRepository.findByFlightNumber("MF100") } returns listOf(sampleFlight)

            val result = strategy.search("MF100")

            result.flights shouldHaveSize 1
            result.flights[0].flightNumber shouldBe "MF100"
            verify(exactly = 1) { flightRepository.findByFlightNumber("MF100") }
        }

        test("returns empty list when no flight matches") {
            every { flightRepository.findByFlightNumber("UNKNOWN") } returns emptyList()

            val result = strategy.search("UNKNOWN")

            result.flights.shouldBeEmpty()
        }
    }

    context("BookingCodeSearchStrategy") {
        val strategy = BookingCodeSearchStrategy(flightRepository)

        test("returns flights matching the booking code") {
            every { flightRepository.findByBookingCode("ABC123") } returns listOf(sampleFlight)

            val result = strategy.search("ABC123")

            result.flights shouldHaveSize 1
            result.flights[0].bookingCode shouldBe "ABC123"
            verify(exactly = 1) { flightRepository.findByBookingCode("ABC123") }
        }

        test("returns empty list when booking code not found") {
            every { flightRepository.findByBookingCode("NOTFOUND") } returns emptyList()

            val result = strategy.search("NOTFOUND")

            result.flights.shouldBeEmpty()
        }
    }

    context("DocumentSearchStrategy") {
        val strategy = DocumentSearchStrategy(flightRepository, passengerRepository)

        val samplePassenger = Passenger(
            id = "P-001",
            name = "João Silva",
            document = "123.456.789-00",
            email = "joao@email.com"
        )

        test("returns flights for passenger found by document") {
            every { passengerRepository.findByDocument("123.456.789-00") } returns samplePassenger
            every { flightRepository.findByPassengerId("P-001") } returns listOf(sampleFlight)

            val result = strategy.search("123.456.789-00")

            result.flights shouldHaveSize 1
            result.flights[0].id shouldBe "FL-001"
            result.passengerId shouldBe "P-001"
            verify(exactly = 1) { passengerRepository.findByDocument("123.456.789-00") }
            verify(exactly = 1) { flightRepository.findByPassengerId("P-001") }
        }


        test("returns no flights and no passenger when the document is unknown") {
            every { passengerRepository.findByDocument("000") } returns null

            val result = strategy.search("000")

            result.flights.shouldBeEmpty()
            result.passengerId shouldBe null
        }
    }
})
