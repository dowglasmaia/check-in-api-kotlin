package com.dowglasmaia.checkinapi.application.usecase

import com.dowglasmaia.checkinapi.application.usecase.input.PerformCheckinInput
import com.dowglasmaia.checkinapi.domain.model.Checkin

interface PerformCheckinUseCase {

    /**
     * @throws com.dowglasmaia.checkinapi.api.exception.FlightNotFoundException
     * @throws com.dowglasmaia.checkinapi.api.exception.PassengerNotFoundException
     * @throws com.dowglasmaia.checkinapi.api.exception.PassengerNotOnFlightException
     * @throws com.dowglasmaia.checkinapi.api.exception.CheckinNotAllowedException outside the window or flight not scheduled.
     * @throws com.dowglasmaia.checkinapi.api.exception.CheckinAlreadyExistsException
     */
    fun execute(input: PerformCheckinInput): Checkin
}
