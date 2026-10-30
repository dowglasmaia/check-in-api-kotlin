# CLAUDE.md — MaiaFlight Check-in (full stack)

Context for AI assistants working in this repository. Keep it short and true; update it when the project changes.

## What this is

A portfolio-grade online check-in for a fictitious airline, as a monorepo:

| Folder | What | Stack |
|---|---|---|
| `api-check-in-api-kotlin/` | REST API | Kotlin 2.2, Spring Boot 4, Spring MVC on virtual threads, Maven, OpenAPI contract-first, Kotest + MockK + MockMvc |
| `app-check-in-api-angular/` | Web app | Angular 21 (standalone, signals, Signal Forms, zoneless), Tailwind CSS 4, ApexCharts, Vitest, Prettier |
| `docs/` | Audit report, front-end integration guide (both in Portuguese), demo GIF, visual prototype + Nocturne design system | – |
| `docker-compose.yml` | API + app (nginx reverse proxy), one command | – |

Everything the app shows comes from the API. All data (names, documents, codes) is **fictitious**; never add real personal data anywhere.

## Commands

```bash
# Everything
docker compose up --build                      # app on http://localhost:4200, API not published

# API (from api-check-in-api-kotlin/)
./mvnw -B verify                               # generate OpenAPI interfaces, compile, run all tests
./mvnw spring-boot:run                         # http://localhost:8080
SERVER_PORT=18080 java -jar target/check-in-api-0.0.1-SNAPSHOT.jar

# App (from app-check-in-api-angular/)
npm ci
npm start                                      # http://localhost:4200, proxies to the API (API_URL=http://localhost:18080 npm start)
npm test                                       # Vitest, single run (npm run test:watch to watch)
npm run build                                  # production build
npm run format:check                           # Prettier (npm run format to fix)
npm audit --omit=dev --audit-level=high
```

A change is **not done** until the relevant build, tests and `format:check` pass and, for UI, the flow was exercised in a real browser. Say what was not run.

## How the pieces talk

- The browser only talks to its own origin. nginx (container) and the dev-server proxy (`proxy.conf.js`) forward `/checkins`, `/demo` and `/actuator/health` to the API, so **no CORS** is needed (the API has an opt-in `CORS_ALLOWED_ORIGINS`).
- The app reads `/config.json` at startup (`apiBaseUrl`, empty = same origin).
- **The API is the authority for business rules.** The app must not re-implement them (72-hour window, eligibility…): it renders `checkinAvailable`, `checkinOpensAt`, `status` and error `code`s.
- Errors are classified by the stable `code` in `{ status, error, message, code }`, **never by message text**.

## API conventions (`api-check-in-api-kotlin/`)

- **Contract first.** Edit `src/main/resources/openapi/check-in-api.yaml`, then `./mvnw verify`; controllers implement the generated interfaces (package `com.dowglasmaia.openapi`). Prefer **additive** contract changes.
- Layers: `api` → `application` (use cases, ports) → `domain` ← `infrastructure`. No Spring annotations in `domain`/`application`; wiring is in `config/ApplicationConfig`. Patterns: Strategy (search), Policy (check-in window), ports and adapters.
- Time: inject a `Clock` (UTC); never call `now()` without one. All `LocalDateTime` values in the service are UTC. Keep the window comparison exact (`Duration`), not truncated hours.
- Domain failures are exceptions with a stable `code` (`DomainExceptions.kt`) mapped in `GlobalExceptionHandler`; unexpected errors never leak internals.
- Persistence is **in memory on purpose** (`InMemory*Repository`, seeded by `DemoSeed`). `saveIfAbsent` must stay atomic. Do not add a database without being asked.
- Demo support: `GET /demo/test-data`, `POST /demo/reset`, both disabled by `APP_DEMO_ENABLED=false`. The seed is offsets from the current hour so it never expires; keep scenarios generated from the same seed.
- Logging: structured ECS JSON with `requestId`; **no personal data in logs** (documents are never logged, e-mails are masked).
- Tests: Kotest `FunSpec`/`BehaviorSpec` + MockK for units (`clearMocks` in `beforeTest`, fixed `Clock`), MockMvc for HTTP. The Spring context is shared, so each integration test uses its own flight/passenger pair.
- Style: comment only the non-obvious *why*; no KDoc that restates a name or signature.

