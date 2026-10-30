package com.dowglasmaia.checkinapi.infrastructure.repository

import com.dowglasmaia.checkinapi.domain.model.Checkin
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.Executors

class InMemoryCheckinRepositoryTest : FunSpec({

    fun checkin(flightId: String = "FL-001", passengerId: String = "P-001") = Checkin(
        id = UUID.randomUUID().toString(),
        flightId = flightId,
        passengerId = passengerId,
        timestamp = LocalDateTime.now(ZoneOffset.UTC),
        boardingGate = "A1",
        boardingTime = LocalDateTime.now(ZoneOffset.UTC).plusHours(1)
    )

    test("saves the first check-in and rejects a duplicate for the same flight and passenger") {
        val repository = InMemoryCheckinRepository()

        repository.saveIfAbsent(checkin()) shouldBe true
        repository.saveIfAbsent(checkin()) shouldBe false
        repository.existsByFlightIdAndPassengerId("FL-001", "P-001") shouldBe true
    }

    test("deleteAll forgets every check-in so the same passenger can check in again") {
        val repository = InMemoryCheckinRepository()
        repository.saveIfAbsent(checkin()) shouldBe true

        repository.deleteAll()

        repository.existsByFlightIdAndPassengerId("FL-001", "P-001") shouldBe false
        repository.saveIfAbsent(checkin()) shouldBe true
    }

    test("allows the same passenger on a different flight") {
        val repository = InMemoryCheckinRepository()

        repository.saveIfAbsent(checkin(flightId = "FL-001")) shouldBe true
        repository.saveIfAbsent(checkin(flightId = "FL-002")) shouldBe true
    }

    test("exactly one of many concurrent saves for the same flight/passenger wins") {
        val repository = InMemoryCheckinRepository()
        val threads = 32
        val pool = Executors.newFixedThreadPool(threads)
        try {
            val tasks = List(threads) { Callable { repository.saveIfAbsent(checkin()) } }
            val results = pool.invokeAll(tasks).map { it.get() }

            results.count { it } shouldBe 1
        } finally {
            pool.shutdownNow()
        }
    }
})
