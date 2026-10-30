# test-data

Shows the fictitious scenarios published by the API (`GET /demo/test-data`) so the whole check-in flow can be exercised without knowing the seed data.

## Routes

| Path | Page | Notes |
|---|---|---|
| `/test-data` | `TestDataPage` | Lists scenarios. "Use this scenario" navigates to `/search` with the scenario in the router navigation state (never in the URL). |

## Public API (`public-api.ts`)

- `TestScenarios`: signals `available`, `scenarios`, `notice`, `loading`, and `passengersOf(flightId)` (fictitious passengers of a flight, used by the confirm panel). `available` is `false` when the backend runs with `app.demo.enabled=false` (404), so callers hide demo-only UI.
- `TestScenarios.resetData()` calls `POST /demo/reset` (the API forgets every check-in so the flow can be repeated) and increments `resetCount`, which the `check-in` module watches to drop its own memory of the session check-ins. Available from the Test data page and from the "already checked in" screen.
- `SCENARIO_PREFILL_STATE` / `ScenarioPrefill`: contract for handing a scenario to the search page.

## Dependencies

Only `core/config` and `shared/ui`. The `check-in` module depends on this module's public API; this module does not import `check-in`.

## Decisions

- Data is served by the backend, generated from the same seed as the flights, so scenarios cannot drift from reality.
- All values are fictitious and the page says so prominently; real personal data must never be typed into the app while testing.
