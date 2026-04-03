package com.dowglasmaia.checkinapi.application.port

import com.dowglasmaia.checkinapi.domain.model.Passenger

interface PassengerRepository {
    fun findById(id: String): Passenger?
    fun findByDocument(document: String): Passenger?
}
