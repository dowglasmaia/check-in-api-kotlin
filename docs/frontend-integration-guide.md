# Guia de Integração Frontend — MaiaFlight Check-in API

Tudo aqui foi confirmado no código e em execução real da API (as respostas de exemplo são saídas reais). Especificação OpenAPI: [`api-check-in-api-kotlin/src/main/resources/openapi/check-in-api.yaml`](../api-check-in-api-kotlin/src/main/resources/openapi/check-in-api.yaml) (OpenAPI 3.0.3, versão 1.1.0; gera as interfaces e DTOs do backend). O app de referência é [`app-check-in-api-angular`](../app-check-in-api-angular).

> **Mudanças da versão 1.1.0 (aditivas, exceto a primeira)**
> 1. `POST /checkins/flights/search` passou a devolver **todos os voos ainda não partidos**, com `checkinAvailable` real; antes só devolvia os elegíveis (e o campo era sempre `true`).
> 2. Novos campos em `FlightSummary`: `status`, `checkinOpensAt`.
> 3. Novo campo `passengerId` na resposta da busca (apenas para `DOCUMENT`).
> 4. Novo campo `code` em todo erro.
> 5. Novos endpoints `GET /demo/test-data` e `POST /demo/reset` (dados fictícios; desligáveis).

## 1. Configuração e execução

| Item | Valor |
|---|---|
| Porta padrão | `8080` (`SERVER_PORT`) |
| Content-Type | `application/json` |
| Persistência | **Em memória**: reiniciar a API apaga os check-ins; os voos são recalculados a partir da hora atual (não expiram) |

```bash
./mvnw spring-boot:run        # API (JDK 24+), a partir de api-check-in-api-kotlin/
docker compose up --build     # API + app em http://localhost:4200 (a partir da raiz)
```

| Variável | Efeito |
|---|---|
| `CORS_ALLOWED_ORIGINS` | Origens de browser permitidas (vírgula). Vazio = CORS desligado. Não é necessário com o proxy do dev-server/nginx (mesma origem) |
| `APP_DEMO_ENABLED` | `false` remove `GET /demo/test-data` (responde 404). Padrão `true` |
| `LOG_FORMAT`, `LOG_LEVEL` | Formato (`ecs`) e nível dos logs |

Health: `GET /actuator/health`. Também `/actuator/info` e `/actuator/metrics`.

## 2. Autenticação

**Não há autenticação nem autorização.** Pendência de produto (§10).

## 3. Headers

| Header | Direção | Descrição |
|---|---|---|
| `Content-Type: application/json` | Requisição | Obrigatório nos `POST` |
| `X-Request-Id` | Requisição (opcional) | Reutilizado se casar com `^[A-Za-z0-9._-]{1,64}$`; senão a API gera um UUID |
| `X-Request-Id` | Resposta | Sempre presente. Mostre-o como "código de suporte" em erros |

## 4. Endpoints

### 4.1 `POST /checkins/flights/search`

Busca voos que **ainda não partiram**. Cada voo traz `checkinAvailable`; voos fechados, cancelados ou ainda não abertos **são listados**, mas não podem ser confirmados.

Request (`SearchFlightsRequest`):

| Campo | Tipo | Regras |
|---|---|---|
| `searchType` | enum | **Obrigatório**: `FLIGHT_NUMBER`, `BOOKING_CODE`, `DOCUMENT` |
| `value` | string | **Obrigatório**, 1–64 caracteres, não só espaços (a API faz `trim`) |

`FLIGHT_NUMBER` e `BOOKING_CODE` ignoram maiúsculas/minúsculas e **não** removem espaços internos (envie `MF214`, não `MF 214`). `DOCUMENT` compara **exatamente** (ex.: `123.456.789-09`).

Response `200` (`SearchFlightsResponse`):

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

| Campo | Tipo | |
|---|---|---|
| `flights[].flightId` | string | Use no check-in |
| `flights[].flightNumber`, `origin`, `destination` | string | IATA nos aeroportos; não há nome de cidade |
| `flights[].departureTime`, `checkinOpensAt` | date-time, **UTC** (`Z`) | `checkinOpensAt` = momento em que o check-in abre |
| `flights[].status` | enum `SCHEDULED`, `CANCELLED`, `BOARDED`, `CLOSED` | |
| `flights[].checkinAvailable` | boolean | **Autoridade da API**: `true` só se o voo está `SCHEDULED` e dentro da janela |
| `passengerId` | string, opcional | Só presente quando a busca identifica o passageiro (`DOCUMENT`); ausente nos demais tipos. Também vem preenchido quando o passageiro existe mas não tem voos (`flights: []`) |

