package com.dowglasmaia.checkinapi.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

/** CORS stays off unless `app.cors.allowed-origins` (env `CORS_ALLOWED_ORIGINS`) lists browser origins. */
@Configuration
class CorsConfig(
    @Value("\${app.cors.allowed-origins:}") private val allowedOrigins: List<String>
) : WebMvcConfigurer {

    override fun addCorsMappings(registry: CorsRegistry) {
        val origins = allowedOrigins.map { it.trim() }.filter { it.isNotEmpty() }
        if (origins.isEmpty()) return

        registry.addMapping("/checkins/**")
            .allowedOrigins(*origins.toTypedArray())
            .allowedMethods("POST", "OPTIONS")
            .allowedHeaders("Content-Type", "X-Request-Id")
            .exposedHeaders("X-Request-Id")
            .maxAge(3600)
    }
}
