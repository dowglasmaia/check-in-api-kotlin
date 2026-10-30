package com.dowglasmaia.checkinapi.domain.policy

import com.dowglasmaia.checkinapi.domain.model.Flight
import com.dowglasmaia.checkinapi.domain.model.FlightStatus
import io.kotest.core.spec.style.BehaviorSpec
import io.kotest.matchers.shouldBe
import java.time.Clock
import java.time.LocalDateTime
import java.time.ZoneOffset

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
        val flight = flightWith(LocalDateTime.now(ZoneOffset.UTC).plusHours(24))

        When("canCheckin is called") {
            val result = policy.canCheckin(flight)

            Then("it should return true") {
                result shouldBe true
            }
        }
    }

    Given("a scheduled flight at the boundary of 72 hours") {
        val flight = flightWith(LocalDateTime.now(ZoneOffset.UTC).plusHours(72))

        When("canCheckin is called") {
            val result = policy.canCheckin(flight)

            Then("it should return true") {
                result shouldBe true
            }
        }
    }

    Given("a cancelled flight within the 72-hour window") {
        val flight = flightWith(LocalDateTime.now(ZoneOffset.UTC).plusHours(24), FlightStatus.CANCELLED)

        When("canCheckin is called") {
            val result = policy.canCheckin(flight)

            Then("it should return false") {
                result shouldBe false
            }
        }
    }

    Given("a boarded flight") {
        val flight = flightWith(LocalDateTime.now(ZoneOffset.UTC).plusHours(1), FlightStatus.BOARDED)

        When("canCheckin is called") {
            val result = policy.canCheckin(flight)

            Then("it should return false") {
                result shouldBe false
            }
        }
    }

    Given("a closed flight") {
        val flight = flightWith(LocalDateTime.now(ZoneOffset.UTC).plusHours(1), FlightStatus.CLOSED)

        When("canCheckin is called") {
            val result = policy.canCheckin(flight)

            Then("it should return false") {
                result shouldBe false
            }
        }
    }

    Given("a flight that has already departed (past departure time)") {
        val flight = flightWith(LocalDateTime.now(ZoneOffset.UTC).minusHours(1))

        When("canCheckin is called") {
            val result = policy.canCheckin(flight)

            Then("it should return false") {
                result shouldBe false
            }
        }
    }

    // Fixed clock -> deterministic boundary checks (no flakiness from LocalDateTime.now()).
    val now = LocalDateTime.of(2026, 1, 10, 12, 0)
    val fixedPolicy = HoursBeforeDeparturePolicy(
        maxHoursBeforeDeparture = 72,
        clock = Clock.fixed(now.toInstant(ZoneOffset.UTC), ZoneOffset.UTC)
    )

    Given("a flight that departed 30 minutes ago") {
        Then("it is not eligible (regression: hour truncation used to round -0.5h up to 0h)") {
            fixedPolicy.canCheckin(flightWith(now.minusMinutes(30))) shouldBe false
        }
    }

    Given("a flight departing exactly now") {
        Then("it is eligible") {
            fixedPolicy.canCheckin(flightWith(now)) shouldBe true
        }
    }

    Given("a flight departing in exactly 72 hours") {
        Then("it is eligible") {
            fixedPolicy.canCheckin(flightWith(now.plusHours(72))) shouldBe true
        }
    }

    Given("a flight departing in 72 hours and 30 minutes") {
        Then("it is not eligible (regression: hour truncation used to accept it)") {
            fixedPolicy.canCheckin(flightWith(now.plusHours(72).plusMinutes(30))) shouldBe false
        }
    }

    Given("a flight departing at a known time") {
        Then("check-in opens exactly 72 hours before departure") {
            fixedPolicy.checkinOpensAt(flightWith(now.plusHours(100))) shouldBe now.plusHours(28)
        }
    }
})