Lista vazia = nenhum voo futuro encontrado (`200`, nunca `404`).

### 4.2 `POST /checkins`

Request (`PerformCheckinRequest`): `flightId` e `passengerId`, ambos **obrigatórios**, 1–64 caracteres.

Response `201`:

```json
{"boardingGate":"C1","boardingTime":"2026-10-31T12:10:00Z","checkinId":"3e4e7abf-40ac-4e61-a5d9-46b06250daf7","status":"CONFIRMED"}
```

`boardingTime` = partida − 30 min (UTC). `status` é sempre `CONFIRMED`. `checkinId` é um UUID.

Ordem de avaliação e resultado:

| Situação | HTTP | `code` |
|---|---|---|
| Sucesso | `201` | – |
| Campos ausentes/vazios, JSON inválido, `searchType` desconhecido | `400` | `VALIDATION_ERROR` / `MALFORMED_REQUEST` |
| Voo inexistente | `404` | `FLIGHT_NOT_FOUND` |
| Passageiro inexistente | `404` | `PASSENGER_NOT_FOUND` |
| Passageiro não consta no voo | `404` | `PASSENGER_NOT_ON_FLIGHT` |
| Voo cancelado/embarcado/fechado ou fora da janela | `409` | `CHECKIN_NOT_ALLOWED` |
| Check-in já realizado (inclusive concorrente) | `409` | `CHECKIN_ALREADY_DONE` |
| Erro inesperado | `500` | `INTERNAL_ERROR` |

Não é idempotente: repetir um check-in bem-sucedido devolve `409 CHECKIN_ALREADY_DONE`.

### 4.4 `POST /demo/reset`

Esquece **todos** os check-ins (`204`, sem corpo). Existe porque a API guarda os check-ins em memória e o mesmo passageiro não pode fazer check-in duas vezes no mesmo voo (`409 CHECKIN_ALREADY_DONE`); para repetir o fluxo de demonstração, chame o reset. `404` se `APP_DEMO_ENABLED=false`.

### 4.3 `GET /demo/test-data`

Cenários **fictícios** gerados dos mesmos dados dos voos. `404` se `APP_DEMO_ENABLED=false`.

```json
{
  "notice": "Fictitious data for flow testing only",
  "scenarios": [
    {"label": "Booking with three flights", "searchType": "BOOKING_CODE", "value": "MAIA7K",
     "expectedOutcome": "3 flights: available, not open yet, cancelled", "note": "Passenger code P-004."}
  ],
  "flights": [
    {"flightId": "FL-004", "passengers": [
      {"passengerId": "P-004", "name": "Ana Costa"},
      {"passengerId": "P-005", "name": "Bruno Lima"}]}
  ]
}
```

`flights` lista os passageiros fictícios de cada voo. Na busca por reserva ou número do voo o app usa essa lista para sugerir (e pré-preencher) o código do passageiro, de modo que o fluxo se completa sem conhecer os dados.

## 5. Enums

| Enum | Valores |
|---|---|
| `SearchType` | `FLIGHT_NUMBER`, `BOOKING_CODE`, `DOCUMENT` |
| `FlightStatus` | `SCHEDULED`, `CANCELLED`, `BOARDED`, `CLOSED` |

## 6. Formato de erro

Todo erro (inclusive os do framework: JSON malformado, método não suportado, rota inexistente) usa o mesmo corpo:

```json
{"status":404,"error":"Not Found","message":"Flight not found: FL-999","code":"FLIGHT_NOT_FOUND"}
```

| Campo | |
|---|---|
| `status` | Código HTTP |
| `error` | Descrição curta (inglês) |
| `message` | Texto em inglês para log/diagnóstico; **não** classifique erros por ele |
| `code` | Código estável. Domínio: `FLIGHT_NOT_FOUND`, `PASSENGER_NOT_FOUND`, `PASSENGER_NOT_ON_FLIGHT`, `CHECKIN_NOT_ALLOWED`, `CHECKIN_ALREADY_DONE`. Genéricos: `VALIDATION_ERROR`, `MALFORMED_REQUEST`, `INTERNAL_ERROR`, ou o nome do status HTTP (`METHOD_NOT_ALLOWED`, `NOT_FOUND`…) |

Exemplos reais:

