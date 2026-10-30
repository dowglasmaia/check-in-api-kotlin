package com.dowglasmaia.checkinapi.infrastructure.seed

import com.dowglasmaia.checkinapi.domain.model.Flight
import com.dowglasmaia.checkinapi.domain.model.FlightStatus
import com.dowglasmaia.checkinapi.domain.model.Passenger
import com.dowglasmaia.checkinapi.domain.model.SearchType
import java.time.Clock
import java.time.Duration
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit

data class DemoScenario(
    val label: String,
    val searchType: SearchType,
    val value: String,
    val expectedOutcome: String,
    val note: String? = null,
    val expectedFlights: Int
)

/**
 * Fictitious flights, passengers and test scenarios kept together so that they cannot drift apart.
 * Departures are offsets from the current hour, so the data never expires while the service runs.
 */
class DemoSeed(private val clock: Clock) {

    val passengers: List<Passenger> = listOf(
        Passenger("P-001", "João Silva", "123.456.789-00", "joao.silva@example.com"),
        Passenger("P-002", "Maria Santos", "987.654.321-00", "maria.santos@example.com"),
        Passenger("P-003", "Carlos Oliveira", "111.222.333-44", "carlos.oliveira@example.com"),
        Passenger("P-004", "Ana Costa", "123.456.789-09", "ana.costa@example.com"),
        Passenger("P-005", "Bruno Lima", "222.333.444-55", "bruno.lima@example.com"),
        Passenger("P-006", "Carla Souza", "333.444.555-66", "carla.souza@example.com"),
        Passenger("P-007", "Diego Alves", "444.555.666-77", "diego.alves@example.com")
    )

    fun flights(): List<Flight> {
        val base = LocalDateTime.now(clock).truncatedTo(ChronoUnit.HOURS)
        fun departsIn(offset: Duration) = base.plus(offset)

        return listOf(
            Flight("FL-001", "MF100", "ABC123", "GRU", "JFK", departsIn(hours(24)), FlightStatus.SCHEDULED, listOf("P-001", "P-002")),
            Flight("FL-002", "MF200", "XYZ789", "CGH", "LHR", departsIn(hours(48)), FlightStatus.SCHEDULED, listOf("P-001")),
            Flight("FL-003", "MF300", "DEF456", "GIG", "MIA", departsIn(hours(100)), FlightStatus.SCHEDULED, listOf("P-003")),
            Flight("FL-004", "MF214", "MAIA7K", "GRU", "LIS", departsIn(hours(27, 40)), FlightStatus.SCHEDULED, listOf("P-004", "P-005")),
            Flight("FL-005", "MF215", "MAIA7K", "LIS", "GRU", departsIn(hours(196, 15)), FlightStatus.SCHEDULED, listOf("P-004")),
            Flight("FL-006", "MF3010", "MAIA7K", "GRU", "SSA", departsIn(hours(20, 5)), FlightStatus.CANCELLED, listOf("P-004")),
            Flight("FL-007", "MF880", "MAIA2X", "GIG", "MAD", departsIn(hours(50, 30)), FlightStatus.SCHEDULED, listOf("P-006"))
        )
    }

    /** Passengers booked on each flight, in the order they appear in the flight. */
    fun passengersByFlight(): Map<Flight, List<Passenger>> {
        val byId = passengers.associateBy { it.id }
        return flights().associateWith { flight -> flight.passengerIds.mapNotNull(byId::get) }
    }

    fun scenarios(): List<DemoScenario> = listOf(
        DemoScenario(
            "Flight with check-in open", SearchType.FLIGHT_NUMBER, "MF214",
            "1 flight, check-in available", "Passenger code P-004 or P-005 completes the check-in.", 1
        ),
        DemoScenario(
            "Booking with three flights", SearchType.BOOKING_CODE, "MAIA7K",
            "3 flights: available, not open yet, cancelled", "Passenger code P-004.", 3
        ),
        DemoScenario(
            "Document identifies the passenger", SearchType.DOCUMENT, "123.456.789-09",
            "3 flights and the passenger is identified automatically", "No passenger code needed.", 3
        ),
        DemoScenario(
            "Second booking", SearchType.BOOKING_CODE, "MAIA2X",
            "1 flight, check-in available", "Passenger code P-006.", 1
        ),
        DemoScenario(
            "Check-in not open yet", SearchType.FLIGHT_NUMBER, "MF215",
            "1 flight, check-in not available yet", "Opens 72 hours before departure.", 1
        ),
        DemoScenario(
            "Cancelled flight", SearchType.FLIGHT_NUMBER, "MF3010",
            "1 flight, cancelled", null, 1
        ),
        DemoScenario(
            "Passenger without flights", SearchType.DOCUMENT, "444.555.666-77",
            "No flights found", null, 0
        ),
        DemoScenario(
            "Unknown flight number", SearchType.FLIGHT_NUMBER, "MF999",
            "No flights found", null, 0
        ),
        DemoScenario(
            "Two flights, one passenger", SearchType.DOCUMENT, "123.456.789-00",
            "2 flights, passenger identified automatically", "Check in twice to see the 'already checked in' screen.", 2
        )
    )

    private fun hours(hours: Long, minutes: Long = 0): Duration = Duration.ofHours(hours).plusMinutes(minutes)
}
