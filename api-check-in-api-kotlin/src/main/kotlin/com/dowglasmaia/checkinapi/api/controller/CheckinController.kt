package com.dowglasmaia.checkinapi.api.controller

import com.dowglasmaia.checkinapi.application.usecase.PerformCheckinUseCase
import com.dowglasmaia.checkinapi.application.usecase.SearchFlightsUseCase
import com.dowglasmaia.checkinapi.application.usecase.input.PerformCheckinInput
import com.dowglasmaia.checkinapi.application.usecase.input.SearchFlightsInput
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

/**
 * REST controller that implements the OpenAPI-generated [CheckinsApi] interface.
 *
 * <p>Responsibilities of this class:</p>
 * <ul>
 *   <li>Accept HTTP requests and deserialise them into use case input objects.</li>
 *   <li>Delegate all business logic to the injected use cases.</li>
 *   <li>Map use case results back to OpenAPI response models.</li>
 *   <li>Return the correct HTTP status codes defined in the OpenAPI contract.</li>
 * </ul>
 *
 * <p>This class must contain <strong>no business rules</strong>. Any conditional logic
 * here signals a leaking concern that belongs in the domain or application layer.</p>
 *
 * <p>The controller depends on use case <em>interfaces</em> ([SearchFlightsUseCase],
 * [PerformCheckinUseCase]), not on concrete implementations. This honours the
 * Dependency Inversion Principle and makes the controller independently testable
 * with mock use cases.</p>
 *
 * @param searchFlightsUseCase use case for searching check-in-eligible flights.
 * @param performCheckinUseCase use case for performing a passenger check-in.
 */
@RestController
class CheckinController(
    private val searchFlightsUseCase: SearchFlightsUseCase,
    private val performCheckinUseCase: PerformCheckinUseCase
) : CheckinsApi {

    /**
     * Handles `POST /checkins/flights/search`.
     *
     * <p>Maps the incoming OpenAPI request model to a [SearchFlightsInput] and
     * delegates to [SearchFlightsUseCase]. The response only includes flights
     * that are within the check-in window — filtering is performed by the use case,
     * not here.</p>
     *
     * @param searchFlightsRequest the deserialized request body.
     * @return `200 OK` with a list of eligible flights; empty list if none found.
     */
    override fun searchFlights(
        searchFlightsRequest: SearchFlightsRequest
    ): ResponseEntity<SearchFlightsResponse> {
        val input = SearchFlightsInput(
            searchType = SearchType.valueOf(searchFlightsRequest.searchType.value),
            value = searchFlightsRequest.value
        )

        val flights = searchFlightsUseCase.execute(input)

        val response = SearchFlightsResponse().apply {
            this.flights = flights.map { flight ->
                FlightSummary().apply {
                    flightId = flight.id
                    flightNumber = flight.flightNumber
                    origin = flight.origin
                    destination = flight.destination
                    departureTime = flight.departureTime.atOffset(ZoneOffset.UTC)
                    checkinAvailable = true
                }
            }
        }

        return ResponseEntity.ok(response)
    }

    /**
     * Handles `POST /checkins`.
     *
     * <p>Maps the request body to a [PerformCheckinInput] and delegates to
     * [PerformCheckinUseCase]. Domain exceptions are translated to HTTP status
     * codes by [com.dowglasmaia.checkinapi.api.exception.GlobalExceptionHandler]
     * — no try/catch is needed here.</p>
     *
     * @param performCheckinRequest the deserialized request body.
     * @return `201 Created` with the confirmed check-in details.
     */
    override fun performCheckin(
        performCheckinRequest: PerformCheckinRequest
    ): ResponseEntity<CheckinResponse> {
        val input = PerformCheckinInput(
            flightId = performCheckinRequest.flightId,
            passengerId = performCheckinRequest.passengerId
        )

        val checkin = performCheckinUseCase.execute(input)

        val response = CheckinResponse().apply {
            checkinId = checkin.id
            status = "CONFIRMED"
            boardingGate = checkin.boardingGate
            boardingTime = checkin.boardingTime.atOffset(ZoneOffset.UTC)
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }
}
