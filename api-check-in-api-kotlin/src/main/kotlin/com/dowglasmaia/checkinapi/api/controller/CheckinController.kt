package com.dowglasmaia.checkinapi.api.controller

import com.dowglasmaia.checkinapi.application.usecase.PerformCheckinUseCase
import com.dowglasmaia.checkinapi.application.usecase.SearchFlightsUseCase
import com.dowglasmaia.checkinapi.application.usecase.input.PerformCheckinInput
import com.dowglasmaia.checkinapi.application.usecase.input.SearchFlightsInput
import com.dowglasmaia.checkinapi.application.usecase.output.SearchedFlight
import com.dowglasmaia.checkinapi.domain.model.SearchType
import com.dowglasmaia.openapi.api.CheckinsApi
import com.dowglasmaia.openapi.model.CheckinResponse
import com.dowglasmaia.openapi.model.FlightSummary
import com.dowglasmaia.openapi.model.PerformCheckinRequest
import com.dowglasmaia.openapi.model.SearchFlightsRequest
import com.dowglasmaia.openapi.model.SearchFlightsResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.time.ZoneOffset
import com.dowglasmaia.openapi.model.FlightStatus as FlightStatusDto

@RestController
class CheckinController(
    private val searchFlightsUseCase: SearchFlightsUseCase,
    private val performCheckinUseCase: PerformCheckinUseCase
) : CheckinsApi {

    override fun searchFlights(searchFlightsRequest: SearchFlightsRequest): ResponseEntity<SearchFlightsResponse> {
        val output = searchFlightsUseCase.execute(
            SearchFlightsInput(
                searchType = SearchType.valueOf(searchFlightsRequest.searchType.value),
                value = searchFlightsRequest.value
            )
        )

        val response = SearchFlightsResponse().apply {
            flights = output.flights.map(::toSummary)
            passengerId = output.passengerId
        }
        return ResponseEntity.ok(response)
    }

    override fun performCheckin(performCheckinRequest: PerformCheckinRequest): ResponseEntity<CheckinResponse> {
        val checkin = performCheckinUseCase.execute(
            PerformCheckinInput(performCheckinRequest.flightId, performCheckinRequest.passengerId)
        )

        val response = CheckinResponse().apply {
            checkinId = checkin.id
            status = "CONFIRMED"
            boardingGate = checkin.boardingGate
            boardingTime = checkin.boardingTime.atOffset(ZoneOffset.UTC)
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    private fun toSummary(searched: SearchedFlight) = FlightSummary().apply {
        val flight = searched.flight
        flightId = flight.id
        flightNumber = flight.flightNumber
        origin = flight.origin
        destination = flight.destination
        departureTime = flight.departureTime.atOffset(ZoneOffset.UTC)
        status = FlightStatusDto.fromValue(flight.status.name)
        checkinAvailable = searched.checkinAvailable
        checkinOpensAt = searched.checkinOpensAt.atOffset(ZoneOffset.UTC)
    }
}