## App conventions (`app-check-in-api-angular/`)

- Code, comments, test names, routes and UI copy are in **English**.
- Standalone components, `ChangeDetectionStrategy.OnPush`, `inject()`, signals, `input()`/`output()`. Forms use **Signal Forms** (`@angular/forms/signals`), not Reactive Forms.
- Structure follows the module guide: each `features/<module>/` has `<module>.routes.ts` and `doc.md`, and only the folders it needs (`pages/`, `ui/`, `data-access/`, `model/`).
  - `pages/` compose the journey and navigate; `ui/` components take typed inputs, emit intents and **never call HTTP**.
  - `shared/` only holds what is already used by more than one module; `core/` holds config and the HTTP error model/interceptors.
  - A module never imports another module's internals, only its `public-api.ts`.
  - Journey state lives in the module's signal store (`CheckInFlowStore`), not a global store.
- Styling: Tailwind v4 with the Nocturne tokens in `src/styles.css` (`@theme`). There is **no** `tailwind.config.js`. Icons are Phosphor (`<i mfIcon="...">`), the font is self-hosted Inter. Dark theme only.
- Privacy: nothing in `localStorage`/`sessionStorage`; a typed document is sent to the API and kept only as a masked label. No personal data in `console.*`.
- Charts (ApexCharts) are lazy (`@defer`) and only drawn from real flow data (`checkinOpensAt`, `departureTime`, `boardingTime`). Do not invent operational metrics. Chart options are pure functions in `chart-options.ts`.
- nginx serves a strict CSP (`default-src 'self'`): no inline event handlers or external CDNs. CI fails if the production `index.html` contains `onload=` (keep `inlineCritical` off).
- Tests: Vitest (`vi`), zoneless "act → `await fixture.whenStable()` → assert". Use `testScenariosStub()` and `httpTestProviders()` from `features/check-in/testing/fixtures.ts`; that folder is excluded from the production build (`tsconfig.app.json`).

## Changing the contract: checklist

1. OpenAPI yaml (additive when possible) → `./mvnw verify`.
2. Backend tests for the new behaviour, including its error `code`.
3. App DTOs (`checkin.dto.ts`), mappers, store and tests.
4. `docs/frontend-integration-guide.md` and `docs/api-audit-report.md`; the module `doc.md` and the READMEs if behaviour changed.

## Things that bite

- **Windows + Git Bash.** Long heredocs sometimes fail with "unexpected EOF"; write files with the editor tools or a script file instead. Use `C:/jdk-…/bin/java` if `java` is not on the Git Bash `PATH`.
- **Ports.** `8080` may be taken by another project on the dev machine: run the API with `SERVER_PORT=18080` and the app with `API_URL=http://localhost:18080`. Port `4200` is also what `docker compose` publishes, so stop the containers (`docker compose down`) before `npm start`, or use `--port 4300`. Only stop processes and containers that belong to this project.
- **Repackage fails** (`Unable to rename …jar`) when a server started from `target/` is still running; stop it first.
- **Repeating the demo flow** returns `409 CHECKIN_ALREADY_DONE` because check-ins are in memory: use *Reset test data* in the app or `POST /demo/reset`.
- Hot reload can drop the in-memory journey and send you back to `/search`; that is expected.
- Initial bundle budget warns at 560 kB (about 116 kB transferred); check `npm run build` output when adding dependencies.

## Working agreements

- Analyse before changing; reproduce a reported bug before fixing it; prefer small, reversible changes and keep contracts compatible.
- Do not commit, push, open PRs or deploy unless asked. No destructive operations without confirmation.
- Never print or store secrets or personal data. Report outcomes faithfully: what passed, what failed, what was not run.
