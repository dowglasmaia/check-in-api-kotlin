package com.dowglasmaia.checkinapi.domain.model

import java.time.LocalDateTime

data class Checkin(
    val id: String,
    val flightId: String,
    val passengerId: String,
    val timestamp: LocalDateTime,
    val boardingGate: String,
    val boardingTime: LocalDateTime
)
