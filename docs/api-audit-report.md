# Relatório de Auditoria — MaiaFlight Check-in API

Data: 2026-10-29 (atualizado em 2026-10-30, ver §7) · Stack: Kotlin 2.2 / Spring Boot 4.0.5 / Java 24 (build em JDK 25) · Persistência: **em memória** (sem banco de dados).

Legenda: **[Fato]** comprovado por código/execução · **[Risco]** potencial, não exercido · **[Rec.]** recomendação não implementada.

## 1. Escopo e método

Leitura integral do código (`src/main`, `src/test`, `pom.xml`, `application.yaml`, OpenAPI, README), baseline de build/testes **antes** de qualquer mudança (passou), execução real da aplicação (jar e container Docker) para confirmar comportamentos.

Mapa do sistema: 2 endpoints (`POST /checkins/flights/search`, `POST /checkins`), arquitetura hexagonal simples (controller → use cases → ports → repositórios em memória), padrões Strategy (busca) e Policy (janela de check-in). Interface HTTP gerada por *contract-first* (openapi-generator).

## 2. Achados e correções

| # | Prio | Achado | Tipo | Status |
|---|------|--------|------|--------|
| 1 | P1 | Qualquer passageiro conhecido podia fazer check-in em **qualquer voo** (não se verificava `flight.passengerIds`) | Fato | **Corrigido** |
| 2 | P1 | Validação de entrada inativa: só `jakarta.validation-api` (sem implementação). Campo ausente (`{"flightId":"FL-001"}`) causava NPE → **500**; JSON malformado/enum inválido retornavam o `ProblemDetail` padrão do Spring, fora do formato `ErrorResponse` | Fato (análise do `pom.xml` e do fluxo) | **Corrigido** |
| 3 | P1 | Endpoints Actuator `env`, `loggers` (escrita de níveis de log) e `mappings` expostos, `show-details: always`, sem autenticação | Fato | **Corrigido** (exposição reduzida a `health,info,metrics`; `show-details: when-authorized`; teste garante 404 em `/actuator/env` e `/actuator/loggers`) |
| 4 | P1 | Dados pessoais em logs: e-mail do passageiro (INFO) e **CPF/documento** da busca (INFO) | Fato (logs do baseline) | **Corrigido** (CPF não é logado; e-mail mascarado `j***@dominio`; confirmado em execução) |
| 5 | P1 | **Sem autenticação/autorização** na API. Ids são previsíveis (`P-001`); busca por CPF/booking code e check-in são anônimos (IDOR) | Fato (ausência) | **Aberto — requer decisão** (§4) |
| 6 | P2 | Log JSON/ECS **nunca esteve ativo**: `spring.logging.structured` estava aninhado em `spring:` (ignorado); o nível DEBUG configurado também não valia. Logs saíam em texto | Fato (logs do baseline) | **Corrigido** (`logging.structured.format.console`; JSON ECS confirmado em execução) |
| 7 | P2 | Janela de check-in incorreta: `ChronoUnit.HOURS.between` trunca. Voo que partiu há 30 min era **elegível**; voo a 72h30 também | Fato (análise + teste de regressão) | **Corrigido** (comparação exata com `Duration`) |
| 8 | P2 | Fuso horário: `LocalDateTime.now()` (zona do servidor) era serializado com `atOffset(UTC)`, rotulando hora local como UTC | Risco concreto em servidor não-UTC (a máquina de teste é GMT, não exercido) | **Corrigido** (`Clock` UTC injetado; todos os `LocalDateTime` do serviço são UTC) |
| 9 | P2 | Falha do `EventPublisher` após persistir o check-in virava **500**; o retry do cliente receberia 409 | Fato (análise de fluxo + teste) | **Corrigido** (best-effort com log de erro) |
| 10 | P2 | Sem handler genérico: exceções inesperadas retornavam resposta padrão do container | Fato | **Corrigido** (500 com mensagem genérica, sem stack trace) |
| 11 | P2 | Sem CORS: frontend em outra origem é bloqueado pelo browser | Fato | **Corrigido** (opt-in via `CORS_ALLOWED_ORIGINS`; desligado por padrão; **não testado automaticamente**) |
| 12 | P2 | Sem correlação de requisições nos logs | Fato | **Corrigido** (`RequestIdFilter`, header `X-Request-Id`, MDC `requestId`) |
| 13 | P2 | Sem Dockerfile, CI, verificação de dependências | Fato | **Corrigido** (§3) |
| 14 | P2 | Cobertura: nenhum teste HTTP; sem teste de concorrência real do repositório | Fato | **Corrigido** (§5) |
| 15 | P3 | `InMemoryCheckinRepository.saveIfAbsent` escrevia o índice por id fora da operação atômica | Risco | **Corrigido** (`computeIfAbsent`) |
| 16 | P3 | Busca não faz `trim` do valor (`" MF100"` não encontra) | Fato | **Corrigido** |
| 17 | P3 | Dados *seed* em memória são calculados na subida (`now()+24h`…): após ~24h de uptime FL-001 sai da janela; reinício zera check-ins | Fato | Aberto (esperado para demo; some com persistência real) |
| 18 | P3 | Exceções de domínio vivem em `api.exception` mas são usadas por `application` (dependência camada interna → externa) | Fato | Aberto (mover de pacote é refactor sem impacto funcional; não feito para evitar churn) |
| 19 | P3 | `boardingTime = partida − 30min` pode cair no passado se o check-in ocorrer a <30 min da partida (a política permite até a partida) | Fato (análise) | Aberto — regra de negócio a confirmar |
| 20 | P3 | Busca por documento exige o formato exato do seed (`123.456.789-00`); sem normalização | Fato | Aberto — decisão de produto |
| 21 | P3 | Portão de embarque derivado de `hashCode` do número do voo (todos os passageiros do voo no mesmo portão) | Fato | Aberto — comportamento preservado |
| 22 | P3 | Relatório Surefire mostra `Tests run: 0` para specs Kotest com blocos aninhados (os testes **executam**: 10 e 5 `testcase` nos XMLs) | Fato | Aberto (cosmético) |
| 23 | P3 | `IllegalArgumentException` mapeada genericamente para 400 (poderia mascarar erros internos). Hoje só o `require` do use case a lança | Risco | Aberto (recomendada exceção de domínio dedicada) |

