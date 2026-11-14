# AXIOM — Authenticated Operations Dashboard Design

**Status:** Proposed design only. The reviewed repository contains no dashboard server, browser asset, session store, or HTTP listener.

## 1. Purpose and non-goals

The dashboard is a small operations interface for the authorised owner. It displays a redacted, compact view of the five logical identities and invokes existing Coordinator use cases. It is not an alternate task manager, a direct database console, a Mineflayer remote-control shell, a provider prompt console, or a public website.

Initial deployment is loopback-only on the Android host. Any remote access requires a separately reviewed authenticated private-network/VPN/TLS deployment; it must not use an unauthenticated public tunnel. Dashboard code must remain disabled until its security and integration acceptance gates pass.

## 2. Information architecture

### 2.1 Overview

The landing page shows a swarm header and five stable bot cards, one per configured `botId` and username. It never implies that all five are connected or certified.

| Panel | Redacted data | Behaviour |
|---|---|---|
| Swarm status | swarm/server lifecycle, effective live cap, pressure state, selected provider outcome, task summary, last safe shutdown state | start/stop controls only for an authorised operator and current session grant |
| Five bot cards | identity, connection phase, safety state, health/hunger/air, dimension/position age, equipment summary, bounded inventory summary, task/lease phase, navigation/recovery state, per-controller counters | cards remain visible for disabled/disconnected bots; unknown data is shown as `unknown` with age |
| Task board | task/objective state, verified/reserved/remaining quantities, dependencies, assigned bot IDs, lease expiry, disputes | create/cancel only via Coordinator; no direct quantity editing |
| Provider panel | selected provider/model label, enabled/disabled status, circuit/budget-safe outcome, bounded latency/queue metrics | selection uses Coordinator and never exposes token, raw prompt, complete response, or cost guess as fact |
| Resources | process-shared RSS/heap/CPU/event-loop/memory availability, battery/thermal when available, active bots/pathfinders, queue/cache/listener/timer counters | unavailable values include a reason; process metrics are not invented per bot |
| Recent events | bounded, redacted chronological stream of lifecycle/task/safety/recovery/provider/audit events | fixed-size ring/SSE replay window; no packet dump, raw chat, credentials, or filesystem paths |
| Chat | configured mode/cooldowns/queue status and operator-approved message form | all sends route through ChatManager and policy/throttles |

### 2.2 Detail views

A bot detail page may show the compact `BotRuntimeSnapshotV1` described in `SWARM_RUNTIME_DESIGN.md`: independent connection, inventory observation, health/hunger, position, equipment, lease/action, navigation, recovery, and bounded controller metrics. It must show timestamp, source, and staleness for every observation. It must not render raw provider text, full player chat, server packets, private endpoints, secret environment values, or arbitrary NBT.

A task detail view shows aggregate ledger values and evidence status, not a writable inventory total. A recovery detail view shows `RECOVERED` only when verification evidence exists; location arrival is not sufficient.

## 3. Command model and authorization

Every mutating control becomes a typed request to `Coordinator` with an authenticated dashboard actor, correlation ID, idempotency key, CSRF proof, and audit record. The dashboard never imports `StateStore`, `TaskManager` internals, a provider SDK, or a Mineflayer client.

| Control | Coordinator use case / constraints |
|---|---|
| Start/stop swarm | `startSwarm(actor)` / `stopSwarm(actor)`; start requires all version, profile, operator-session, capacity, and policy gates |
| Individual bot | typed `start`, `safeStop`, or park request; cannot create a duplicate client or bypass effective cap/session state |
| Provider | `setProvider(actor, provider)`; enabled/no-charge/budget/circuit policy remains server-side |
| Tasks | `submitTask(actor, request)` / `cancelTask(actor, taskId)`; cancellation fences leases and does not erase audit/ledger evidence |
| Chat configuration | `setChatMode(actor, mode)`; no option permits player chat to become privileged |
| Manual message | `sendManualChat(actor, target, message)`; selected bot(s), length, pressure, cooldown, queue, and self-message rules are enforced by ChatManager |

A read-only `viewer` role can read the redacted snapshot/events. An `operator` role can issue the typed controls above. If a dashboard bootstrap administrator is retained, it creates/rotates application roles only through an audited local setup flow; it is not a bypass role for Mineflayer, task ledger, or provider policy.

## 4. Authentication, sessions, and endpoint protection

1. Bind `127.0.0.1`/`::1` by default. Refuse public bind until the separate VPN/TLS policy is accepted and tested.
2. Store only a modern password-hash verifier in environment/secret storage; never raw passwords. Validate its documented encoding and reject empty/whitespace placeholders.
3. On successful login, create an opaque random session ID. Store a keyed server-side session record with actor, role, issued/expiry/last-seen timestamps, CSRF secret, rotation generation, and revocation status in the durable state store.
4. Send a `Secure` (when HTTPS), `HttpOnly`, `SameSite=Strict`, host-only cookie. Rotate session ID after login/privilege change and invalidate all sessions on bootstrap-secret rotation or suspected compromise.
5. Require Origin/Host checks and a per-session CSRF token for every mutation. Reject unsupported methods/content types, malformed JSON, oversized bodies, unknown properties, cross-origin requests, and replayed idempotency keys.
6. Rate-limit login, session validation, event streaming, and mutations by session/IP with bounded storage. Apply a short lockout/backoff after repeated failed passwords without leaking account validity.
7. Set restrictive security headers: no third-party scripts/CDNs, strict CSP, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and an explicit allowlist of local asset origins.
8. Audit successful/failed login, logout, session revocation, every mutation request, authorization failure, and CSRF/origin rejection with redacted actor/correlation data.

