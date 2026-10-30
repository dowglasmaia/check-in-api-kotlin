package com.dowglasmaia.checkinapi.api.controller

import com.dowglasmaia.checkinapi.application.port.CheckinRepository
import com.dowglasmaia.checkinapi.infrastructure.seed.DemoSeed
import com.dowglasmaia.openapi.api.DemoApi
import com.dowglasmaia.openapi.model.SearchType
import com.dowglasmaia.openapi.model.TestDataResponse
import com.dowglasmaia.openapi.model.TestFlight
import com.dowglasmaia.openapi.model.TestPassenger
import com.dowglasmaia.openapi.model.TestScenario
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

/** Exposes the fictitious seed scenarios. Disabled with `app.demo.enabled=false` (route then answers 404). */
@RestController
@ConditionalOnProperty(name = ["app.demo.enabled"], havingValue = "true", matchIfMissing = true)
class DemoDataController(
    private val seed: DemoSeed,
    private val checkinRepository: CheckinRepository
) : DemoApi {

    override fun resetDemoData(): ResponseEntity<Void> {
        checkinRepository.deleteAll()
        return ResponseEntity.noContent().build()
    }


    override fun getTestData(): ResponseEntity<TestDataResponse> {
        val response = TestDataResponse().apply {
            notice = NOTICE
            scenarios = seed.scenarios().map { scenario ->
                TestScenario().apply {
                    label = scenario.label
                    searchType = SearchType.fromValue(scenario.searchType.name)
                    value = scenario.value
                    expectedOutcome = scenario.expectedOutcome
                    note = scenario.note
                }
            }
            flights = seed.passengersByFlight().map { (flight, passengers) ->
                TestFlight().apply {
                    flightId = flight.id
                    this.passengers = passengers.map { passenger ->
                        TestPassenger().apply {
                            passengerId = passenger.id
                            name = passenger.name
                        }
                    }
                }
            }
        }
        return ResponseEntity.ok(response)
    }

    private companion object {
        const val NOTICE = "Fictitious data for flow testing only"
    }
}
