package com.dowglasmaia.checkinapi.application.usecase.input

data class PerformCheckinInput(
    val flightId: String,
    val passengerId: String
)
