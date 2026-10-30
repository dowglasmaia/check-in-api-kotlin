package com.dowglasmaia.checkinapi.domain.model

data class FlightSearchResult(
    val flights: List<Flight>,
    val passengerId: String? = null
)
