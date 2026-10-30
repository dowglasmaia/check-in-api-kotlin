package com.dowglasmaia.checkinapi.config

import com.dowglasmaia.checkinapi.application.port.CheckinRepository
import com.dowglasmaia.checkinapi.application.port.EventPublisher
import com.dowglasmaia.checkinapi.application.port.FlightRepository
import com.dowglasmaia.checkinapi.application.port.PassengerRepository
import com.dowglasmaia.checkinapi.application.usecase.PerformCheckinUseCase
import com.dowglasmaia.checkinapi.application.usecase.SearchFlightsUseCase
import com.dowglasmaia.checkinapi.application.usecase.impl.PerformCheckinUseCaseImpl
import com.dowglasmaia.checkinapi.application.usecase.impl.SearchFlightsUseCaseImpl
import com.dowglasmaia.checkinapi.domain.model.SearchType
import com.dowglasmaia.checkinapi.domain.policy.CheckinPolicy
import com.dowglasmaia.checkinapi.domain.policy.HoursBeforeDeparturePolicy
import com.dowglasmaia.checkinapi.domain.strategy.BookingCodeSearchStrategy
import com.dowglasmaia.checkinapi.domain.strategy.DocumentSearchStrategy
import com.dowglasmaia.checkinapi.domain.strategy.FlightNumberSearchStrategy
import com.dowglasmaia.checkinapi.domain.strategy.FlightSearchStrategy
import com.dowglasmaia.checkinapi.domain.strategy.FlightSearchStrategyResolver
import com.dowglasmaia.checkinapi.infrastructure.messaging.LoggingEventPublisher
import com.dowglasmaia.checkinapi.infrastructure.repository.InMemoryCheckinRepository
import com.dowglasmaia.checkinapi.infrastructure.repository.InMemoryFlightRepository
import com.dowglasmaia.checkinapi.infrastructure.repository.InMemoryPassengerRepository
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * Spring configuration class that wires all application beans.
 *
 * <p>Centralising bean creation here keeps framework annotations ([Bean], [Configuration])
 * out of domain and application classes. Domain objects remain plain Kotlin — testable
 * without a Spring context.</p>
 *
 * <p>To swap an infrastructure implementation (e.g., replace [InMemoryFlightRepository]
 * with a JPA-backed one), only this file needs to change. No domain or use case
 * class is touched — honouring the Open/Closed Principle at the wiring level.</p>
 */
@Configuration
class ApplicationConfig {

    // ── Infrastructure ──────────────────────────────────────────────────────

    /** In-memory flight store pre-loaded with sample data for local development. */
    @Bean
    fun flightRepository(): FlightRepository = InMemoryFlightRepository()

    /** In-memory passenger store pre-loaded with sample data for local development. */
    @Bean
    fun passengerRepository(): PassengerRepository = InMemoryPassengerRepository()

    /**
     * In-memory check-in store using [java.util.concurrent.ConcurrentHashMap].
     * [saveIfAbsent] is atomic — safe for concurrent virtual-thread requests.
     */
    @Bean
    fun checkinRepository(): CheckinRepository = InMemoryCheckinRepository()

    /** Logs domain events via SLF4J. Replace with a Kafka publisher for production. */
    @Bean
    fun eventPublisher(): EventPublisher = LoggingEventPublisher()

    // ── Domain ──────────────────────────────────────────────────────────────

    /**
     * Check-in eligibility policy: allows check-in up to 72 hours before departure.
     * The window is configurable via the [HoursBeforeDeparturePolicy] constructor.
     */
    @Bean
    fun checkinPolicy(): CheckinPolicy = HoursBeforeDeparturePolicy()

    /**
     * Strategy resolver that selects the correct flight-search strategy at runtime.
     *
     * <p>Each [SearchType] is mapped to its corresponding [FlightSearchStrategy].
     * Adding a new search type requires only a new strategy implementation and a
     * new entry in this map — no existing class is modified (Open/Closed Principle).</p>
     */
    @Bean
    fun flightSearchStrategyResolver(
        flightRepository: FlightRepository,
        passengerRepository: PassengerRepository
    ): FlightSearchStrategyResolver {
        val strategies: Map<SearchType, FlightSearchStrategy> = mapOf(
            SearchType.FLIGHT_NUMBER to FlightNumberSearchStrategy(flightRepository),
            SearchType.BOOKING_CODE to BookingCodeSearchStrategy(flightRepository),
            SearchType.DOCUMENT to DocumentSearchStrategy(flightRepository, passengerRepository)
        )
        return FlightSearchStrategyResolver(strategies)
    }

    // ── Use Cases ───────────────────────────────────────────────────────────

    /**
     * Use case bean exposed as [SearchFlightsUseCase] (interface).
     * The controller depends on the interface, not the concrete implementation.
     */
    @Bean
    fun searchFlightsUseCase(
        strategyResolver: FlightSearchStrategyResolver,
        checkinPolicy: CheckinPolicy
    ): SearchFlightsUseCase = SearchFlightsUseCaseImpl(strategyResolver, checkinPolicy)

    /**
     * Use case bean exposed as [PerformCheckinUseCase] (interface).
     * The controller depends on the interface, not the concrete implementation.
     */
    @Bean
    fun performCheckinUseCase(
        flightRepository: FlightRepository,
        passengerRepository: PassengerRepository,
        checkinRepository: CheckinRepository,
        checkinPolicy: CheckinPolicy,
        eventPublisher: EventPublisher
    ): PerformCheckinUseCase = PerformCheckinUseCaseImpl(
        flightRepository, passengerRepository, checkinRepository, checkinPolicy, eventPublisher
    )
}
