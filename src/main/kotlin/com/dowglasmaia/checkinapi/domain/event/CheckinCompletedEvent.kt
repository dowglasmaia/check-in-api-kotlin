package com.dowglasmaia.checkinapi.domain.event

data class CheckinCompletedEvent(
    val passengerEmail: String,
    val flightId: String,
    val checkinId: String
)
