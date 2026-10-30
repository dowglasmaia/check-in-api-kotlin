package com.dowglasmaia.checkinapi.api

import org.hamcrest.Matchers.containsString
import org.hamcrest.Matchers.hasItems
import org.hamcrest.Matchers.hasSize
import org.hamcrest.Matchers.not
import org.hamcrest.Matchers.startsWith
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * HTTP contract tests against the seed data in [com.dowglasmaia.checkinapi.infrastructure.seed.DemoSeed].
 * The Spring context (and its in-memory check-in store) is shared, so each check-in test uses its own flight/passenger pair.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CheckinApiIntegrationTest(@Autowired private val mockMvc: MockMvc) {

    private val searchUrl = "/checkins/flights/search"

    private fun postJson(url: String, body: String) =
        post(url).contentType(MediaType.APPLICATION_JSON).content(body)

    private fun search(type: String, value: String) =
        mockMvc.perform(postJson(searchUrl, """{"searchType":"$type","value":"$value"}"""))

    @Test
    fun `search by flight number is case insensitive and returns availability data`() {
        search("FLIGHT_NUMBER", "mf100")
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.flights", hasSize<Any>(1)))
            .andExpect(jsonPath("$.flights[0].flightId").value("FL-001"))
            .andExpect(jsonPath("$.flights[0].status").value("SCHEDULED"))
            .andExpect(jsonPath("$.flights[0].checkinAvailable").value(true))
            .andExpect(jsonPath("$.flights[0].checkinOpensAt").isNotEmpty)
            .andExpect(jsonPath("$.passengerId").doesNotExist())
    }

    @Test
    fun `search by booking code lists flights whose check-in is not available too`() {
        search("BOOKING_CODE", "MAIA7K")
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.flights", hasSize<Any>(3)))
            .andExpect(jsonPath("$.flights[?(@.flightNumber=='MF214')].checkinAvailable").value(true))
            .andExpect(jsonPath("$.flights[?(@.flightNumber=='MF215')].checkinAvailable").value(false))
            .andExpect(jsonPath("$.flights[?(@.flightNumber=='MF3010')].checkinAvailable").value(false))
            .andExpect(jsonPath("$.flights[?(@.flightNumber=='MF3010')].status").value("CANCELLED"))
    }

    @Test
    fun `search by document identifies the passenger`() {
        search("DOCUMENT", "123.456.789-09")
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.passengerId").value("P-004"))
            .andExpect(jsonPath("$.flights", hasSize<Any>(3)))
    }

    @Test
    fun `search by document of a passenger without flights returns the passenger and an empty list`() {
        search("DOCUMENT", "444.555.666-77")
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.passengerId").value("P-007"))
            .andExpect(jsonPath("$.flights", hasSize<Any>(0)))
    }

    @Test
    fun `search for an unknown flight returns an empty list`() {
        search("FLIGHT_NUMBER", "MF999")
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.flights", hasSize<Any>(0)))
    }

    @Test
    fun `search with blank value returns 400 with a validation code`() {
        search("FLIGHT_NUMBER", "   ")
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.error").value("Bad Request"))
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
    }

    @Test
    fun `search with missing value returns 400 instead of 500`() {
        mockMvc.perform(postJson(searchUrl, """{"searchType":"FLIGHT_NUMBER"}"""))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.message", containsString("value")))
    }

    @Test
    fun `search with unknown searchType returns 400`() {
        search("PHONE", "1")
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"))
    }

    @Test
    fun `malformed JSON returns 400 with the standard error body`() {
        mockMvc.perform(postJson(searchUrl, "{not json"))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.error").value("Bad Request"))
    }

    @Test
    fun `check-in succeeds with 201 and boarding details`() {
        mockMvc.perform(postJson("/checkins", """{"flightId":"FL-002","passengerId":"P-001"}"""))
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.checkinId").isNotEmpty)
            .andExpect(jsonPath("$.status").value("CONFIRMED"))
            .andExpect(jsonPath("$.boardingGate").isNotEmpty)
            .andExpect(jsonPath("$.boardingTime").isNotEmpty)
    }

    @Test
    fun `second check-in for the same passenger and flight returns 409 CHECKIN_ALREADY_DONE`() {
        val body = """{"flightId":"FL-001","passengerId":"P-002"}"""
        mockMvc.perform(postJson("/checkins", body)).andExpect(status().isCreated)

        mockMvc.perform(postJson("/checkins", body))
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.code").value("CHECKIN_ALREADY_DONE"))
    }

    @Test
    fun `check-in for an unknown flight returns 404 FLIGHT_NOT_FOUND`() {
        mockMvc.perform(postJson("/checkins", """{"flightId":"FL-999","passengerId":"P-001"}"""))
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.message").value("Flight not found: FL-999"))
            .andExpect(jsonPath("$.code").value("FLIGHT_NOT_FOUND"))
    }

    @Test
    fun `check-in for an unknown passenger returns 404 PASSENGER_NOT_FOUND`() {
        mockMvc.perform(postJson("/checkins", """{"flightId":"FL-001","passengerId":"P-999"}"""))
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.code").value("PASSENGER_NOT_FOUND"))
    }

    @Test
    fun `check-in for a passenger who is not on the flight returns 404 PASSENGER_NOT_ON_FLIGHT`() {
        mockMvc.perform(postJson("/checkins", """{"flightId":"FL-001","passengerId":"P-003"}"""))
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.code").value("PASSENGER_NOT_ON_FLIGHT"))
    }

    @Test
    fun `check-in before the window opens returns 409 CHECKIN_NOT_ALLOWED`() {
        mockMvc.perform(postJson("/checkins", """{"flightId":"FL-003","passengerId":"P-003"}"""))
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.code").value("CHECKIN_NOT_ALLOWED"))
    }

    @Test
    fun `check-in on a cancelled flight returns 409 CHECKIN_NOT_ALLOWED`() {
        mockMvc.perform(postJson("/checkins", """{"flightId":"FL-006","passengerId":"P-004"}"""))
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.code").value("CHECKIN_NOT_ALLOWED"))
    }

    @Test
    fun `check-in with blank or missing ids returns 400`() {
        mockMvc.perform(postJson("/checkins", """{"flightId":"","passengerId":"P-001"}"""))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.message", containsString("flightId")))
        mockMvc.perform(postJson("/checkins", """{"flightId":"FL-001"}"""))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.message", containsString("passengerId")))
    }

    @Test
    fun `demo reset lets the same passenger check in again`() {
        val body = """{"flightId":"FL-007","passengerId":"P-006"}"""
        mockMvc.perform(postJson("/checkins", body)).andExpect(status().isCreated)
        mockMvc.perform(postJson("/checkins", body)).andExpect(status().isConflict)

        mockMvc.perform(post("/demo/reset")).andExpect(status().isNoContent)

        mockMvc.perform(postJson("/checkins", body)).andExpect(status().isCreated)
    }

    @Test
    fun `demo endpoint lists scenarios with the fictitious-data notice`() {
        mockMvc.perform(get("/demo/test-data"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.notice").value("Fictitious data for flow testing only"))
            .andExpect(jsonPath("$.scenarios[0].searchType").isNotEmpty)
            .andExpect(jsonPath("$.scenarios[?(@.value=='MAIA7K')]").exists())
            .andExpect(jsonPath("$.flights[?(@.flightId=='FL-004')].passengers[*].passengerId").value(hasItems("P-004", "P-005")))
    }

    @Test
    fun `unsupported method keeps 405 and uses the standard error body`() {
        mockMvc.perform(get("/checkins"))
            .andExpect(status().isMethodNotAllowed)
            .andExpect(jsonPath("$.status").value(405))
            .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"))
    }

    @Test
    fun `X-Request-Id is generated when absent and echoed when valid`() {
        val body = """{"searchType":"FLIGHT_NUMBER","value":"MF100"}"""
        mockMvc.perform(postJson(searchUrl, body)).andExpect(header().exists("X-Request-Id"))
        mockMvc.perform(postJson(searchUrl, body).header("X-Request-Id", "front-123"))
            .andExpect(header().string("X-Request-Id", "front-123"))
    }

    @Test
    fun `unsafe X-Request-Id is replaced`() {
        val body = """{"searchType":"FLIGHT_NUMBER","value":"MF100"}"""
        mockMvc.perform(postJson(searchUrl, body).header("X-Request-Id", "bad id with spaces"))
            .andExpect(header().string("X-Request-Id", not(startsWith("bad"))))
    }

    @Test
    fun `sensitive actuator endpoints are not exposed`() {
        mockMvc.perform(get("/actuator/env")).andExpect(status().isNotFound)
        mockMvc.perform(get("/actuator/loggers")).andExpect(status().isNotFound)
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk)
    }
}
