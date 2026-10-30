package com.dowglasmaia.checkinapi.domain.policy

import com.dowglasmaia.checkinapi.domain.model.Flight
import com.dowglasmaia.checkinapi.domain.model.FlightStatus
import io.kotest.core.spec.style.BehaviorSpec
import io.kotest.matchers.shouldBe
import java.time.LocalDateTime

class HoursBeforeDeparturePolicyTest : BehaviorSpec({

    val policy = HoursBeforeDeparturePolicy(maxHoursBeforeDeparture = 72)

    fun flightWith(
        departureTime: LocalDateTime,
        status: FlightStatus = FlightStatus.SCHEDULED
    ) = Flight(
        id = "FL-001",
        flightNumber = "MF100",
        bookingCode = "ABC123",
        origin = "GRU",
        destination = "JFK",
        departureTime = departureTime,
        status = status,
        passengerIds = listOf("P-001")
    )

   Given("a scheduled flight within the 72-hour window") {
        val flight = flightWith(LocalDateTime.now().plusHours(24))

        When("canCheckin is called") {
            val result = policy.canCheckin(flight)

            Then("it should return true") {
                result shouldBe true
            }
        }
    }

    Given("a scheduled flight at the boundary of 72 hours") {
        val flight = flightWith(LocalDateTime.now().plusHours(72))

        When("canCheckin is called") {
            val result = policy.canCheckin(flight)

            Then("it should return true") {
                result shouldBe true
            }
        }
    }

    Given("a cancelled flight within the 72-hour window") {
        val flight = flightWith(LocalDateTime.now().plusHours(24), FlightStatus.CANCELLED)

        When("canCheckin is called") {
            val result = policy.canCheckin(flight)

            Then("it should return false") {
                result shouldBe false
            }
        }
    }

    Given("a boarded flight") {
        val flight = flightWith(LocalDateTime.now().plusHours(1), FlightStatus.BOARDED)

        When("canCheckin is called") {
            val result = policy.canCheckin(flight)

            Then("it should return false") {
                result shouldBe false
            }
        }
    }

    Given("a closed flight") {
        val flight = flightWith(LocalDateTime.now().plusHours(1), FlightStatus.CLOSED)

        When("canCheckin is called") {
            val result = policy.canCheckin(flight)

            Then("it should return false") {
                result shouldBe false
            }
        }
    }

    Given("a flight that has already departed (past departure time)") {
        val flight = flightWith(LocalDateTime.now().minusHours(1))

        When("canCheckin is called") {
            val result = policy.canCheckin(flight)

            Then("it should return false") {
                result shouldBe false
            }
        }
    }
})
