package com.dowglasmaia.checkinapi.domain.strategy

import com.dowglasmaia.checkinapi.domain.model.FlightSearchResult

interface FlightSearchStrategy {

    fun search(value: String): FlightSearchResult
}
