# check-in

The passenger journey: find a reservation, choose a flight, confirm the check-in and get the boarding pass.

## Routes (`check-in.routes.ts`, lazy-loaded)

| Path | Page | Step | Guard |
|---|---|---|---|
| `/search` | `SearchPage` | – | – |
| `/flights` | `ResultsPage` | 2 · Choose | a search has started |
| `/flights/:flightId` | `DetailsPage` | 3 · Confirm | that flight was selected |
| `/confirmation` | `ConfirmationPage` | 4 · Boarding pass | a check-in was confirmed |
| `/error` | `ErrorPage` | – | there is an error to show |

Reloading a deep link sends the user back to `/search`: the journey lives in memory only.

## Structure

- `pages/`: compose the journey and navigate. They never call HTTP directly.
- `ui/`: presentational components (typed inputs, outputs for intent, no HTTP). `ui/charts/` holds the ApexCharts wrappers; their options are pure functions in `chart-options.ts`.
- `data-access/`: `CheckinApi` (typed `HttpClient`), mappers (DTO → view model) and `CheckInFlowStore`, the signal store for one journey.
- `model/`: view models, per-search-type rules, flow errors and their copy, IATA → city reference data.

## State

`CheckInFlowStore` is the single source of truth for the journey. It holds the flights, the selected flight, the passenger identified by the search, the boarding pass, and the error to display. Nothing is persisted: no `localStorage`/`sessionStorage`, and a typed document is never stored, only a masked label (`•••.456.789-••`).

## Rules and the API

The API is the authority. The app only decides which screen to show:

- Search validation (formats per search type) is a convenience; the API still validates.
- A flight with `checkinAvailable: false` never reaches the check-in call: the user gets an explanation screen (not open yet, cancelled, closed).
- Check-in errors are classified by the API's stable `code` (`CHECKIN_ALREADY_DONE`, `CHECKIN_NOT_ALLOWED`, `PASSENGER_NOT_ON_FLIGHT`, …), never by message text.
- If the search was by document, the API returns `passengerId` and confirmation needs no extra input; otherwise the user types the passenger code. When the API serves demo data, the confirm panel lists the fictitious passengers of the flight (`GET /demo/test-data`, `flights[].passengers`) as chips and pre-fills the first one, so the whole flow can be completed without knowing the seed.
- Check-ins confirmed in this session are remembered (`CheckInFlowStore`, memory only), mirroring the API, which also keeps them in memory. A later search lists those flights as "Checked in" and "View status" shows the existing boarding pass, so the user is never offered a confirmation that is certain to fail. `reset()` (a new search) keeps them; `forgetCheckins()` drops them and runs when the demo data is reset.
- Double submissions are blocked by the store (`searchStatus === 'loading'`, `confirming`).

## Charts (only where there is real data)

| Chart | Screen | Data |
|---|---|---|
| Check-in windows (range bar) | results | `checkinOpensAt` → `departureTime` per flight, "now" marker |
| Window progress (radial bar) | details | share of that window already elapsed; a live `d HH:MM:SS` countdown to departure ticks every second in the centre, while the ring is redrawn only once a minute |
| Your timeline (range bar) | confirmation | check-in time, `boardingTime`, `departureTime` |

Operational statistics (traffic, status distribution…) are intentionally absent: the API exposes no such data and this is a passenger-facing flow. Charts load lazily with `@defer` and respect `prefers-reduced-motion`.

## Dependencies

`core/` (config, HTTP error model), `shared/ui` (button, tag, card, alert, icon, skeleton) and the public API of `test-data` (scenario chips and the prefill contract). Nothing else imports from this module.
