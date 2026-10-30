# ✈️ MaiaFlight — Check-in API

Digital passenger check-in backend for MaiaFlight, part of the [MaiaFlight Check-in monorepo](../README.md) (the Angular app lives in [`app-check-in-api-angular`](../app-check-in-api-angular)).  
**Stack:** Kotlin 2.2 · Spring Boot 4 · Spring MVC · Virtual Threads (Project Loom) · OpenAPI contract-first  
**Architecture:** Clean Architecture · Use Case pattern · Strategy pattern · SOLID

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Layer Responsibilities](#layer-responsibilities)
- [Endpoints](#endpoints)
- [Design Decisions](#design-decisions)
- [Applied Patterns](#applied-patterns)
- [Thread Safety & Concurrency](#thread-safety--concurrency)
- [Observability](#observability)
- [Virtual Threads](#virtual-threads-project-loom)
- [Testing](#testing)
- [Running Locally](#running-locally)
- [Sequence Diagrams (UML)](#sequence-diagrams-uml)

---

## Overview

Passengers check in from **72 hours** before departure until departure, locating their booking through one of three strategies:

| Search type | Example value |
|---|---|
| Flight number | `MF100` |
| Booking code (locator) | `ABC123` |
| Personal document (CPF) | `123.456.789-00` |

After a successful check-in, a domain event is published so downstream services can send the boarding confirmation e-mail.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                           api/                                  │
│  CheckinController     implements CheckinsApi (OpenAPI)        │
│  GlobalExceptionHandler  translates exceptions → HTTP status   │
└───────────────────────────────┬────────────────────────────────┘
                                │ input objects
┌───────────────────────────────▼────────────────────────────────┐
│                       application/                              │
│  SearchFlightsUseCase   (interface)                            │
│  PerformCheckinUseCase  (interface)                            │
│  impl/  SearchFlightsUseCaseImpl                               │
│  impl/  PerformCheckinUseCaseImpl                              │
│  input/ SearchFlightsInput · PerformCheckinInput               │
│  port/  FlightRepository · PassengerRepository                 │
│         CheckinRepository · EventPublisher  (interfaces)       │
└───────────────────────────────┬────────────────────────────────┘
                                │ domain objects
┌───────────────────────────────▼────────────────────────────────┐
│                         domain/                                 │
│  model/    Flight · Passenger · Checkin · FlightStatus         │
│  policy/   CheckinPolicy ◄── HoursBeforeDeparturePolicy        │
│  strategy/ FlightSearchStrategy ◄── FlightNumberSearchStrategy │
│                                ◄── BookingCodeSearchStrategy   │
│                                ◄── DocumentSearchStrategy      │
│            FlightSearchStrategyResolver                        │
│  event/    CheckinCompletedEvent                               │
└───────────────────────────────┬────────────────────────────────┘
                                │ implements ports
┌───────────────────────────────▼────────────────────────────────┐
│                     infrastructure/                             │
│  InMemoryFlightRepository   InMemoryPassengerRepository        │
│  InMemoryCheckinRepository  LoggingEventPublisher              │
└────────────────────────────────────────────────────────────────┘
                                │ wires everything
┌───────────────────────────────▼────────────────────────────────┐
│                       config/                                   │
│  ApplicationConfig   @Bean declarations (no Spring in domain)  │
└────────────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### `api/` — HTTP Adapter

| Class | Responsibility |
|---|---|
| `CheckinController` | Accept requests, map to input objects, delegate to use cases, map results to response models. Contains **no business logic**. |
| `DemoDataController` | Serves the fictitious demo scenarios and the demo reset; disabled with `app.demo.enabled=false`. |
| `GlobalExceptionHandler` | Translate domain and framework exceptions into one error body `{ status, error, message, code }`, never leaking internals. |
| `DomainExceptions` | Typed hierarchy, each with a stable `code`: `FlightNotFoundException`, `PassengerNotFoundException`, `PassengerNotOnFlightException`, `CheckinNotAllowedException`, `CheckinAlreadyExistsException`. |
| `RequestIdFilter` | Correlates each request: reads or generates `X-Request-Id`, puts it in the log context and echoes it. |

### `application/` — Use Case Orchestration

| Class | Responsibility |
|---|---|
| `SearchFlightsUseCase` | Interface declaring the flight-search contract. |
| `PerformCheckinUseCase` | Interface declaring the check-in contract. |
| `SearchFlightsUseCaseImpl` | Validates input → resolves strategy → searches → drops departed flights → flags each one with the policy (`checkinAvailable`, `checkinOpensAt`). |
| `PerformCheckinUseCaseImpl` | Loads resources → checks the passenger is on the flight → applies policy → atomic save → publishes the event (best effort). |
| `SearchFlightsInput` / `PerformCheckinInput` | Immutable value objects carrying use case input data. |
| `port/*` | Output port interfaces (repositories, event publisher) — the domain never imports infrastructure. |

### `domain/` — Business Rules

| Class | Responsibility |
|---|---|
| `Flight`, `Passenger`, `Checkin` | Immutable domain entities modelled as `data class`. |
| `FlightStatus`, `SearchType` | Type-safe enums preventing stringly-typed bugs. |
| `CheckinPolicy` | Interface: is check-in open for a flight right now, and when does it open? |
| `HoursBeforeDeparturePolicy` | Implements the 72-hour window (compared exactly, not in truncated hours) and the status guard, on an injected `Clock`. |
| `FlightSearchStrategy` | Interface: find flights by a given search criterion. |
| `FlightNumberSearchStrategy` | Finds flights by exact flight number. |
| `BookingCodeSearchStrategy` | Finds flights by booking code (PNR locator). |
| `DocumentSearchStrategy` | Finds flights by passenger CPF/passport via `PassengerRepository` and also returns the passenger. |
| `FlightSearchStrategyResolver` | Resolves the correct strategy from `SearchType` at runtime. |
| `CheckinCompletedEvent` | Immutable domain event carrying email and flight ID for downstream consumers. |

### `infrastructure/` — Adapters (Implements Ports)

| Class | Responsibility |
|---|---|
| `InMemoryFlightRepository` | Read-only in-memory flight store fed by `DemoSeed` (departure times are offsets from the current hour). |
| `InMemoryPassengerRepository` | Read-only in-memory passenger store fed by `DemoSeed`. |
| `DemoSeed` | Fictitious flights, passengers and the test scenarios, kept together so they cannot drift apart. |
| `InMemoryCheckinRepository` | `ConcurrentHashMap`-backed store; `saveIfAbsent` is atomic (see [Thread Safety](#thread-safety--concurrency)). |
| `LoggingEventPublisher` | Publishes events to SLF4J logs. Replace with `KafkaEventPublisher` for production. |

---

## Endpoints

Full contract: [`src/main/resources/openapi/check-in-api.yaml`](src/main/resources/openapi/check-in-api.yaml)

### `POST /checkins/flights/search`

Finds the flights that **have not departed yet** for a flight number, booking code or document. Every flight says whether check-in is available, so flights whose check-in is not open yet, cancelled or closed are listed too.

**Request body**
```json
{ "searchType": "FLIGHT_NUMBER", "value": "MF214" }
```

`searchType`: `FLIGHT_NUMBER` | `BOOKING_CODE` | `DOCUMENT`. `value` is 1–64 characters, trimmed; flight number and booking code ignore case.

**Response `200 OK`**
```json
{
  "flights": [
    {
      "flightId": "FL-004",
      "flightNumber": "MF214",
      "origin": "GRU",
      "destination": "LIS",
      "departureTime": "2026-10-31T12:40:00Z",
      "status": "SCHEDULED",
      "checkinAvailable": true,
      "checkinOpensAt": "2026-10-28T12:40:00Z"
    }
  ],
  "passengerId": "P-004"
}
```

`passengerId` is present only for `DOCUMENT` searches, where the search identifies the passenger. An empty `flights` list is a `200`, never a `404`.

---

### `POST /checkins`

Performs a passenger check-in.

**Request body**
```json
{ "flightId": "FL-004", "passengerId": "P-004" }
```

**Response `201 Created`**
```json
{
  "checkinId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "CONFIRMED",
  "boardingGate": "A1",
  "boardingTime": "2026-10-31T12:10:00Z"
}
```

Checks run in this order: flight exists → passenger exists → passenger is booked on the flight → check-in window and flight status → no previous check-in.

**Error responses** — every error has the body `{ status, error, message, code }`; clients should branch on `code`, never on `message`.

| HTTP status | `code` | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` / `MALFORMED_REQUEST` | Missing or blank fields, unknown `searchType`, malformed JSON |
| `404` | `FLIGHT_NOT_FOUND` | Unknown flight |
| `404` | `PASSENGER_NOT_FOUND` | Unknown passenger |
| `404` | `PASSENGER_NOT_ON_FLIGHT` | Passenger exists but is not booked on that flight |
| `409` | `CHECKIN_NOT_ALLOWED` | Outside the 72-hour window, or flight cancelled/boarded/closed |
| `409` | `CHECKIN_ALREADY_DONE` | Duplicate check-in |
| `500` | `INTERNAL_ERROR` | Unexpected error (no internals are leaked) |

---

### Demo endpoints

Both answer `404` when the API runs with `APP_DEMO_ENABLED=false`.

| Endpoint | Purpose |
|---|---|
| `GET /demo/test-data` | Fictitious scenarios generated from the seed data, plus the passengers of each flight |
| `POST /demo/reset` (`204`) | Forgets every check-in so the demo flow can be repeated |

---

## Design Decisions

### Why `POST` and not `GET` for the flight search?

A `GET /checkins/flights/search?type=DOCUMENT&value=123.456.789-00` would violate OWASP:

1. **Sensitive data in URLs**: personal document numbers (CPF, passport) appear in server access logs, browser history, and proxy caches in plain text — even over HTTPS.
2. **Structured payload**: the `searchType` + `value` pair is an object with semantics. A JSON body models it more clearly than query parameters, and future optional filters (e.g., date range) are added without breaking the API contract.
3. **Consistency**: both endpoints mutate or query state based on a structured request — `POST` keeps the API semantically uniform.

> Reference: [OWASP — Sensitive Data in Query Strings](https://owasp.org/www-community/vulnerabilities/Information_exposure_through_query_strings_in_url)

---

### Immutability with `data class` and `val`

All domain entities are declared as `data class` with only `val` fields:

```kotlin
data class Flight(
    val id: String,
    val flightNumber: String,
    val departureTime: LocalDateTime,
    val status: FlightStatus,
    val passengerIds: List<String>
)
```

**Why it matters:**
- **Thread safety**: immutable objects can be safely shared across concurrent virtual threads without locks or synchronisation.
- **Predictability**: `HoursBeforeDeparturePolicy.canCheckin(flight)` can never mutate the `flight` it receives — it is a pure function.
- **Safe equality**: `data class` generates `equals`/`hashCode` from all fields, making domain objects safe to use in collections and Kotest matchers.
- **Controlled updates**: any modification produces a new object via `copy()`, making state changes explicit and traceable.

---

### Use Case pattern vs. Command pattern

The previous implementation used a generic `CommandHandler<C, R>` interface. This was replaced with specific use case interfaces for the following reasons:

| Concern | Command pattern | Use Case pattern |
|---|---|---|
| Readability | `handler.handle(SearchFlightsCommand(...))` — generic, requires knowing types | `useCase.execute(SearchFlightsInput(...))` — self-documenting |
| Discoverability | `CommandHandler<C, R>` with type erasure — IDE autocomplete less helpful | `SearchFlightsUseCase.execute(...)` — types are explicit |
| Complexity | Extra level of indirection (Command object + CommandHandler interface + impl) | Input object + interface + impl — one less layer |
| DIP compliance | Both honour DIP equally | Both honour DIP equally |

The use case pattern maintains the same architectural guarantees (DIP, SRP, OCP) with less indirection.

---

### Trade-offs: In-Memory vs Database

| Aspect | In-Memory (current) | Database (production) |
|---|---|---|
| Setup | Zero infrastructure | PostgreSQL + Flyway migrations |
| Persistence | Lost on restart | Durable |
| Concurrency | `ConcurrentHashMap.putIfAbsent` (CAS) | DB transaction + unique constraint |
| Integration tests | Instantaneous | Requires Testcontainers |
| Swap effort | Change one `@Bean` in `ApplicationConfig` | Change one `@Bean` in `ApplicationConfig` |

The port interfaces (`FlightRepository`, `PassengerRepository`, `CheckinRepository`) are the boundary. Swapping `InMemoryFlightRepository` for a JPA implementation requires changing **only** `ApplicationConfig` — no domain or use case code changes.

---

### Trade-off: Event publication without Outbox

The `PerformCheckinUseCaseImpl` publishes `CheckinCompletedEvent` **after** the repository save:

```
saveIfAbsent(checkin) → true → publish(CheckinCompletedEvent)
```

**Risk**: if `publish` throws after a successful save, the check-in record exists but the confirmation e-mail is never sent. The use case catches and logs the failure instead of returning a 500, because a client retry would only receive a misleading `409`.

**Mitigation for production**: implement the [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html) — persist the event in the same database transaction as the check-in, then use a relay (Debezium, polling) to publish it to the broker. The `EventPublisher` interface makes this change transparent to the use case.

---

### Boarding time rule

Boarding time is set to `departureTime - 30 minutes`. This is a hardcoded business rule and it can fall in the past when the check-in is made less than 30 minutes before departure.  
If it needs to vary per flight type or airline tier, extract it to a `BoardingTimePolicy` interface following the same pattern as `CheckinPolicy`.

---

## Applied Patterns

### Strategy — Flight Search

```
SearchFlightsUseCaseImpl
    → FlightSearchStrategyResolver.resolve(searchType)
        → FlightNumberSearchStrategy | BookingCodeSearchStrategy | DocumentSearchStrategy
```

Each strategy implements one algorithm for locating flights. Adding a new `SearchType` requires only a new strategy class and a new `Map` entry in `ApplicationConfig` — existing strategies and the use case are untouched (**Open/Closed Principle**).

### Policy — Check-in Eligibility

```kotlin
interface CheckinPolicy {
    fun canCheckin(flight: Flight): Boolean
    fun checkinOpensAt(flight: Flight): LocalDateTime
}
```

`HoursBeforeDeparturePolicy` implements the 72-hour window and flight status checks, and tells when the window opens (`checkinOpensAt`). Changing the rule (e.g., to 48 hours) or adding a new rule (e.g., VIP passengers can check in 96 hours early) requires a new implementation — the use case never changes (**Open/Closed Principle**).

### Use Case — Orchestration

Each use case interface exposes a single `execute` method and is responsible for exactly one business operation. The controller and infrastructure code depend on interfaces, not on implementations (**Dependency Inversion Principle**).

---

## Thread Safety & Concurrency

### The TOCTOU problem

A naive duplicate check implementation:
```kotlin
// UNSAFE — two threads can both pass this check
if (!checkinRepository.exists(flightId, passengerId)) {
    checkinRepository.save(checkin)  // both may reach this line
}
```

Two concurrent requests for the same passenger/flight pair would both read "no duplicate" and both proceed to save, creating two check-in records.

### The solution: atomic `saveIfAbsent`

`InMemoryCheckinRepository` uses `ConcurrentHashMap.putIfAbsent`, which is a single atomic CAS (compare-and-swap) operation:

```kotlin
val existing = checkinByFlightAndPassenger.putIfAbsent(compositeKey, checkin)
// null  → key was absent → record saved → return true
// value → key existed   → duplicate   → return false
```

Because the entire check-then-insert is a single hardware-level atomic operation, exactly one of two racing threads will receive `null` (success) and the other will receive the existing entry (duplicate). No locks, no synchronised blocks, no contention — the approach scales naturally under virtual threads.

In a database-backed implementation, the equivalent guarantee is provided by a `UNIQUE` constraint on `(flight_id, passenger_id)` combined with an `INSERT ... ON CONFLICT DO NOTHING` or a database transaction with a unique index violation caught as a `DataIntegrityViolationException`.

---

## Observability

### Structured logging

Spring Boot 4 ships native ECS (Elastic Common Schema) structured logging. Configured in `application.yaml`
(top-level `logging.structured.format.console`; override with env `LOG_FORMAT`, log level with `LOG_LEVEL`):

```yaml
logging.structured.format.console: ecs
```

Every request gets a `requestId` (the caller's `X-Request-Id` when it is a safe token, otherwise a UUID).
It is echoed in the `X-Request-Id` response header and emitted on every JSON log line.

All log statements follow the `action=<verb> field=value` pattern for easy filtering. Personal data is never
logged (search values, e-mail addresses are omitted or masked):

```
action=search_flights_start    searchType=FLIGHT_NUMBER  valueLength=5
action=search_flights_completed searchType=FLIGHT_NUMBER  found=1  checkinAvailable=1

action=perform_checkin_start   flightId=FL-001  passengerId=P-001
action=checkin_policy_rejected flightId=FL-006  status=CANCELLED
action=checkin_saved           checkinId=abc123  boardingGate=A1
action=checkin_event_published checkinId=abc123
```

Filter examples for Kibana / Loki:
- `action: "checkin_saved"` → all completed check-ins
- `action: "checkin_policy_rejected"` → eligibility failures (monitor for spikes)
- `action: "checkin_duplicate_rejected"` → concurrent duplicate attempts

### Actuator endpoints

Only the endpoints below are exposed (`env`, `loggers` and `mappings` were removed for security).

| Endpoint | Description |
|---|---|
| `GET /actuator/health` | Application health (plus `/health/liveness` and `/health/readiness`) |
| `GET /actuator/info` | Version and JVM metadata |
| `GET /actuator/metrics` | Micrometer metrics (JVM, threads, HTTP requests) |

**Add Prometheus scraping (future):**
```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```
Enables `GET /actuator/prometheus` — scrape-ready for Prometheus + Grafana dashboards.

---

## Virtual Threads (Project Loom)

```yaml
server:
  tomcat:
    threads:
      virtual:
        enabled: true
```

### Why virtual threads?

| | Platform threads | Virtual threads |
|---|---|---|
| Managed by | Operating system | JVM |
| Memory per thread | ~1 MB stack | ~1 KB heap |
| Practical limit | Thousands | Millions |
| Blocking I/O behaviour | OS thread blocked (idle) | Thread parked (unmounted), OS thread freed |

The check-in flow performs sequential blocking calls: repository lookup → policy evaluation → repository save → event publish. With virtual threads:

- Each request gets its own virtual thread.
- While waiting for I/O, the virtual thread is parked and the underlying carrier thread is released for other work.
- Far more concurrent requests can be served with the same hardware, without reactive programming or `async`/`await` refactoring.
- Code remains sequential and readable.

> **Spring Boot 4 guidance**: Virtual threads are the recommended approach for Spring MVC REST APIs on Java 21+ (this project targets Java 24). WebFlux/coroutines are preferred when the reactive model is required end-to-end (streaming, backpressure).

---

## Testing

Unit tests use **Kotest 5.9.1** (FunSpec / BehaviorSpec) and **MockK 1.13.12**; the HTTP contract is covered with **MockMvc** on a full Spring context. At the time of writing there are **72 tests**, all passing.

```
src/test/kotlin/
├── api/
│   ├── CheckinApiIntegrationTest          MockMvc  every endpoint, status and error code, request id, actuator
│   └── DemoDisabledIntegrationTest        MockMvc  demo endpoints answer 404 when disabled
├── application/usecase/
│   ├── SearchFlightsUseCaseTest           FunSpec  availability flags, departed flights dropped, passengerId
│   └── PerformCheckinUseCaseTest          FunSpec  every rule, event failure does not fail the check-in
├── domain/
│   ├── event/CheckinCompletedEventTest    FunSpec  e-mail is masked
│   ├── policy/HoursBeforeDeparturePolicyTest  BehaviorSpec  72h boundaries with a fixed clock
│   └── strategy/FlightSearchStrategyTest  FunSpec  the three search strategies
└── infrastructure/
    ├── repository/InMemoryCheckinRepositoryTest  FunSpec  32 concurrent saves: exactly one wins; deleteAll
    └── seed/DemoSeedTest                  FunSpec  scenarios match the data; departures never expire
```

**Test isolation:** unit specs use `beforeTest { clearMocks(...) }` to reset MockK expectations; time-dependent specs inject a fixed `Clock`. The integration tests share one Spring context, so each check-in test uses its own flight/passenger pair.

```bash
# Run everything (generates the OpenAPI interfaces first)
./mvnw -B verify

# Run a specific class
./mvnw test -Dtest=HoursBeforeDeparturePolicyTest
```

---

## Running Locally

**Prerequisites:** JDK 24+ (the build runs on newer JDKs too)

```bash
# Generate OpenAPI code + compile + run tests
./mvnw clean verify

# Start the application
./mvnw spring-boot:run
```

The API is available at `http://localhost:8080`.

### Example requests

```bash
# Search by flight number
curl -X POST http://localhost:8080/checkins/flights/search \
  -H "Content-Type: application/json" \
  -d '{"searchType": "FLIGHT_NUMBER", "value": "MF100"}'

# Search by document (CPF)
curl -X POST http://localhost:8080/checkins/flights/search \
  -H "Content-Type: application/json" \
  -d '{"searchType": "DOCUMENT", "value": "123.456.789-00"}'

# Perform check-in
curl -X POST http://localhost:8080/checkins \
  -H "Content-Type: application/json" \
  -d '{"flightId": "FL-001", "passengerId": "P-001"}'

# Health check
curl http://localhost:8080/actuator/health
```

**Fictitious sample data** (flight times are offsets from the current hour, so they never expire while the API runs):

| Flight | Number | Booking | Route | Departs | Passengers | Check-in |
|---|---|---|---|---|---|---|
| FL-001 | MF100 | ABC123 | GRU→JFK | +24h | P-001, P-002 | open |
| FL-002 | MF200 | XYZ789 | CGH→LHR | +48h | P-001 | open |
| FL-003 | MF300 | DEF456 | GIG→MIA | +100h | P-003 | not open yet |
| FL-004 | MF214 | MAIA7K | GRU→LIS | +27h40 | P-004, P-005 | open |
| FL-005 | MF215 | MAIA7K | LIS→GRU | +196h15 | P-004 | not open yet |
| FL-006 | MF3010 | MAIA7K | GRU→SSA | +20h05 | P-004 | cancelled |
| FL-007 | MF880 | MAIA2X | GIG→MAD | +50h30 | P-006 | open |

The passengers' documents are listed in the [integration guide](../docs/frontend-integration-guide.md#9-dados-de-teste-fictícios) (for example `P-004` → `123.456.789-09`). Check-ins are kept in memory: use `POST /demo/reset` or restart the API to repeat a check-in.

---

## Sequence Diagrams (UML)

### `POST /checkins/flights/search`
![search.png](src/main/resources/img/search.png)

---

### `POST /checkins`
![perform.png](src/main/resources/img/perform.png)

---

## Project Structure

```
src/main/kotlin/com/dowglasmaia/checkinapi/
├── api/
│   ├── controller/    CheckinController · DemoDataController
│   ├── exception/     DomainExceptions (each with a stable code) · GlobalExceptionHandler
│   └── filter/        RequestIdFilter (X-Request-Id → MDC)
├── application/
│   ├── port/          FlightRepository · PassengerRepository
│   │                  CheckinRepository · EventPublisher
│   └── usecase/
│       ├── input/     SearchFlightsInput · PerformCheckinInput
│       ├── output/    SearchFlightsOutput · SearchedFlight
│       ├── impl/      SearchFlightsUseCaseImpl · PerformCheckinUseCaseImpl
│       SearchFlightsUseCase · PerformCheckinUseCase  (interfaces)
├── config/            ApplicationConfig (Clock, beans) · CorsConfig
├── domain/
│   ├── event/         CheckinCompletedEvent
│   ├── model/         Flight · Passenger · Checkin · FlightStatus · SearchType · FlightSearchResult
│   ├── policy/        CheckinPolicy · HoursBeforeDeparturePolicy
│   └── strategy/      FlightSearchStrategy · FlightSearchStrategyResolver
│                      FlightNumberSearchStrategy · BookingCodeSearchStrategy
│                      DocumentSearchStrategy
└── infrastructure/
    ├── messaging/     LoggingEventPublisher
    ├── repository/    InMemoryFlightRepository · InMemoryPassengerRepository
    │                  InMemoryCheckinRepository
    └── seed/          DemoSeed (fictitious flights, passengers and test scenarios)
```
