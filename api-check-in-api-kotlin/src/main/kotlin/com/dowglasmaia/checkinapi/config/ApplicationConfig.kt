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
import com.dowglasmaia.checkinapi.domain.strategy.FlightSearchStrategyResolver
import com.dowglasmaia.checkinapi.infrastructure.messaging.LoggingEventPublisher
import com.dowglasmaia.checkinapi.infrastructure.repository.InMemoryCheckinRepository
import com.dowglasmaia.checkinapi.infrastructure.repository.InMemoryFlightRepository
import com.dowglasmaia.checkinapi.infrastructure.repository.InMemoryPassengerRepository
import com.dowglasmaia.checkinapi.infrastructure.seed.DemoSeed
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Clock

/** Wires domain and application classes so they stay free of Spring annotations. */
@Configuration
class ApplicationConfig {

    /** Single time source; every `LocalDateTime` in the service is UTC. */
    @Bean
    fun clock(): Clock = Clock.systemUTC()

    @Bean
    fun demoSeed(clock: Clock) = DemoSeed(clock)

    @Bean
    fun flightRepository(seed: DemoSeed): FlightRepository = InMemoryFlightRepository(seed)

    @Bean
    fun passengerRepository(seed: DemoSeed): PassengerRepository = InMemoryPassengerRepository(seed)

    @Bean
    fun checkinRepository(): CheckinRepository = InMemoryCheckinRepository()

    @Bean
    fun eventPublisher(): EventPublisher = LoggingEventPublisher()

    @Bean
    fun checkinPolicy(clock: Clock): CheckinPolicy = HoursBeforeDeparturePolicy(clock = clock)

    @Bean
    fun flightSearchStrategyResolver(
        flightRepository: FlightRepository,
        passengerRepository: PassengerRepository
    ) = FlightSearchStrategyResolver(
        mapOf(
            SearchType.FLIGHT_NUMBER to FlightNumberSearchStrategy(flightRepository),
            SearchType.BOOKING_CODE to BookingCodeSearchStrategy(flightRepository),
            SearchType.DOCUMENT to DocumentSearchStrategy(flightRepository, passengerRepository)
        )
    )

    @Bean
    fun searchFlightsUseCase(
        strategyResolver: FlightSearchStrategyResolver,
        checkinPolicy: CheckinPolicy,
        clock: Clock
    ): SearchFlightsUseCase = SearchFlightsUseCaseImpl(strategyResolver, checkinPolicy, clock)

    @Bean
    fun performCheckinUseCase(
        flightRepository: FlightRepository,
        passengerRepository: PassengerRepository,
        checkinRepository: CheckinRepository,
        checkinPolicy: CheckinPolicy,
        eventPublisher: EventPublisher,
        clock: Clock
    ): PerformCheckinUseCase = PerformCheckinUseCaseImpl(
        flightRepository, passengerRepository, checkinRepository, checkinPolicy, eventPublisher, clock
    )
}
