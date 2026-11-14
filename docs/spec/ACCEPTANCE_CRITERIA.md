# AXIOM — Acceptance Criteria and Release Gates

A gate passes only with retained evidence from the named test lane. “No evidence” is a fail/defer, not a conditional pass. Gates are cumulative.

## 1. Global non-negotiable gates

| Gate | Acceptance condition | Evidence |
|---|---|---|
| G-01 Specification | Owner accepts the architecture; blocking decisions have documented disposition. | signed/recorded owner decision in `docs/DECISIONS.md` or issue/PR reference |
| G-02 Version | Exact Minecraft version is published in all three core packages and private compatibility harness passes. | lockfile, static assertion, server report, test artefacts |
| G-03 Single authority | All external adapters call Coordinator; only TaskManager transaction writes task/ledger/assignment truth. | architectural test/source scan + integration tests |
| G-04 Aggregate ledger | 10,000 quota fuzz cases and multi-bot integration have zero conservation/double-credit violations. | test output and persisted evidence examples |
| G-05 Safe AI | Closed schema/semantic/prompt-injection corpus has zero arbitrary-action paths; failures degrade safely. | contract/security report |
| G-06 Aternos compliance | State machine has zero automatic website/idle/fake-activity/infinite-reconnect paths. | static scan + lifecycle tests + owner terms review record |
| G-07 Auth/security | Discord ID allowlist, dashboard session/CSRF/RBAC, secret redaction, remote-Ollama TLS policy all pass. | security suite |
| G-08 Persistence/recovery | Crash, lease fencing, inventory dispute, death/recovery evidence tests pass. | integration suite |
| G-09 Bounded runtime | No leaked scoped listener/ref'd timer; queues/caches/history/event stream have caps and backpressure. | performance/leak suite |
| G-10 Device capacity | Actual named-device benchmark accepts the desired live cap without safety/ledger/thermal failure. | raw benchmark directory and summary |

## 2. Staged release criteria

### Stage 0 — Architecture acceptance

- All required documents exist, link consistently, use the status vocabulary, and do not promise 26.2, five-client capacity, free quotas, Aternos permission, or survival guarantees.
- `git diff --check` passes.
- Owner resolves or explicitly defers every blocking decision. Deferral keeps related code paths disabled.

### Stage 1 — Core foundation, zero live clients

- Config rejects unsafe/malformed deployment; secrets stay out of source/control-plane views.
- SQLite migrations, transaction rollback, backup/restore, retention, and crash recovery pass on CI; `node:sqlite` passes on actual Termux before deployment approval.
- Coordinator/TaskManager/ledger/DTO contracts and 10,000 quota fuzz test pass.
- No Mineflayer import is exercised in zero-client tests.
- Dashboard and Discord are disabled by default until their own adapters pass.

### Stage 2 — Compatibility and one live bot

- G-02 compatibility harness passes on private owner server for exact selected version. **Current 26.2 requirement cannot enter this stage** until published support is present.
- One controller connects only with explicit operator action; captures telemetry; safely stops; handles transient vs terminal disconnect classifications.
- Tiny view-distance 30-minute soak has no uncaught protocol error, unbounded memory growth, or unresolved event-loop pressure.
- Basic navigation/observation/inventory evidence executes in disposable protected test area. Destructive capability remains separately disabled.

### Stage 3 — Two and three live bots

- Cap 2 then cap 3 device benchmarks pass in sequence; no skip to five.
- Aggregate collect task terminates exactly at target with disjoint leases; collision claims prevent duplicate digs.
- Task cancel/restart/lease expiry/cross-controller evidence and transfer conservation pass.
- Safety retreat/death record/recovery-decision tests pass. Recovery requires proof, not arrival.

### Stage 4 — Five configured identities / five live cap certification

- All five identities may be configured from the start; five concurrent connections require Stage 3 evidence plus T-5 60-minute mixed safe-workload acceptance.
- Device run records peak/post-GC RSS, heap, p95/p99 lag, CPU, battery/thermal, SQLite p95, network, disconnects, and no lost task/duplicate ledger result.
- Governor survives induced constrained/critical drill, persists paused tasks, maintains safety/checkpoint operation, and never reconnects in violation of Aternos rules.
- A five-client result is valid only for the named device/server/load/version; it is not a general capacity claim.

### Stage 5 — AI and natural chat

- Ollama C-0..C-4 and N-1 measurements pass or provider stays disabled.
- Qwen result reports valid JSON, semantic-safe plan percentage, unsafe rejection, p95 latency, RSS, CPU, and prompt-injection behavior. It may be approved for bounded chat without being approved for planning.
- One-responder chat, cooldown, retention, proactive-default-off, and no-privilege-chat tests pass.
- Provider budget/circuit behavior produces no hidden paid calls.

### Stage 6 — Discord and dashboard

- Required slash commands are registered in a development guild and pass allowlist/validation/rate-limit tests.
- Dashboard is authenticated, default-loopback, CSRF protected, redacted, bounded, and does not contain a direct Mineflayer/database route.
- Manual `/say` and `/sayall` go through ChatManager throttling and are audit logged.

### Stage 7 — Target operational readiness

- Owner records current Aternos terms review and starts a legitimate server session.
- Exact target host/port/version/auth mode/Spigot build/cap are observed by an operator and match approved configuration.
- Start with certified cap 1 and a non-destructive smoke test. Any target incompatibility returns to `BLOCKED`/`WAITING_FOR_OPERATOR`; it does not trigger a workaround.
- Human operator can stop every bot, inspect task/recovery/audit state, and restart safely.

## 3. Quantitative thresholds awaiting calibration

Before measured hardware exists, only structural caps in `PERFORMANCE_PLAN.md` are binding. These thresholds require owner-approved actual baseline calibration: maximum AXIOM RSS at each cap, V8 heap ratio warning/critical levels, system MemAvailable reserve, event-loop p95/p99, maximum CPU dwell, battery drain/hour, temperature, SQLite p95, Ollama p95 latency, and a Qwen schema/semantic acceptance threshold.

A provisional recommendation is: do not certify an operating stage if critical pressure lasts more than 30 seconds, if event-loop p95 stays above 50 ms for more than 60 seconds during normal work, if any safe-stop/checkpoint is missed, if an unreconciled ledger assertion fails, or if hardware thermal/battery policy is exceeded. These are conservative release blockers, not measured values.

## 4. Release evidence package

Each release candidate includes: commit and lockfile hashes; owner decision references; test commands/results; private-server/version logs; raw metric paths; configuration redacted hash; list of known disabled features; dependency/security review; unresolved risks; and independent reviewer sign-off. A missing report changes release status to `NOT_READY`.