N+1 / consultas ineficientes / transações: **não aplicável** — não há banco de dados; os repositórios fazem varredura linear de 3 voos/3 passageiros em memória.

### Decisões de contrato (compatibilidade)

* Rotas, campos, enums e códigos de status existentes **preservados**.
* Mudanças visíveis ao cliente: (a) check-in de passageiro fora do voo passa a retornar **404** (antes: 201 indevido); (b) requisições inválidas passam a retornar **400** com `ErrorResponse` (antes: 500 ou corpo `ProblemDetail`); (c) voos já partidos / além de 72h exatos passam a ser corretamente rejeitados; (d) novo header de resposta `X-Request-Id`.
* Escolha do 404 para "passageiro não está no voo": o OpenAPI já previa 404 "Flight or passenger not found". **Confirmar** com produto se 409/422 é preferível.

## 3. Infraestrutura e observabilidade

* **Logs**: JSON ECS efetivo, `requestId` em todas as linhas, PII removida/mascarada, nível por `LOG_LEVEL` (padrão INFO), formato por `LOG_FORMAT`.
* **Actuator**: `health` (com probes liveness/readiness), `info`, `metrics`.
* **Docker** (`Dockerfile`): multi-stage, JRE, usuário não-root, `MaxRAMPercentage`, `HEALTHCHECK` em `/actuator/health/liveness`. **Validado**: `docker build` OK, container ficou `healthy`, processo roda como `app`, endpoint respondeu 201.
* **CI** (`.github/workflows/ci.yml`): `./mvnw verify` (compila, gera OpenAPI, roda testes), `dependency-review-action` em PRs (falha em severidade alta), build da imagem Docker. **Não executado** (precisa do GitHub); os mesmos comandos rodaram localmente.
* **Dependabot** semanal para Maven, GitHub Actions e Docker.
* **Lint**: o projeto não tem ktlint/detekt configurados; não foi adicionado para não introduzir falhas em massa sem acordo de estilo. **[Rec.]** adicionar detekt/ktlint.
* **Métricas/tracing**: Micrometer já exposto em `/actuator/metrics`. **[Rec.]** `micrometer-registry-prometheus` + OpenTelemetry só quando houver coletor; não adicionado (sem justificativa hoje). Nota: o README ainda cita `/actuator/prometheus` como "futuro".
* **Banco/migrations**: inexistentes (persistência em memória). **[Rec.]** ao persistir, criar *unique constraint* `(flight_id, passenger_id)` para manter a garantia de idempotência hoje dada por `computeIfAbsent`, e adotar Flyway/Liquibase; considerar *outbox* para o evento.

## 4. Pendências que exigem decisão

1. **Autenticação/autorização (P1)**: definir modelo (JWT/OIDC, sessão do passageiro). Sem isso, qualquer um que conheça ids/CPF/booking code consegue consultar voos e fazer check-in. Sugestão: Spring Security resource server + checar que o passageiro autenticado é o do check-in; rate limiting no gateway.
2. Código HTTP para "passageiro fora do voo" (404 atual vs 409/422).
3. Política do horário de embarque quando faltam <30 min.
4. Normalização de documento (com/sem pontuação).
5. Paginação/ordenação: a busca devolve a lista completa sem paginação (hoje ≤ 3 voos).

