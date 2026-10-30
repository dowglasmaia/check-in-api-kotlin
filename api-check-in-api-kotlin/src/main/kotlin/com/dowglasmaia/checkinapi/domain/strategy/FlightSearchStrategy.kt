package com.dowglasmaia.checkinapi.domain.strategy

import com.dowglasmaia.checkinapi.domain.model.Flight

/**
 * Strategy interface for locating flights based on a single search criterion.
 *
 * <p>Each concrete strategy encapsulates one lookup algorithm (by flight number,
 * booking code, or passenger document). The caller does not need to know which
 * strategy it is using — it simply calls [search] with a raw string value.</p>
 *
 * <p>This design applies the Strategy pattern and the Open/Closed Principle:
 * adding a new search type (e.g., seat number) requires only a new implementation
 * class and a registration entry in [FlightSearchStrategyResolver]. No existing
 * strategy or use case is modified.</p>
 *
 * <p>Implementations must be stateless and thread-safe.</p>
 */
interface FlightSearchStrategy {

    /**
     * Searches for flights matching the given value.
     *
     * @param value the raw search term (e.g., flight number, booking code, or document number).
     * @return a list of matching [Flight] objects; never null, may be empty.
     */
    fun search(value: String): List<Flight>
}
