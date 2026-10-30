package com.dowglasmaia.checkinapi.application.usecase.input

import com.dowglasmaia.checkinapi.domain.model.SearchType

data class SearchFlightsInput(
    val searchType: SearchType,
    val value: String
)
