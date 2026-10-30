package com.dowglasmaia.checkinapi.application.usecase

import com.dowglasmaia.checkinapi.api.exception.CheckinAlreadyExistsException
import com.dowglasmaia.checkinapi.api.exception.CheckinNotAllowedException
import com.dowglasmaia.checkinapi.api.exception.FlightNotFoundException
import com.dowglasmaia.checkinapi.api.exception.PassengerNotFoundException
import com.dowglasmaia.checkinapi.api.exception.PassengerNotOnFlightException
import com.dowglasmaia.checkinapi.application.port.CheckinRepository
import com.dowglasmaia.checkinapi.application.port.EventPublisher
import com.dowglasmaia.checkinapi.application.port.FlightRepository
import com.dowglasmaia.checkinapi.application.port.PassengerRepository
import com.dowglasmaia.checkinapi.application.usecase.impl.PerformCheckinUseCaseImpl
import com.dowglasmaia.checkinapi.application.usecase.input.PerformCheckinInput
import com.dowglasmaia.checkinapi.domain.event.CheckinCompletedEvent
import com.dowglasmaia.checkinapi.domain.model.Checkin
import com.dowglasmaia.checkinapi.domain.model.Flight
import com.dowglasmaia.checkinapi.domain.model.FlightStatus
import com.dowglasmaia.checkinapi.domain.model.Passenger
import com.dowglasmaia.checkinapi.domain.policy.CheckinPolicy
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.mockk.clearMocks
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import io.mockk.slot
import io.mockk.verify
import java.time.LocalDateTime
import java.time.ZoneOffset