```json
{"status":400,"error":"Bad Request","message":"flightId: size must be between 1 and 64; passengerId: must not be null","code":"VALIDATION_ERROR"}
{"status":409,"error":"Conflict","message":"Passenger P-004 already checked in for flight FL-004","code":"CHECKIN_ALREADY_DONE"}
{"status":404,"error":"Not Found","message":"Passenger P-003 is not booked on flight FL-001","code":"PASSENGER_NOT_ON_FLIGHT"}
```

## 7. Paginação, filtros e ordenação

Não existem.

## 8. Fluxo de negócio e sequência de chamadas

```
1. POST /checkins/flights/search { searchType, value }
     ├─ 200, flights vazio        → "nenhum voo"
     └─ 200, flights[]            → listar todos; checkinAvailable decide se pode continuar
2. (voo com checkinAvailable=false → explicar: ainda não abre em checkinOpensAt / cancelado / fechado; NÃO chamar a API)
3. passengerId = resposta.passengerId ?? código digitado pelo usuário
4. POST /checkins { flightId, passengerId }
     ├─ 201 → mostrar boardingGate e boardingTime
     ├─ 409 CHECKIN_ALREADY_DONE   → "já realizado"
     ├─ 409 CHECKIN_NOT_ALLOWED    → indisponível (use o `status` do voo para diferenciar cancelado de fora da janela)
     ├─ 404 *                      → voo/passageiro inválido
     └─ 400 / 5xx / rede           → corrigir dados / tentar de novo
```

## 9. Dados de teste (fictícios)

Voos e códigos são recalculados a partir da hora cheia atual (os horários são `agora + offset`).

| Voo | Número | Reserva | Rota | Partida | Passageiros | Estado |
|---|---|---|---|---|---|---|
| `FL-001` | `MF100` | `ABC123` | GRU→JFK | +24h | `P-001`, `P-002` | aberto |
| `FL-002` | `MF200` | `XYZ789` | CGH→LHR | +48h | `P-001` | aberto |
| `FL-003` | `MF300` | `DEF456` | GIG→MIA | +100h | `P-003` | ainda não abre |
| `FL-004` | `MF214` | `MAIA7K` | GRU→LIS | +27h40 | `P-004`, `P-005` | aberto |
| `FL-005` | `MF215` | `MAIA7K` | LIS→GRU | +196h15 | `P-004` | ainda não abre |
| `FL-006` | `MF3010` | `MAIA7K` | GRU→SSA | +20h05 | `P-004` | **cancelado** |
| `FL-007` | `MF880` | `MAIA2X` | GIG→MAD | +50h30 | `P-006` | aberto |

| Passageiro | Documento (`DOCUMENT`) |
|---|---|
| `P-001` | `123.456.789-00` |
| `P-002` | `987.654.321-00` |
| `P-003` | `111.222.333-44` |
| `P-004` | `123.456.789-09` |
| `P-005` | `222.333.444-55` |
| `P-006` | `333.444.555-66` |
| `P-007` | `444.555.666-77` (sem voos) |

## 10. Pendências e ambiguidades

1. **Autenticação/autorização inexistente.**
2. Para buscas por voo ou reserva, o `passengerId` não é descoberto pela API: o usuário digita o código. Com dados de demonstração ligados, o app sugere os passageiros fictícios de `GET /demo/test-data` (`flights[].passengers`) e pré-preenche o primeiro.
3. Não há endpoint para consultar um check-in existente; após `409 CHECKIN_ALREADY_DONE` não é possível recuperar portão/horário.
4. `message` e `error` são em inglês; i18n no frontend (use `code`).
5. Documento: a API exige o formato exato; a normalização (CPF só com dígitos) é feita pelo frontend.
6. `boardingTime` pode estar no passado se o check-in ocorrer a menos de 30 min da partida.
7. Horários em UTC; a API não informa o fuso do aeroporto.
8. Persistência volátil (em memória); decisão registrada em [`api-audit-report.md`](api-audit-report.md).
9. CORS ativo (`CORS_ALLOWED_ORIGINS`) não tem teste automatizado.

## 11. Exemplos `curl`

```bash
curl -s -X POST http://localhost:8080/checkins/flights/search \
  -H 'Content-Type: application/json' -d '{"searchType":"BOOKING_CODE","value":"MAIA7K"}'

curl -s -X POST http://localhost:8080/checkins \
  -H 'Content-Type: application/json' -H 'X-Request-Id: front-123' \
  -d '{"flightId":"FL-004","passengerId":"P-004"}'

curl -s http://localhost:8080/demo/test-data
```
