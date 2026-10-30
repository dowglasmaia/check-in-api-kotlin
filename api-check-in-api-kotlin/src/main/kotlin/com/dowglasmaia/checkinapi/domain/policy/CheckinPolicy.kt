package com.dowglasmaia.checkinapi.domain.policy

import com.dowglasmaia.checkinapi.domain.model.Flight
import java.time.LocalDateTime

interface CheckinPolicy {

    fun canCheckin(flight: Flight): Boolean

    fun checkinOpensAt(flight: Flight): LocalDateTime
}