## 5. Testes e validação (executados)

| Verificação | Resultado |
|---|---|
| Baseline antes das mudanças (`./mvnw verify`) | **Passou** — 29 `testcase` (Surefire reportava 18 por causa do achado 22) |
| `./mvnw verify` final | **Passou** — 58 `testcase`, 0 falhas |
| Teste de concorrência (32 threads, mesmo voo/passageiro) | **Passou** — exatamente 1 sucesso |
| Execução real do jar (porta alternativa) | Respostas HTTP, JSON de log e ausência de PII conferidos manualmente |
| `docker build` + `docker run` + healthcheck | **Passou** (`healthy`, usuário `app`) |
| Lint | **Não executado** — não configurado no projeto |
| CI no GitHub Actions | **Não executado** |

Distribuição final: contexto Spring 1 · HTTP ponta a ponta 18 · use case check-in 11 · use case busca 8 · evento 2 · repositório 3 · política 10 · strategies 5.

Novos/ampliados: `CheckinApiIntegrationTest` (contrato HTTP), `HoursBeforeDeparturePolicyTest` (relógio fixo; regressões do achado 7), `PerformCheckinUseCaseTest` (passageiro fora do voo, falha do publisher), `InMemoryCheckinRepositoryTest` (concorrência), `CheckinCompletedEventTest` (máscara de PII).

Observação de ambiente: a porta 8080 da máquina estava ocupada por outra aplicação, alheia a este projeto; os testes manuais usaram 18080/18081.

## 6. Arquivos alterados

Código: `GlobalExceptionHandler.kt`, `PerformCheckinUseCaseImpl.kt`, `SearchFlightsUseCaseImpl.kt`, `HoursBeforeDeparturePolicy.kt`, `CheckinCompletedEvent.kt`, `ApplicationConfig.kt`, `InMemoryCheckinRepository.kt`, `InMemoryFlightRepository.kt`; novos `api/filter/RequestIdFilter.kt`, `config/CorsConfig.kt`.
Config/infra: `pom.xml` (starter de validação), `application.yaml`, `check-in-api.yaml` (OpenAPI), `Dockerfile`, `.dockerignore`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `README.md`.
Testes: ver §5. Docs: este arquivo e `docs/frontend-integration-guide.md`.

## 7. Atualização — contrato 1.1.0, limpeza e front

**Mudanças no backend (por pedido do front do protótipo):**

| Mudança | Tipo |
|---|---|
| A busca lista voos ainda não partidos com `checkinAvailable` real (antes só elegíveis) | **Semântica alterada** — único consumidor é o app deste repositório |
| `FlightSummary.status`, `FlightSummary.checkinOpensAt`, `SearchFlightsResponse.passengerId` (DOCUMENT) | Aditivo |
| `ErrorResponse.code` estável (`FLIGHT_NOT_FOUND`, `CHECKIN_ALREADY_DONE`, …) | Aditivo; resolve as pendências 3 e 4 do relatório anterior |
| `PassengerNotOnFlightException` separada de `PassengerNotFoundException` (mesmo 404, `code` próprio) | Interno |
| `POST /demo/reset` (204) esquece todos os check-ins em memória, para repetir o fluxo de demonstração; `CheckinRepository.deleteAll()` |
| `GET /demo/test-data` agora também lista os passageiros fictícios de cada voo (`flights[].passengers`) + seed alinhado ao protótipo, calculado pela hora atual (não expira) — `APP_DEMO_ENABLED=false` desliga | Novo |
| Limpeza de KDoc/comentários redundantes em todo o backend | Sem mudança de comportamento |

**Decisão: persistência.** Mantida **em memória**: é um protótipo de portfólio que deve rodar com um comando, com dados determinísticos e testes rápidos. Os ports (`FlightRepository`, `PassengerRepository`, `CheckinRepository`) isolam a persistência; PostgreSQL ficaria atrás deles, com `UNIQUE (flight_id, passenger_id)` (hoje garantido por `computeIfAbsent`), Flyway e, se necessário, *outbox* para o evento. MongoDB não traz ganho: o domínio é relacional e a unicidade composta é central. Nada disso foi implementado.

**Gráficos (ApexCharts) no app.** Implementados somente com dados reais do fluxo do passageiro: janelas de check-in (resultados), progresso da janela (detalhes) e linha do tempo (confirmação). **Não implementados de propósito**: atividade de voos, distribuição de status, tendências de tráfego, mapas de calor e estatísticas operacionais — a API não expõe esses dados e o fluxo é do passageiro.

**Testes:** backend 68 `testcase` (ver `target/surefire-reports`), front 171 testes (Vitest).
