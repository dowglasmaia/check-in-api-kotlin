package com.dowglasmaia.checkinapi.application.port

interface EventPublisher {
    fun publish(event: Any)
}
