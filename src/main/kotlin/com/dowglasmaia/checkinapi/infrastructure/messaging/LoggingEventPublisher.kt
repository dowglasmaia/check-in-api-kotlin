package com.dowglasmaia.checkinapi.infrastructure.messaging

import com.dowglasmaia.checkinapi.application.port.EventPublisher
import org.slf4j.LoggerFactory

class LoggingEventPublisher : EventPublisher {

    private val logger = LoggerFactory.getLogger(LoggingEventPublisher::class.java)

    override fun publish(event: Any) {
        logger.info("Event published: type={} payload={}", event::class.simpleName, event)
    }
}
