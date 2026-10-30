package com.dowglasmaia.checkinapi.application.usecase.output

import com.dowglasmaia.checkinapi.domain.model.Flight
import java.time.LocalDateTime

data class SearchedFlight(
    val flight: Flight,
    val checkinAvailable: Boolean,
    val checkinOpensAt: LocalDateTime
)

data class SearchFlightsOutput(
    val flights: List<SearchedFlight>,
    val passengerId: String? = null
)