class PerformCheckinUseCaseTest : FunSpec({

    val flightRepository = mockk<FlightRepository>()
    val passengerRepository = mockk<PassengerRepository>()
    val checkinRepository = mockk<CheckinRepository>()
    val checkinPolicy = mockk<CheckinPolicy>()
    val eventPublisher = mockk<EventPublisher>()

    val useCase: PerformCheckinUseCase = PerformCheckinUseCaseImpl(
        flightRepository, passengerRepository, checkinRepository, checkinPolicy, eventPublisher
    )

    val flight = Flight(
        id = "FL-001",
        flightNumber = "MF100",
        bookingCode = "ABC123",
        origin = "GRU",
        destination = "JFK",
        departureTime = LocalDateTime.now(ZoneOffset.UTC).plusHours(24),
        status = FlightStatus.SCHEDULED,
        passengerIds = listOf("P-001")
    )

    val passenger = Passenger(
        id = "P-001",
        name = "João Silva",
        document = "123.456.789-00",
        email = "joao@email.com"
    )

    val input = PerformCheckinInput(flightId = "FL-001", passengerId = "P-001")

    beforeTest {
        clearMocks(flightRepository, passengerRepository, checkinRepository, checkinPolicy, eventPublisher)
    }

    test("returns a confirmed Checkin with correct flight, passenger, and boarding info") {
        every { flightRepository.findById("FL-001") } returns flight
        every { passengerRepository.findById("P-001") } returns passenger
        every { checkinPolicy.canCheckin(flight) } returns true
        every { checkinRepository.saveIfAbsent(any()) } returns true
        every { eventPublisher.publish(any()) } just runs

        val result = useCase.execute(input)

        result.flightId shouldBe "FL-001"
        result.passengerId shouldBe "P-001"
        result.id shouldNotBe null
        result.boardingGate shouldNotBe null
        result.boardingTime shouldBe flight.departureTime.minusMinutes(30)
    }

    test("calls saveIfAbsent with the constructed Checkin record") {
        val savedCheckin = slot<Checkin>()
        every { flightRepository.findById("FL-001") } returns flight
        every { passengerRepository.findById("P-001") } returns passenger
        every { checkinPolicy.canCheckin(flight) } returns true
        every { checkinRepository.saveIfAbsent(capture(savedCheckin)) } returns true
        every { eventPublisher.publish(any()) } just runs

        useCase.execute(input)

        verify(exactly = 1) { checkinRepository.saveIfAbsent(any()) }
        savedCheckin.captured.flightId shouldBe "FL-001"
        savedCheckin.captured.passengerId shouldBe "P-001"
    }

    test("publishes CheckinCompletedEvent with the passenger email after a successful save") {
        every { flightRepository.findById("FL-001") } returns flight
        every { passengerRepository.findById("P-001") } returns passenger
        every { checkinPolicy.canCheckin(flight) } returns true
        every { checkinRepository.saveIfAbsent(any()) } returns true
        val publishedEvent = slot<CheckinCompletedEvent>()
        every { eventPublisher.publish(capture(publishedEvent)) } just runs

        useCase.execute(input)

        verify(exactly = 1) { eventPublisher.publish(any()) }
        publishedEvent.captured.passengerEmail shouldBe "joao@email.com"
        publishedEvent.captured.flightId shouldBe "FL-001"
        publishedEvent.captured.checkinId shouldNotBe null
    }

    test("does not publish an event when the save is rejected as a duplicate") {
        every { flightRepository.findById("FL-001") } returns flight
        every { passengerRepository.findById("P-001") } returns passenger
        every { checkinPolicy.canCheckin(flight) } returns true
        every { checkinRepository.saveIfAbsent(any()) } returns false

        shouldThrow<CheckinAlreadyExistsException> { useCase.execute(input) }

        verify(exactly = 0) { eventPublisher.publish(any()) }
    }

    test("throws FlightNotFoundException when the flight does not exist") {
        every { flightRepository.findById("FL-999") } returns null

        shouldThrow<FlightNotFoundException> {
            useCase.execute(input.copy(flightId = "FL-999"))
        }
    }

    test("throws PassengerNotFoundException when the passenger does not exist") {
        every { flightRepository.findById("FL-001") } returns flight
        every { passengerRepository.findById("P-999") } returns null

        shouldThrow<PassengerNotFoundException> {
            useCase.execute(input.copy(passengerId = "P-999"))
        }
    }

    test("throws CheckinNotAllowedException when the policy rejects the flight") {
        every { flightRepository.findById("FL-001") } returns flight
        every { passengerRepository.findById("P-001") } returns passenger
        every { checkinPolicy.canCheckin(flight) } returns false

        shouldThrow<CheckinNotAllowedException> { useCase.execute(input) }
    }

    test("does not call the repository when the policy rejects the flight") {
        every { flightRepository.findById("FL-001") } returns flight
        every { passengerRepository.findById("P-001") } returns passenger
        every { checkinPolicy.canCheckin(flight) } returns false

        shouldThrow<CheckinNotAllowedException> { useCase.execute(input) }

        verify(exactly = 0) { checkinRepository.saveIfAbsent(any()) }
    }

    test("throws CheckinAlreadyExistsException when saveIfAbsent returns false") {
        every { flightRepository.findById("FL-001") } returns flight
        every { passengerRepository.findById("P-001") } returns passenger
        every { checkinPolicy.canCheckin(flight) } returns true
        // saveIfAbsent returns false → repository detected a duplicate atomically
        every { checkinRepository.saveIfAbsent(any()) } returns false

        shouldThrow<CheckinAlreadyExistsException> { useCase.execute(input) }
    }

    test("throws PassengerNotOnFlightException when the passenger is not booked on the flight") {
        val outsider = passenger.copy(id = "P-009")
        every { flightRepository.findById("FL-001") } returns flight
        every { passengerRepository.findById("P-009") } returns outsider

        shouldThrow<PassengerNotOnFlightException> {
            useCase.execute(PerformCheckinInput(flightId = "FL-001", passengerId = "P-009"))
        }

        verify(exactly = 0) { checkinRepository.saveIfAbsent(any()) }
        verify(exactly = 0) { eventPublisher.publish(any()) }
    }

    test("still returns the Checkin when the event publisher fails after the save") {
        every { flightRepository.findById("FL-001") } returns flight
        every { passengerRepository.findById("P-001") } returns passenger
        every { checkinPolicy.canCheckin(flight) } returns true
        every { checkinRepository.saveIfAbsent(any()) } returns true
        every { eventPublisher.publish(any()) } throws IllegalStateException("broker down")

        val result = useCase.execute(input)

        result.flightId shouldBe "FL-001"
        verify(exactly = 1) { checkinRepository.saveIfAbsent(any()) }
    }
})
