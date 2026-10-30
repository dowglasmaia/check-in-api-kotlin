# app-check-in-api-angular

MaiaFlight check-in web app. Angular 21 (standalone components, signals, Signal Forms, zoneless), Tailwind CSS v4 with the Nocturne design tokens, ApexCharts, Vitest.

The visual reference is the prototype in [`docs/MaiaFlight check-in prototype`](../docs/MaiaFlight%20check-in%20prototype). The API it talks to lives in [`api-check-in-api-kotlin`](../api-check-in-api-kotlin).

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Dev server on http://localhost:4200, proxying `/checkins`, `/demo` and `/actuator` to the API (`proxy.conf.js`). `API_URL=http://localhost:18080 npm start` points it to another API. |
| `npm test` | Unit tests (Vitest), single run. `npm run test:watch` to watch. |
| `npm run build` | Production build into `dist/app-check-in-api-angular`. |
| `npm run format` / `format:check` | Prettier. |

## Structure

```
src/app/
  core/       configuration (runtime /config.json) and the HTTP error model + interceptors
  shared/ui/  design-system primitives used by more than one feature
  layouts/    app shell: header, stepper, footer
  features/
    check-in/   the passenger journey (search → flights → confirm → boarding pass)
    test-data/  fictitious scenarios served by the API, for testing the flow
```

Each feature has its routes file and a `doc.md` describing its responsibility, rules and dependencies.

## Configuration

The app calls the API on the same origin (dev-server proxy locally, nginx in the container), so the API needs no CORS setup. `/config.json` can override `apiBaseUrl` at runtime; in Docker set `API_BASE_URL` and `API_UPSTREAM`.

## Privacy

Nothing is written to `localStorage`/`sessionStorage`. A typed document is sent to the API and kept only as a masked label in memory.