## 5. Proposed HTTP/SSE surface

Routes are illustrative contracts, not currently implemented endpoints.

```text
GET  /healthz                         -> minimal process liveness only; no secrets/state
POST /auth/login                      -> credential verification + session issue
POST /auth/logout                     -> session revoke
GET  /api/v1/dashboard                -> redacted aggregate snapshot (viewer/operator)
GET  /api/v1/bots                     -> five redacted bot snapshots (viewer/operator)
GET  /api/v1/bots/:botId              -> one validated bot snapshot (viewer/operator)
GET  /api/v1/tasks                    -> bounded task summary (viewer/operator)
GET  /api/v1/tasks/:taskId            -> bounded task/evidence summary (viewer/operator)
GET  /api/v1/events                   -> bounded redacted recent events (viewer/operator)
GET  /api/v1/events/stream            -> authenticated bounded SSE (viewer/operator)
POST /api/v1/swarm/start              -> Coordinator start (operator + CSRF)
POST /api/v1/swarm/stop               -> Coordinator stop (operator + CSRF)
POST /api/v1/bots/:botId/safe-stop    -> Coordinator typed bot request (operator + CSRF)
POST /api/v1/provider                 -> Coordinator provider request (operator + CSRF)
POST /api/v1/tasks                    -> Coordinator submit task (operator + CSRF)
POST /api/v1/tasks/:taskId/cancel     -> Coordinator cancel task (operator + CSRF)
POST /api/v1/chat/configuration       -> Coordinator chat-mode request (operator + CSRF)
POST /api/v1/chat/message             -> Coordinator manual chat request (operator + CSRF)
```

Route handlers validate an allowlisted `botId`, task UUID, command enum, input length, and idempotency key before calling the Coordinator. They return `DomainError.toJSON()` safe envelopes. `404`, `401`, and `403` responses must not disclose whether a hidden bot/task/session exists. No route may expose a raw database query, arbitrary provider request, raw Minecraft packet, filesystem read, shell action, or dynamic method name.

## 6. Live updates and bounded resources

Use authenticated Server-Sent Events initially, not an unrestricted WebSocket command channel. Each client receives an initial compact snapshot followed by named redacted events. The server must:

- limit snapshot size to the configured 64 KiB target;
- coalesce non-critical updates to at most 1 Hz under normal pressure;
- cap clients, per-client buffered bytes, events, and replay window;
- disconnect slow consumers with a safe reconnect cursor rather than retaining unbounded buffers;
- never emit raw chat, provider payload, tokens, private host/path, stack trace, or credential-bearing config; and
- reduce/coalesce then stop streams under ResourceGovernor pressure before safety/persistence work is affected.

The browser treats every event as display data. It cannot alter a Coordinator decision based on a field rendered by JavaScript.

## 7. Visual design and accessibility

Use a responsive single-page layout with a swarm summary bar, five colour-and-text status cards, a task/ledger panel, a resource panel, and a filterable event timeline. Colour is supplementary: lifecycle/safety state always has text/icon labels. Show stale/unknown fields distinctly and do not replace them with reassuring zeros. Provide keyboard navigation, visible focus, semantic form labels, accessible chart summaries, non-animated critical alerts, and a confirmation dialog for stop/cancel/manual broadcast actions.

Modern styling must be local/static and dependency-minimal. It must not load analytics, remote fonts, CDNs, or browser-accessible provider credentials.

## 8. Security and acceptance tests

Before enabling the dashboard, implement and pass at least:

1. unauthenticated, wrong-password, expired, revoked, fixed-session, and role-escalation tests;
2. session-cookie attribute, rotation, logout, CSRF, Origin/Host, content-type, body-size, route-param, and rate-limit tests;
3. direct-route tests proving every mutation calls Coordinator exactly once and no route imports StateStore/Mineflayer/provider modules;
4. authorization tests for every control and safe response tests for unknown bot/task/session IDs;
5. redaction fixtures containing token, password, cookie, host, URL, path, provider payload, chat text, and raw error; none may appear in HTML, JSON, SSE, logs, or audit query output;
6. SSE slow-client, disconnect/reconnect, pressure, memory-bound, and listener/timer cleanup tests;
7. UI contract fixtures for all five independent bot states, disconnected/unknown telemetry, recovery evidence, and process-shared resource labels; and
8. a manual loopback-only operational test followed by a separately approved private-network/TLS test if remote access is needed.

No dashboard test may use the Aternos target as load infrastructure. Enabling the dashboard remains blocked until these tests, SQLite persistence, and the broader release gates pass.
