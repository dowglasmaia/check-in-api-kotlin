package com.dowglasmaia.checkinapi.domain.model

import java.time.LocalDateTime

data class Flight(
    val id: String,
    val flightNumber: String,
    val bookingCode: String,
    val origin: String,
    val destination: String,
    val departureTime: LocalDateTime,
    val status: FlightStatus,
    val passengerIds: List<String>
)
