package com.dowglasmaia.checkinapi.application.usecase

import com.dowglasmaia.checkinapi.application.usecase.input.SearchFlightsInput
import com.dowglasmaia.checkinapi.application.usecase.output.SearchFlightsOutput

interface SearchFlightsUseCase {

    /**
     * Returns the flights that have not departed yet, each flagged with whether check-in is open.
     * [SearchFlightsOutput.passengerId] is set only when the search identifies a passenger (DOCUMENT).
     *
     * @throws IllegalArgumentException if the search value is blank.
     */
    fun execute(input: SearchFlightsInput): SearchFlightsOutput
}
