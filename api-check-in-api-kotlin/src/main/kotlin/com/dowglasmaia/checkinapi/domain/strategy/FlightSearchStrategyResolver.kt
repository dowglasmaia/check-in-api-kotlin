package com.dowglasmaia.checkinapi.domain.strategy

import com.dowglasmaia.checkinapi.domain.model.SearchType

/**
 * Resolves the correct [FlightSearchStrategy] for a given [SearchType] at runtime.
 *
 * <p>The resolver encapsulates the mapping between a search type enum value and its
 * corresponding strategy implementation. This keeps the use case layer free of
 * conditional {@code when} / {@code if-else} dispatch logic, satisfying the
 * Open/Closed Principle.</p>
 *
 * <p>Strategies are injected via constructor; the resolver itself holds no mutable
 * state and is safe to share across virtual threads.</p>
 *
 * @param strategies a map of [SearchType] to [FlightSearchStrategy] implementations.
 *   All supported [SearchType] values must have a corresponding entry.
 */
class FlightSearchStrategyResolver(
    private val strategies: Map<SearchType, FlightSearchStrategy>
) {

    /**
     * Returns the [FlightSearchStrategy] registered for [searchType].
     *
     * @param searchType the type of search to perform.
     * @return the corresponding strategy; never null.
     * @throws IllegalArgumentException if no strategy is registered for [searchType].
     */
    fun resolve(searchType: SearchType): FlightSearchStrategy =
        strategies[searchType]
            ?: throw IllegalArgumentException("No strategy registered for search type: $searchType")
}
