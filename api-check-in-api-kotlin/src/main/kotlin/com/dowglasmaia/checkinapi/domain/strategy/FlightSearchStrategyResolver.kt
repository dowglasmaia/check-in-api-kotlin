package com.dowglasmaia.checkinapi.domain.strategy

import com.dowglasmaia.checkinapi.domain.model.SearchType

class FlightSearchStrategyResolver(
    private val strategies: Map<SearchType, FlightSearchStrategy>
) {

    fun resolve(searchType: SearchType): FlightSearchStrategy =
        strategies[searchType]
            ?: throw IllegalArgumentException("No strategy registered for search type: $searchType")
}
