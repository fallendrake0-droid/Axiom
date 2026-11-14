# AXIOM — Replit Chief Engineer Implementation Assignments

**Status:** Ordered implementation packet. It decomposes the approved architecture; it does not approve blocked work, replace `MASTER_PROJECT_CONTEXT.md`, or claim any runtime capability.

## 1. Operating rules for every assignment

- **GitHub is the source of truth.** Work only from the named task, current branch, and referenced contracts. Do not infer missing requirements from chat or other repositories.
- **Replit owns implementation.** The independent reviewer owns approval, acceptance findings, and release certification. A task is not complete until reviewed after its evidence is submitted.
- **Common implementation contract:** Node.js CommonJS, `async`/`await`, closed DTO validation, typed `DomainError`, structured redaction, no secrets in source, bounded queues/caches/listeners/timers, and no direct adapter-to-database/bot invocation.
- **No implicit permission:** owner decisions OD-01 through OD-12 in `docs/DECISIONS.md` remain gates. In particular, do not install/connect Mineflayer before OD-02/OD-03, do not contact Aternos as a probe, and do not enable hosted providers, Discord, remote Ollama, or dashboard exposure without their listed gates.
- **One durable authority:** `StateStore` plus `TaskManager` transactions are the sole authority for tasks, assignments, verified progress, ledger, recovery, and audit facts. A controller, provider, dashboard, Discord adapter, or chat handler must not mutate those records directly.
- **Compatibility hold:** the configured target Java 26.2 is blocked. Do not patch dependencies, use a protocol proxy, copy NEXUS compatibility code, or silently change the target version.
- **Required Replit completion submission for every task:** changed files; commit reference/SHA; tests run; actual results; known defects; resource measurements (RSS, heap, CPU, event-loop lag, battery/thermal when available); test environment; raw artifact paths; dependencies/version/lockfile diff; negative results; and an explicit request for review.
- **Independent-review response:** confirmed findings; required corrections; accepted changes; unresolved questions; and a gate decision (`ACCEPTED`, `CORRECTIONS_REQUIRED`, or `BLOCKED`). The next dependent task may not begin until the prior gate is accepted. Every completed implementation phase must receive this review before a task in its next dependent phase begins.

## 2. Phase mapping and dependency correction

The requested phase names below are retained. The existing high-level roadmap remains authoritative for interfaces and ownership. One necessary dependency clarification prevents a contradiction: Phase 5 cannot safely make durable task/lease/ledger decisions if SQLite is postponed until Phase 9. Therefore **P1-T2 creates the minimal `StateStore` transaction/migration foundation**, while **Phase 9 completes persistence operations (retention, backups, session tables) alongside the dashboard**. Phase 9 does not introduce a second store.

`P11` is the requested full integration and release acceptance phase; it is the detailed successor to the roadmap's integration/release work.

### Exclusive owner registry

Each task has one implementation owner. A later task consumes only an accepted public interface; it may not begin a parallel rewrite of an earlier owner's module. The only cross-module wiring is performed by `AXIOM-INTEGRATOR` in `RPL-11.1`, except where a task explicitly lists a previously owned file as a reviewed compatibility seam. Such a seam change requires the original owner to approve the API/test diff before merge.

| Task group | Exclusive implementation owner |
|---|---|
| RPL-0.1 | Replit Chief Engineer (documentation/gates) |
| RPL-0.2, RPL-2.1, RPL-11.1 | AXIOM-INTEGRATOR |
| RPL-0.3 | Compatibility owner |
| RPL-1.1 | Foundation/observability owner |
| RPL-1.2, RPL-9.1 | Persistence owner; migration ordering is applied only by AXIOM-INTEGRATOR |
| RPL-1.3, RPL-5.1 | Core owner |
| RPL-2.2, RPL-2.3, RPL-3.1 | Bot owner |
| RPL-3.2, RPL-10.1, RPL-10.2 | QA/performance/security owner |
| RPL-4.1 through RPL-4.3 | AI owner |
| RPL-5.2 | Task/allocator owner |
| RPL-5.3 | Inventory-verification owner |
| RPL-6.1 through RPL-6.3 | Survival/navigation/recovery owner |
| RPL-7.1 | Chat owner |
| RPL-8.1 | AXIOM-INTEGRATOR |
| RPL-8.2 | Discord owner |
| RPL-9.2 | Dashboard owner |
| RPL-11.2 | Replit Chief Engineer (evidence submission only) |

## 3. Assignment packets

---

## RPL-0.1 — Repository baseline and requirements traceability

1. **Task ID:** `RPL-0.1`
2. **Phase:** 0 — Repository setup and requirements validation
3. **Purpose:** Establish the exact implementation baseline, requirements traceability, owner-decision status, and phase gate record before source implementation changes.
4. **Implementation approach:** Read the authoritative documents in the mandated order, create one trace row per requirement/decision, cite the source location, and mark unknowns as blocked rather than resolving them in prose.
5. **Preconditions:** None. Read `MASTER_PROJECT_CONTEXT.md`, `AGENTS.md`, all `docs/spec/` documents, both independent reviews, and `docs/DECISIONS.md`.
6. **Exact files to create:** `docs/traceability/REQUIREMENTS_TRACEABILITY.md`, `docs/traceability/PHASE_GATE_REGISTER.md`.
7. **Exact files permitted to modify:** `DEVELOPMENT_STATUS.md`, `docs/DECISIONS.md`.
8. **Files that must not be modified:** `package.json`, `package-lock.json`, `config/*`, all `src/**`, all `tests/**`, `AXIOM_SPECIFICATION_PACK.zip`.
9. **Public interfaces:** None. The gate register records task ID, dependency, decision ID, evidence path, reviewer status, and next allowed task.
10. **Data contracts:** `RequirementTraceV1 = { requirementId, authoritativeSource, implementationTaskIds, acceptanceEvidence, status: 'unstarted'|'blocked'|'implemented'|'verified' }`; closed keys and no secrets.
11. **Required dependencies:** Node/Git only; no package installation.
12. **Error handling:** Missing/contradictory requirement becomes `BLOCKED` with source locations; never silently choose a server/version/provider policy.
13. **Security constraints:** Do not copy credentials, IDs, URLs intended to be private, raw chat, or test-server access details into traceability records.
14. **Resource constraints:** Documentation-only; no network, device, provider, or Minecraft interaction.
15. **Unit tests:** Markdown local-link validation and a script/assertion that every required phase/task has one trace row.
16. **Integration tests:** None; explicitly record `NOT_APPLICABLE`.
17. **Acceptance criteria:** Every mandatory master-context requirement maps to at least one task/evidence gate; OD-01..OD-12 have correct current status; no invented accepted decision.
18. **Expected deliverables:** Two traceability documents, changed-file list, validation output, and review request.

---

## RPL-0.2 — CI and repository enforcement

1. **Task ID:** `RPL-0.2`
2. **Phase:** 0 — Repository setup and requirements validation
3. **Purpose:** Add repeatable repository-side validation so foundation regressions cannot rely solely on a local claim.
4. **Implementation approach:** Implement deterministic local checks first, then run the same locked commands in a pinned GitHub Actions workflow; make the workflow fail on broken links, scope violations, syntax failures, or test failures.
5. **Preconditions:** `RPL-0.1` accepted; no external service credentials required.
6. **Exact files to create:** `.github/workflows/foundation.yml`, `tools/check-markdown-links.py`, `tools/check-phase-scope.sh`.
7. **Exact files permitted to modify:** `package.json`, `README.md`, `AGENTS.md`.
8. **Files that must not be modified:** All `src/**`, `config/**`, existing tests, release/archive files, architecture contracts.
9. **Public interfaces:** npm scripts `check:links` and `check:scope`; CI status names `foundation` and `documentation`.
10. **Data contracts:** CI artifacts contain commit SHA, Node version, command, exit status, and redacted output only.
11. **Required dependencies:** GitHub Actions Node 22 runner; Python 3 standard library; no npm dependency.
12. **Error handling:** Missing tool/runtime fails the workflow closed. Scope scan must report an actionable path/pattern and not expose secret-like file contents.
13. **Security constraints:** Pin action versions by commit or approved immutable version; use no repository/deployment secrets; do not upload configuration files or logs as artifacts.
14. **Resource constraints:** Fast lane target under five minutes; no live network tests, package installs beyond locked `npm ci --ignore-scripts`, or benchmark jobs.
15. **Unit tests:** Fixtures for valid/broken local links and forbidden active-integration imports during the current zero-network phase.
16. **Integration tests:** A deliberately failing branch/PR fixture must demonstrate a failed required check; a clean run must report passing checks.
17. **Acceptance criteria:** CI runs `npm ci --ignore-scripts`, `npm run check`, JavaScript syntax checks, link checks, `git diff --check`, and the phase-scope check on push/PR; no secret artifact exists.
18. **Expected deliverables:** Workflow, two tools, npm-script diff, CI run URL/ID, and review request.

---

## RPL-0.3 — Exact Minecraft compatibility evidence gate

1. **Task ID:** `RPL-0.3`
2. **Phase:** 0 — Repository setup and requirements validation
3. **Purpose:** Produce the only acceptable evidence for selecting a Minecraft package tuple and version before bot transport work.
4. **Implementation approach:** Validate the selected package tuple statically, run the probe only against the owner-approved disposable private server, retain redacted scenario/metric evidence, and stop on any unsupported or inconclusive result.
5. **Preconditions:** OD-02 and OD-03 accepted; owner supplies an isolated private server, exact Java/Spigot build, authorised profile, and a bounded test window. This task is **blocked** until then.
6. **Exact files to create:** `tools/compat/runCompatibilityProbe.js`, `tools/compat/assertPackageTuple.js`, `tests/private-server/compatibility.test.js`, `docs/evidence/.gitkeep`.
7. **Exact files permitted to modify:** `package.json`, `package-lock.json`, `docs/spec/MASTER_SPEC.md`, `DEVELOPMENT_STATUS.md`, `docs/DECISIONS.md`.
8. **Files that must not be modified:** `src/bots/**`, `src/tasks/**`, `src/ai/**`, `src/dashboard/**`, target profile version unless an owner decision expressly changes it, any Aternos automation code.
9. **Public interfaces:** `runCompatibilityProbe(configPath) -> CompatibilityReportV1`; CLI exits `0` only for `supported` and exits non-zero for `unsupported`/`inconclusive`.
10. **Data contracts:** `CompatibilityReportV1 = { schemaVersion, packageTuple, lockfileHash, serverBuild, profileHash, scenarios, metrics, result: 'supported'|'unsupported'|'inconclusive', startedAt, finishedAt }`. Reports redact host/private network detail.
11. **Required dependencies:** Exact reviewed versions of Mineflayer, `minecraft-protocol`, `minecraft-data`, and only required companion packages. Versions are selected from current published evidence, not hard-coded here; `mineflayer-pathfinder` is optional only if its exact version is reviewed.
12. **Error handling:** Missing tuple/version mismatch/parser error/timeout yields `unsupported` or `inconclusive`, preserves raw redacted evidence, and blocks Phase 2. No runtime mutation, protocol proxy, or version downgrade.
13. **Security constraints:** Private-server only; one unique authorised test identity; no target Aternos use, OP, destructive shared-world actions, credentials, or raw packet dumps in Git.
14. **Resource constraints:** One bot only; bounded 30-minute soak; fixed tiny view distance; no load test.
15. **Unit tests:** Static supported-version assertion, report schema validation, redaction, and failure classification fixtures.
16. **Integration tests:** Owner-approved private-server connect/spawn/disconnect, chat, bounded observation/navigation, inventory window, block interaction in disposable area, death/respawn, restart, and clean shutdown.
17. **Acceptance criteria:** All selected versions appear in the installed package tuple; every private scenario succeeds without unresolved protocol/parser error; retained report is independently reviewable; G-02 closes only on reviewer acceptance.
18. **Expected deliverables:** Exact lockfile, probe/harness, redacted raw report outside Git or approved evidence path, decision update, and review request.

---

## RPL-1.1 — Configuration and observability hardening

1. **Task ID:** `RPL-1.1`
2. **Phase:** 1 — Configuration, logging and core infrastructure
3. **Purpose:** Preserve the existing fail-closed foundation while correcting confirmed logging/secret resilience gaps before adapters are added.
4. **Implementation approach:** Change only the closed validation/redaction/logging boundary, preserve its public API, and drive each hardening change from a regression test that proves the former unsafe behaviour is rejected or isolated.
5. **Preconditions:** `RPL-0.1` accepted. No live integration or new dependency.
6. **Exact files to create:** `tests/security/config-observability-hardening.test.js`.
7. **Exact files permitted to modify:** `src/config/ConfigLoader.js`, `src/observability/Logger.js`, `src/observability/Redaction.js`, `tests/unit/config.test.js`, `tests/security/redaction.test.js`, `config/axiom.config.example.json`, `DEVELOPMENT_STATUS.md`.
8. **Files that must not be modified:** `package.json`, `package-lock.json`, `src/bootstrap.js`, all future module directories, architecture/AI/security contracts.
9. **Public interfaces:** Existing `ConfigLoader` and `Logger` public methods remain compatible. Add only documented validation error codes/optional redaction options if needed; never expose a raw secret or private endpoint.
10. **Data contracts:** Config remains immutable/closed. Secrets must be nonblank after trim; dashboard session secret validation requires documented random encoding/length; dashboard password verifier requires documented hash format; safe log record redacts secret and private host/URL/path fields by default.
11. **Required dependencies:** Node built-ins only.
12. **Error handling:** A failed log sink cannot turn valid configuration into `CONFIG_VALIDATION_FAILED`; malformed/blank/weak secret configuration fails closed with safe typed error; error envelopes hide raw causes.
13. **Security constraints:** No literal test credential; use fixtures only. Preserve prototype-pollution rejection, private file-mode checks, disabled-by-default adapters, and target version gate.
14. **Resource constraints:** Bounded recursive redaction/deep clone only; no unbounded logging context or synchronous retry.
15. **Unit tests:** Whitespace/newline secret rejection; valid session/hash fixture acceptance; default private-address redaction; throwing logger sink isolation; existing public API regressions.
16. **Integration tests:** None; record `NOT_APPLICABLE` because no adapter/listener is enabled.
17. **Acceptance criteria:** All existing and new tests pass; logger records never contain test token/host/path; configuration stays fail-closed; no dependency or live-operation change.
18. **Expected deliverables:** Source/test diff, command output, security regression matrix, and review request.

---

## RPL-1.2 — StateStore transaction foundation

1. **Task ID:** `RPL-1.2`
2. **Phase:** 1 — Configuration, logging and core infrastructure
3. **Purpose:** Build the minimal durable transaction, migration, backup, health, and safe-mode foundation required before TaskManager can own durable truth.
4. **Implementation approach:** First execute the actual Termux preflight, then implement one serialized `node:sqlite` store with migrations, short transactions, private storage, backup verification, and explicit degraded-state handling.
5. **Preconditions:** OD-01 and OD-11 accepted; actual Termux `node:sqlite` preflight succeeds and raw output is supplied. If it fails, stop and return `BLOCKED`; do not substitute a native addon without an accepted ADR.
6. **Exact files to create:** `src/persistence/StateStore.js`, `src/persistence/Migrator.js`, `src/persistence/RetentionPolicy.js`, `migrations/001_initial.sql`, `tests/integration/persistence-state-store.test.js`, `tests/integration/persistence-termux-preflight.test.js`.
7. **Exact files permitted to modify:** `package.json`, `package-lock.json`, `src/bootstrap.js`, `docs/spec/CONFIGURATION.md`, `DEVELOPMENT_STATUS.md`.
8. **Files that must not be modified:** `src/tasks/**`, `src/inventory/**`, `src/bots/**`, `src/ai/**`, `src/dashboard/**`, later migration files, configuration secret logic except approved integration wiring.
9. **Public interfaces:** `StateStore.open()`, `transaction(fn)`, `migrate()`, `checkpoint()`, `backup()`, `health()`, `close()`; `persistence.degraded` event. Transaction callback receives a parameterized-query-only executor.
10. **Data contracts:** `PersistenceHealthV1 = { state: 'healthy'|'degraded'|'closed', schemaVersion, journalMode, lastBackupAt, safeMessage }`; the initial schema creates the Architecture §6 named tables (including task/assignment/ledger/recovery extension tables and bounded dashboard-session storage) with foreign keys/indexes, but no controller writes outside the future TaskManager transaction API.
11. **Required dependencies:** Node `node:sqlite` only after device preflight; no `better-sqlite3`/native addon by default.
12. **Error handling:** Migration/transaction/backup/lock/corruption errors roll back where possible, emit redacted `persistence.degraded`, put Coordinator-facing callers into safe mode, and never delete DB/WAL as recovery.
13. **Security constraints:** App-private storage only; reject shared Android storage; mode/private ownership checks; parameterized statements; backup files protected/redacted; no secret values in tables/logs.
14. **Resource constraints:** One serialized write path, short transactions, WAL/busy timeout only after measured device support, bounded retention batch size, no full-table in-memory load.
15. **Unit tests:** Migration ordering/idempotency, parameter binding, health-state transitions, retention policy boundaries, backup manifest validation.
16. **Integration tests:** Create/commit/rollback/reopen; interrupted migration recovery; lock contention; backup/restore verification; actual Termux preflight artifact.
17. **Acceptance criteria:** The same schema opens/reopens correctly; rollback leaves no partial state; a failed store blocks mutations safely; raw Termux evidence is accepted before mobile sign-off.
18. **Expected deliverables:** Store/migration files, preflight report, tests, measured storage/latency notes, and review request.

---

## RPL-1.3 — Core bounded primitives and resource observation

1. **Task ID:** `RPL-1.3`
2. **Phase:** 1 — Configuration, logging and core infrastructure
3. **Purpose:** Provide deterministic clock/ID/event/queue/cache/timer/resource primitives without prematurely implementing a Coordinator.
4. **Implementation approach:** Implement dependency-injected, pure/bounded primitives with a fake clock and fake metric sources so queues, events, timers, and unavailable metrics can be tested without a network or bot.
5. **Preconditions:** `RPL-1.1` accepted; `RPL-1.2` accepted for persistence event wiring, or inject a test-only event sink.
6. **Exact files to create:** `src/core/EventBus.js`, `src/core/Clock.js`, `src/core/IdFactory.js`, `src/shared/BoundedQueue.js`, `src/shared/BoundedCache.js`, `src/monitoring/ResourceMonitor.js`, `src/monitoring/TimerRegistry.js`, `tests/unit/core-primitives.test.js`, `tests/unit/resource-monitor.test.js`.
7. **Exact files permitted to modify:** `src/core/DomainError.js`, `src/observability/Logger.js`, `src/bootstrap.js`.
8. **Files that must not be modified:** `src/core/Coordinator.js` (not created in this task), `src/persistence/**`, `src/bots/**`, `src/tasks/**`, all adapters, package/lock files.
9. **Public interfaces:** `EventBus.publish/on/disposeScope`, `Clock.now/monotonicMs`, `IdFactory.uuid`, `BoundedQueue.enqueue/dequeue/close/stats`, `BoundedCache.get/set/delete/stats`, `ResourceMonitor.sample/getWindow`, `TimerRegistry.setTimeout/setInterval/disposeScope`.
10. **Data contracts:** `ResourceSampleV1` follows `PERFORMANCE_PLAN.md`, including `unavailable` with reason; `EventEnvelopeV1` includes type, timestamp, correlation ID, priority, and bounded payload.
11. **Required dependencies:** Node built-ins including `node:perf_hooks`; no external package.
12. **Error handling:** Subscriber errors are isolated; critical post-commit event failures are surfaced to caller; unavailable battery/thermal/memory metrics are explicit; queue overflow returns typed backpressure.
13. **Security constraints:** Event payloads are redacted/closed; no raw provider/chat/config values; no dynamically selected listener method.
14. **Resource constraints:** Bounded events/window/cache/queue; scoped timers/listeners; monitor interval ≥ configured minimum; no global untracked interval.
15. **Unit tests:** Fake clock, event order/priority/drop count, listener disposal, timer disposal, queue/cache bounds, cyclic/redacted payload, unavailable metric behavior.
16. **Integration tests:** Start/stop primitive bundle repeatedly and prove zero ref'd timers/listeners remain; sample resource window under injected process metrics.
17. **Acceptance criteria:** Deterministic test behavior; bounded counters observable; no live listener or provider; no timer/listener leak after repeated disposal.
18. **Expected deliverables:** Core primitives, test output, resource sample example with unavailable fields correctly labelled, and review request.

---

## RPL-2.1 — Reviewed game dependency adoption and lockfile gate

1. **Task ID:** `RPL-2.1`
2. **Phase:** 2 — One fully functional Mineflayer bot
3. **Purpose:** Adopt only the exact package tuple accepted by `RPL-0.3`; prevent source work from beginning against an unverified protocol stack.
4. **Implementation approach:** Use the accepted compatibility report to pin exact versions and lock integrity, then prove a clean install exposes the approved package tuple before any bot source is created.
5. **Preconditions:** `RPL-0.3` accepted, including an explicit supported exact version decision. If Java 26.2 remains unsupported, this task is blocked.
6. **Exact files to create:** `tools/compat/assertInstalledTuple.js`, `tests/contract/installed-tuple.test.js`.
7. **Exact files permitted to modify:** `package.json`, `package-lock.json`, `docs/DECISIONS.md`, `DEVELOPMENT_STATUS.md`.
8. **Files that must not be modified:** All `src/**`, `config/**`, private-server test scenarios, dashboard/provider/chat modules.
9. **Public interfaces:** CLI `assertInstalledTuple()`; no application runtime interface.
10. **Data contracts:** `InstalledTupleV1 = { mineflayer, minecraftProtocol, minecraftData, pathfinder?: string, minecraftVersion, lockfileHash }`.
11. **Required dependencies:** Only exact versions proven in `RPL-0.3`; use npm lockfile integrity. No runtime patch package, proxy, or implicit latest range.
12. **Error handling:** Package mismatch, unsupported version, missing lock integrity, audit failure requiring review, or transitive incompatibility blocks `RPL-2.2`.
13. **Security constraints:** `npm ci --ignore-scripts` for audit/test lane; inspect package scripts/licenses; no registry token or deployment secret.
14. **Resource constraints:** Dependency install/audit only; no game connection in this task.
15. **Unit tests:** Tuple parser/version-list fixtures and lockfile hash assertion.
16. **Integration tests:** Clean install followed by static tuple assertion; no Minecraft target connection.
17. **Acceptance criteria:** Exact lockfile is committed, clean install reproducible, tuple matches accepted probe report, dependency review accepted by integrator/reviewer.
18. **Expected deliverables:** Manifest/lock diff, audit report, tuple test, clean-install output, and review request.

---

## RPL-2.2 — One-controller transport and independent snapshot

1. **Task ID:** `RPL-2.2`
2. **Phase:** 2 — One fully functional Mineflayer bot
3. **Purpose:** Implement exactly one safe Mineflayer client lifecycle behind a controller and publish the independent connection/inventory/vitals/position/equipment snapshot contract.
4. **Implementation approach:** Wrap one injected Mineflayer client in a generation-fenced controller, route all lifecycle transitions through closed DTOs, and dispose every listener/timer/client reference on stop or failure.
5. **Preconditions:** `RPL-2.1` accepted; valid private-server profile/session gate; P1 primitives accepted. Target Aternos remains out of scope.
6. **Exact files to create:** `src/bots/ConnectionManager.js`, `src/bots/BotController.js`, `src/bots/BotRegistry.js`, `src/bots/BotSnapshot.js`, `tests/contract/bot-controller.test.js`, `tests/integration/one-controller-lifecycle.test.js`, `tests/private-server/one-controller-soak.test.js`.
7. **Exact files permitted to modify:** `src/bots/ConnectionManager.js`, `src/bots/BotController.js`, `src/bots/BotRegistry.js`, `src/bots/BotSnapshot.js`, and the tests created by this task. It consumes EventBus/DomainError through accepted ports; `RPL-11.1` performs composition wiring.
8. **Files that must not be modified:** `src/bootstrap.js`, `src/core/**`, `docs/spec/**`, `src/tasks/**`, `src/inventory/**`, `src/survival/**`, `src/ai/**`, `src/chat/**`, `src/discord/**`, `src/dashboard/**`, `package.json`, `package-lock.json`.
9. **Public interfaces:** `ConnectionManager.precheck/connect/disconnect/classifyDisconnect`; `BotController.start/stop/safeStop/captureSnapshot/sendChat`; `BotRegistry.registerIdentity/getTelemetry/listEligible`; events listed in Module Interfaces.
10. **Data contracts:** Implement closed `BotRuntimeSnapshotV1` subsets for ConnectionState, InventoryObservation, VitalSigns, PositionObservation, EquipmentObservation, and controller generation from `SWARM_RUNTIME_DESIGN.md`.
11. **Required dependencies:** The accepted Mineflayer tuple only; no pathfinder action or Discord/provider dependency in this task.
12. **Error handling:** Reject wrong profile/version/auth/server authority/cap/session grant; classify kick/ban/auth/whitelist/cap failure as `BLOCKED`; known unavailable server as `WAITING_FOR_OPERATOR`; dispose listener scope and stale client on every failure.
13. **Security constraints:** Offline auth only for validated authorised offline-mode profile; no OP, no player-chat privilege, no credentials/raw packets in logs; reject arbitrary host/version/auth options.
14. **Resource constraints:** One controller, tiny view distance, one connection attempt at a time, no automatic reconnect on known Aternos stop, bounded two retry policy only within valid operator session.
15. **Unit tests:** Fake client lifecycle, duplicate-connect denial, listener cleanup, generation fencing, snapshot staleness/unknowns, disconnect classification, no reconnect on blocked failures.
16. **Integration tests:** Private-server connect/spawn/snapshot/chat receive/send/clean disconnect; 30-minute single-bot soak only after P0 evidence; retain metrics.
17. **Acceptance criteria:** One and only one client instance per identity; complete safe snapshot or explicit unknown; no leaked listeners/timers after stop; private-server evidence matches accepted tuple.
18. **Expected deliverables:** Bot modules/tests, redacted lifecycle/soak artifact, one-bot RSS/heap/CPU/lag result, known failure list, and review request.

---

## RPL-2.3 — Allowlisted controller actions and item registry

1. **Task ID:** `RPL-2.3`
2. **Phase:** 2 — One fully functional Mineflayer bot
3. **Purpose:** Add deterministic typed action execution and version-coupled item validation without allowing arbitrary Mineflayer method calls.
4. **Implementation approach:** Map each allowed action enum to a fixed reviewed implementation, validate item/version/lease/deadline before execution, and require observation before retry; never dispatch an input-supplied method name.
5. **Preconditions:** `RPL-2.2` accepted; accepted game-data version; no destructive capability enabled until later task acceptance.
6. **Exact files to create:** `src/bots/ActionExecutor.js`, `src/inventory/ItemRegistry.js`, `src/bots/ActionSchema.js`, `tests/unit/action-executor.test.js`, `tests/unit/item-registry.test.js`.
7. **Exact files permitted to modify:** `src/bots/ActionExecutor.js`, `src/bots/ActionSchema.js`, `src/bots/BotController.js`, `src/bots/BotSnapshot.js`, `src/inventory/ItemRegistry.js`, and the tests created by this task.
8. **Files that must not be modified:** `src/core/**`, `src/tasks/**`, other `src/inventory/**`, `src/survival/**`, `src/ai/**`, `src/chat/**`, `src/discord/**`, `src/dashboard/**`, `package.json`, `package-lock.json`.
9. **Public interfaces:** `ActionExecutor.execute/cancel/observe`; `ItemRegistry.load/validateItem/toolCapability`; typed action allowlist from `AI_PROTOCOL.md` and `MODULE_INTERFACES.md`.
10. **Data contracts:** `ActionRequestV1 = { actionId, kind, parameters, deadlineAt, leaseFence, idempotencyKey }`; parameters are closed and bounded; no raw function/method/packet field.
11. **Required dependencies:** Existing accepted game-data tuple; no new package.
12. **Error handling:** Unknown action/item/version/expired deadline/cancelled/stale lease returns typed error; before retry observe state; no assumed success from request acknowledgement.
13. **Security constraints:** Never use `eval`, dynamic property/method dispatch from input, shell, raw packet injection, arbitrary coordinates, or protected-region bypass.
14. **Resource constraints:** One active action per controller; per-step deadline/AbortSignal; bounded observations; no unbounded retry.
15. **Unit tests:** Unknown/malformed action, expired/cancelled request, stale lease, unsupported item, protected action denial, observation-before-retry.
16. **Integration tests:** Fake-client action mapping and one private disposable-world non-destructive observation/navigation check only if authorised.
17. **Acceptance criteria:** Every executed call has a fixed reviewed mapping; cancellation stops subsequent steps; no raw Mineflayer method is externally callable; ItemRegistry mismatch blocks game action.
18. **Expected deliverables:** Action/registry modules, mappings/tests, version evidence, and review request.

---

## RPL-3.1 — Five logical controllers and adaptive connection cap

1. **Task ID:** `RPL-3.1`
2. **Phase:** 3 — Five logical bot controllers and adaptive concurrency
3. **Purpose:** Extend the one-controller design to five independent logical states while maintaining a measured/configured live cap.
4. **Implementation approach:** Create five independent registry/controller slots from the configured identities, calculate the effective cap as the restrictive minimum, stagger permitted starts, and use governor directives to park safely.
5. **Preconditions:** `RPL-2.2` and `RPL-2.3` accepted; five configured identities validate; no claim that five live connections are certified.
6. **Exact files to create:** `src/monitoring/ResourceGovernor.js`, `src/bots/ConnectionCapPolicy.js`, `tests/integration/five-logical-controllers.test.js`, `tests/integration/connection-cap.test.js`.
7. **Exact files permitted to modify:** `src/bots/BotRegistry.js`, `src/bots/ConnectionManager.js`, `src/bots/BotController.js`, `src/bots/ConnectionCapPolicy.js`, `src/monitoring/ResourceGovernor.js`, and the tests created by this task. It consumes the existing immutable configuration/resource sample interfaces without rewriting them.
8. **Files that must not be modified:** `src/config/**`, `src/core/**`, `src/monitoring/ResourceMonitor.js`, `src/tasks/**`, `src/inventory/**`, `src/survival/**`, `src/ai/**`, `src/chat/**`, `src/discord/**`, `src/dashboard/**`, `package.json`, `package-lock.json`.
9. **Public interfaces:** `BotRegistry.setEffectiveCap/listEligible/chooseParkCandidates`; `ResourceGovernor.evaluate/directives/setCertifiedCap`; `ConnectionCapPolicy.effectiveCap`.
10. **Data contracts:** `ConnectionCapV1 = { requested, certified, profile, governor, operator, effective, reason }`; independent `BotRuntimeSnapshotV1` for every configured identity.
11. **Required dependencies:** Existing accepted bot tuple; no new external package.
12. **Error handling:** Duplicate active controller/client or cap exceed rejects; pressure reduces new work first; safe park/checkpoint before disconnect; controller failure fences only that generation.
13. **Security constraints:** No child processes, no Aternos keepalive/reconnect evasion, no change to offline-authorisation policy, no cross-bot mutable task state.
14. **Resource constraints:** Staggered login; default effective cap remains one until evidence accepts higher; one active A* initially; all queues/listeners/timers bounded.
15. **Unit tests:** Effective-cap minimum calculation, stable park selection, controller isolation, invalid cap/profile inputs, governor hysteresis.
16. **Integration tests:** Mock 0/1/2/3/5 controller transitions; prove no more than effective cap connects, one failure does not mutate other snapshots, and disposal leaves no leaks.
17. **Acceptance criteria:** Five logical snapshots exist with independent generations/states; live cap cannot be bypassed; no five-live-client claim without later device evidence.
18. **Expected deliverables:** Cap/governor modules, mock lifecycle results, controller/listener counts, and review request.

---

## RPL-3.2 — Staged live-cap qualification harness

1. **Task ID:** `RPL-3.2`
2. **Phase:** 3 — Five logical bot controllers and adaptive concurrency
3. **Purpose:** Measure—not estimate—the maximum safe live concurrency on the actual Android device/private compatible server.
4. **Implementation approach:** Execute the defined 0→1→2→3→5 benchmark stages on the named device/private server, preserve all raw samples including failures, and advance only after independent review of the preceding stage.
5. **Preconditions:** `RPL-3.1` accepted; OD-03, OD-04, and OD-06 accepted; private compatible server available. No Aternos load testing.
6. **Exact files to create:** `benchmarks/termux/run-cap-stage.js`, `benchmarks/termux/result-schema.json`, `tests/performance/cap-stage-contract.test.js`.
7. **Exact files permitted to modify:** `docs/spec/PERFORMANCE_PLAN.md` result appendix only, `docs/spec/ACCEPTANCE_CRITERIA.md` calibrated-threshold appendix only, `DEVELOPMENT_STATUS.md`.
8. **Files that must not be modified:** Any `src/**`, package/lock, task/ledger code, target-server configuration.
9. **Public interfaces:** CLI `runCapStage({ stage: 0|1|2|3|5, runId, configPath }) -> ResultManifestV1`.
10. **Data contracts:** `ResultManifestV1` includes hardware/software versions, config hash, stage, raw sample paths, peak/post-GC RSS, heap, p95/p99 lag, CPU, battery/thermal availability, disconnects, result, and `MEASURED` classification.
11. **Required dependencies:** Existing runtime only; device tools must be recorded, not assumed.
12. **Error handling:** Missing metric/device permission/server issue marks the stage `inconclusive`/`failed`; preserve data; do not advance automatically or retry indefinitely.
13. **Security constraints:** Private-server only; no credentials/raw chat in artifacts; no Aternos use; no synthetic values.
14. **Resource constraints:** Run stages 0→1→2→3→5 sequentially, three times with cooldown/charge notes; abort safely on critical pressure, safety/checkpoint miss, or thermal policy breach.
15. **Unit tests:** Result schema, missing metric classification, stage-order validation, redaction, artifact path bounds.
16. **Integration tests:** Actual-device stages only; each higher stage begins only after reviewer accepts lower-stage evidence.
17. **Acceptance criteria:** Report the maximum verified safe cap for the named device/server/load; if only one passes, certify one; if none pass, certify none. Five is never mandatory.
18. **Expected deliverables:** Raw JSON/CSV outside Git, signed result manifest, threshold proposal, stated max verified cap, and review request.

---

## RPL-4.1 — Provider abstraction and proposal validation

1. **Task ID:** `RPL-4.1`
2. **Phase:** 4 — AI provider abstraction
3. **Purpose:** Implement the common provider envelope and closed plan/chat validation before any provider transport can influence work.
4. **Implementation approach:** Implement the provider manager and validators as transport-independent ports; normalize every response into the closed envelope and reject malformed or unsafe proposal content before any consumer can observe it.
5. **Preconditions:** `RPL-1.3` accepted; `AI_PROTOCOL.md` frozen for this task; no provider endpoint/credential required.
6. **Exact files to create:** `src/ai/AiProviderManager.js`, `src/ai/PlanValidator.js`, `src/ai/ProviderResult.js`, `src/ai/ProviderPolicy.js`, `tests/contract/provider-result.test.js`, `tests/security/ai-proposal-validation.test.js`.
7. **Exact files permitted to modify:** `src/ai/AiProviderManager.js`, `src/ai/PlanValidator.js`, `src/ai/ProviderResult.js`, `src/ai/ProviderPolicy.js`, and the tests created by this task. It consumes existing validation/error primitives without altering them.
8. **Files that must not be modified:** `src/core/**`, `src/shared/**`, `docs/spec/**`, `src/tasks/**`, `src/bots/**`, `src/chat/**`, provider transport files, `package.json`, `package-lock.json`, configuration secrets.
9. **Public interfaces:** Seven operations in `AI_PROTOCOL.md`, `selectPrimary`, `getStatus`, `PlanValidator.validatePlan/validateChat/validateSummary`.
10. **Data contracts:** Closed `ProviderResultV1`, plan schema, conversation/chat schemas, limits, and operation outcomes exactly from `AI_PROTOCOL.md`; proposals have no tool/method/shell/packet fields.
11. **Required dependencies:** Node built-ins only.
12. **Error handling:** Disabled/timeout/rate-limited/budget-exhausted/malformed/extra-key/unsafe output returns safe result or clarification; malformed output never triggers failover or an action.
13. **Security constraints:** Context is frozen/redacted/bounded; prompt text is data; no arbitrary code, dynamic action, provider selection, secret, raw chat history, or filesystem data in result.
14. **Resource constraints:** One in-flight, maximum three queued requests, byte/context/output caps, abort handling, bounded circuit state.
15. **Unit tests:** Every outcome enum; malformed JSON, extra keys, cycles, protected region, unknown item/capability, shell/method/packet field, injection corpus, byte/queue bounds.
16. **Integration tests:** Deterministic fake providers prove standardized outcomes and no direct TaskManager/ActionExecutor call.
17. **Acceptance criteria:** Unsafe/malformed proposals cannot produce a typed action; all contexts/results respect caps/redaction; no network/provider call made by this task.
18. **Expected deliverables:** AI contract/validator modules, corpus results, public API diff, and review request.

---

## RPL-4.2 — Ollama adapter and Chromebook evidence gate

1. **Task ID:** `RPL-4.2`
2. **Phase:** 4 — AI provider abstraction
3. **Purpose:** Add the optional Ollama transport only after private-network and concurrent-workload feasibility evidence exists.
4. **Implementation approach:** Use a private, timeout/abort/byte-capped Ollama transport with the measured model settings, route output through the common validator, and leave the adapter disabled whenever feasibility evidence is absent.
5. **Preconditions:** `RPL-4.1` accepted; OD-06 and OD-07 accepted; C-0 through C-4 evidence from `CHROMEBOOK_OLLAMA_FEASIBILITY.md` accepted for the exact model/context/concurrency. Otherwise remain disabled.
6. **Exact files to create:** `src/ai/OllamaProvider.js`, `tests/integration/ollama-provider.test.js`, `tests/performance/chromebook-ollama-contract.test.js`.
7. **Exact files permitted to modify:** `src/ai/OllamaProvider.js`, `src/ai/AiProviderManager.js`, `src/ai/ProviderPolicy.js`, and the tests created by this task.
8. **Files that must not be modified:** `src/config/**`, `package.json`, `package-lock.json`, `src/tasks/**`, `src/bots/**`, dashboard/browser files, hosted provider files.
9. **Public interfaces:** `OllamaProvider.invoke(operation, context, signal)` and `healthCheck()` returning `ProviderResultV1` only.
10. **Data contracts:** Strict JSON request/response, fixed model tag/digest, operation-specific context/output caps, TLS/host policy, `keep_alive: '0'` until a distinct approved revision changes it.
11. **Required dependencies:** Node 22 built-in `fetch`/AbortController or reviewed built-in HTTP transport; no browser request and no third-party SDK required.
12. **Error handling:** Connect/warm/cold timeout, abort, invalid certificate/host, byte overflow, malformed JSON, unavailable service, and model mismatch produce safe outcomes and open a bounded circuit.
13. **Security constraints:** Private TLS endpoint with approved host/CA policy; optional bearer token only from environment; no dashboard exposure; never send credentials, raw player logs, or provider key to model.
14. **Resource constraints:** One request in flight, bounded three-request queue, no periodic billable-like probe, model unload policy, no automatic retry storm.
15. **Unit tests:** URL/TLS policy, timeout/abort, byte cap, model tag, redaction, invalid JSON/schema, circuit behavior.
16. **Integration tests:** Approved private Ollama endpoint/fake server with fixed response corpus; C-0..C-4 measured artifact is an external acceptance input, not simulated evidence.
17. **Acceptance criteria:** Exact Chromebook envelope supports the configured bounded use or adapter stays disabled; no unmeasured model/load claim; invalid response cannot reach task/controller code.
18. **Expected deliverables:** Adapter/tests, redacted C-0..C-4 manifest, endpoint-policy evidence, and review request.

---

## RPL-4.3 — Hosted provider adapters and free-only failover policy

1. **Task ID:** `RPL-4.3`
2. **Phase:** 4 — AI provider abstraction
3. **Purpose:** Add optional Gemini/Groq adapters without hidden charges or competing decision paths.
4. **Implementation approach:** Implement each hosted provider behind the same port, record budget/circuit state before invocation, and make failover an explicit policy decision that is denied for paid, unknown-cost, malformed, or exhausted cases.
5. **Preconditions:** `RPL-4.1` accepted; OD-08 accepted for each provider with current official no-charge evidence, model ID, quota/rate limits, and £0 hard cap. No acceptance means this task remains disabled/blocked.
6. **Exact files to create:** `src/ai/GeminiProvider.js`, `src/ai/GroqProvider.js`, `src/ai/ProviderFailoverPolicy.js`, `tests/integration/hosted-provider-policy.test.js`, `tests/security/provider-budget-failover.test.js`.
7. **Exact files permitted to modify:** `src/ai/GeminiProvider.js`, `src/ai/GroqProvider.js`, `src/ai/ProviderFailoverPolicy.js`, `src/ai/AiProviderManager.js`, `src/ai/ProviderPolicy.js`, and the tests created by this task. It uses approved built-in HTTPS transport unless a separate integrator dependency task is accepted.
8. **Files that must not be modified:** `package.json`, `package-lock.json`, `src/config/**`, `src/tasks/**`, `src/bots/**`, `src/chat/**`, `src/discord/**`, `src/dashboard/**`, Ollama transport source, owner decision sources.
9. **Public interfaces:** Both adapters implement `invoke(operation, context, signal)`; manager exposes a selected provider and a safe `ProviderResultV1`, never SDK objects.
10. **Data contracts:** Provider usage record includes operation/model/outcome/latency/tokens if supplied/`estimatedCostGbp` or `null`/budget window; no key/prompt payload. Failover decision includes primary outcome, target, budget/circuit/entitlement proof, and reason.
11. **Required dependencies:** Official reviewed SDK only if its exact version/license/lockfile is accepted by `AXIOM-INTEGRATOR`; otherwise use approved built-in HTTPS transport. Keys are environment-only.
12. **Error handling:** 429, quota/pricing uncertainty, missing entitlement/key, circuit open, timeout, malformed response, and budget exhaustion return unavailable/clarification. Failover is allowed only for availability/rate-limit outcomes, never malformed/trust failure.
13. **Security constraints:** Default disabled; automatic failover false unless two explicitly enabled no-charge providers have independent remaining budgets. No automatic paid request, periodic paid health check, raw error/key, or browser SDK.
14. **Resource constraints:** Same one-in-flight/three-queue global limit; hard hourly/daily budgets; exponential/circuit bounds; no retry amplification.
15. **Unit tests:** Entitlement/budget state, 429, timeout, circuit, malformed response no-failover, paid/unknown-cost denial, provider-switch-in-flight fencing.
16. **Integration tests:** Fake SDK/HTTP transports and, only after owner approval, one non-billable recorded request per provider. Real provider test output must include account policy evidence but no key.
17. **Acceptance criteria:** A disabled/unknown-cost/paid provider is never invoked; failover cannot bypass budget; provider switch does not alter a task/lease; all outputs enter PlanValidator.
18. **Expected deliverables:** Adapter/policy code, lockfile/dependency review, budget/failover evidence, known quota limitations, and review request.

---

## RPL-5.1 — Coordinator and command boundary

1. **Task ID:** `RPL-5.1`
2. **Phase:** 5 — Central coordinator and task allocation
3. **Purpose:** Implement the single application use-case boundary before adapters or controllers can make authoritative changes.
4. **Implementation approach:** Implement a dependency-injected Coordinator that validates actor, command, correlation, and idempotency before delegating to accepted service ports; it returns safe envelopes and emits only post-commit events.
5. **Preconditions:** `RPL-1.2`, `RPL-1.3`, `RPL-3.1`, and `RPL-4.1` accepted; public interfaces frozen.
6. **Exact files to create:** `src/core/Coordinator.js`, `src/core/ActorPolicy.js`, `src/core/CommandSchema.js`, `tests/unit/coordinator.test.js`, `tests/security/coordinator-authorization.test.js`.
7. **Exact files permitted to modify:** `src/core/Coordinator.js`, `src/core/ActorPolicy.js`, `src/core/CommandSchema.js`, `src/core/EventBus.js`, and the tests created by this task. It is composed later by `RPL-11.1`.
8. **Files that must not be modified:** `src/bootstrap.js`, `src/persistence/**`, `src/observability/**`, `src/shared/**`, `src/tasks/**`, `src/inventory/**`, `src/bots/**`, `src/ai/**`, `src/chat/**`, `src/discord/**`, `src/dashboard/**`, `package.json`, `package-lock.json`.
9. **Public interfaces:** Exactly `startSwarm`, `stopSwarm`, `submitTask`, `cancelTask`, `setProvider`, `setChatMode`, `sendManualChat`, `getStatus`, `getBotStatus`, `handleControllerEvent` from `MODULE_INTERFACES.md`.
10. **Data contracts:** Closed `ActorV1`, `CommandResultV1`, correlation ID, idempotency key, and redacted status DTO. Controller events include bot/controller/lease/epoch fences.
11. **Required dependencies:** Existing modules only; no adapter SDK.
12. **Error handling:** Authorisation/schema/dependency/persistence failures return `DomainError`; raw provider/Mineflayer errors never cross this boundary; duplicate idempotency key returns prior safe outcome.
13. **Security constraints:** Actor source is `system|discord|dashboard`, not Minecraft chat. Coordinator does not trust supplied roles, direct DB SQL, raw provider proposal, arbitrary method name, or boolean session assertion.
14. **Resource constraints:** Bounded event handling and command queue; no blocking long action in command handler; post-commit events only.
15. **Unit tests:** Every use case authorization path, input closure, idempotency, safe error envelope, dependency delegation, stale controller event rejection.
16. **Integration tests:** Fake StateStore/registry/task/provider/chat implementations prove only Coordinator reaches mutating services and post-commit event order.
17. **Acceptance criteria:** No external adapter needs direct database/bot/task access; denied command makes zero state mutation; status is redacted and bounded.
18. **Expected deliverables:** Coordinator boundary/tests, public method documentation, dependency-injection map, and review request.

---

## RPL-5.2 — Task graph, leases, aggregate ledger, and scheduler

1. **Task ID:** `RPL-5.2`
2. **Phase:** 5 — Central coordinator and task allocation
3. **Purpose:** Implement the only durable task/assignment/lease/aggregate-progress authority and deterministic allocation scheduler.
4. **Implementation approach:** Implement task graph, leases, ledger, claims, and allocation as short StateStore transactions; fence old epochs before replacement and calculate every quota from aggregate verified/reserved totals.
5. **Preconditions:** `RPL-1.2`, `RPL-3.1`, and `RPL-5.1` accepted; StateStore schema extension accepted by integrator; no destructive skill is enabled.
6. **Exact files to create:** `src/tasks/TaskManager.js`, `src/tasks/ObjectiveGraph.js`, `src/tasks/TaskLedger.js`, `src/tasks/TaskAllocator.js`, `src/tasks/TaskScheduler.js`, `tests/unit/task-manager.test.js`, `tests/unit/task-ledger.test.js`, `tests/unit/task-allocator.test.js`, `tests/integration/task-lease-restart.test.js`.
7. **Exact files permitted to modify:** `src/tasks/TaskManager.js`, `src/tasks/ObjectiveGraph.js`, `src/tasks/TaskLedger.js`, `src/tasks/TaskAllocator.js`, `src/tasks/TaskScheduler.js`, and the tests created by this task. The existing `StateStore` schema/API and `Coordinator` injection interface are consumed as accepted contracts, not rewritten here.
8. **Files that must not be modified:** `migrations/**`, `src/persistence/**`, `src/core/**`, `src/inventory/**`, `src/bots/**`, `src/survival/**`, `src/ai/**`, adapters/dashboard files, package/lock files.
9. **Public interfaces:** Task/ledger/allocator methods exactly in `MODULE_INTERFACES.md`; scheduler accepts eligible snapshots and emits allocation decisions but never issues controller commands directly.
10. **Data contracts:** `TaskV1`, `ObjectiveV1`, `AssignmentLeaseV1`, `LedgerEntryV1`, `AllocationDecisionV1`, `Block/Entity/ContainerClaimV1`; each has IDs, version/epoch, timestamps, closed fields, idempotency identity, and bounded explanation.
11. **Required dependencies:** Existing StateStore and core only; no new package.
12. **Error handling:** Cycles, missing dependency, invalid capability, stale/cancelled/expired lease, duplicate/out-of-order event, failed transaction, and quota overrun reject safely and preserve audit. Restart fences old leases before reuse.
13. **Security constraints:** AI may propose only validated plans; controllers cannot self-credit/self-assign; no direct SQL from allocator; cancellation requires authorised Coordinator command and never deletes audit evidence.
14. **Resource constraints:** Short serialized transactions; bounded objective graph/evidence/claim sets; deterministic allocator; prefer one participant unless measured-benefit rationale supports more.
15. **Unit tests:** 10,000 allocation fuzz cases; cycle/dependency/capability validation; quota invariant; stale/duplicate/cancel/expiry fencing; disjoint spatial/item/container claims; idempotency.
16. **Integration tests:** Transaction crash/reopen, active task restart, all-five-same-assignment attempt, two same-quota attempts, controller disconnect, and cancel while evidence arrives.
17. **Acceptance criteria:** `verified + activeReserved <= target` always; no duplicate assignment/credit; all global writes originate in one transaction path; scheduler decisions are explainable and do not automatically select five bots.
18. **Expected deliverables:** Task/ledger/scheduler modules, migration review, fuzz result artifact, restart/lease traces, and review request.

---

## RPL-5.3 — Inventory snapshot verification and reconciliation

1. **Task ID:** `RPL-5.3`
2. **Phase:** 5 — Central coordinator and task allocation
3. **Purpose:** Verify inventory/task progress independently of controller claims and prevent double-counted resources.
4. **Implementation approach:** Validate controller evidence against canonical item IDs, active lease fences, and bounded before/after observations, then call the TaskManager verification port for one idempotent credit-or-dispute outcome.
5. **Preconditions:** `RPL-2.3` and `RPL-5.2` accepted; ItemRegistry version matches controller tuple.
6. **Exact files to create:** `src/inventory/InventorySnapshot.js`, `src/inventory/InventoryVerifier.js`, `src/inventory/EvidencePolicy.js`, `tests/unit/inventory-snapshot.test.js`, `tests/unit/inventory-verifier.test.js`, `tests/integration/inventory-reconciliation.test.js`.
7. **Exact files permitted to modify:** `src/inventory/InventorySnapshot.js`, `src/inventory/InventoryVerifier.js`, `src/inventory/EvidencePolicy.js`, and the tests created by this task. It implements the verifier interface accepted in `RPL-5.2`; composition supplies it later.
8. **Files that must not be modified:** `src/tasks/**`, `src/bots/**`, `src/survival/**`, `src/ai/**`, `src/chat/**`, `src/discord/**`, `src/dashboard/**`, `src/persistence/**`, migrations, package/lock files.
9. **Public interfaces:** `captureBaseline`, `validateSnapshot`, `verifyEvidence`, `verifyTransfer`, `summarise` exactly as in Module Interfaces.
10. **Data contracts:** Closed snapshot/evidence records with bot/controller generation, assignment/lease/epoch, sequence, item canonical ID, before/after counts, source/destination, action kind, evidence ID, completeness, and observation times.
11. **Required dependencies:** Existing ItemRegistry/TaskManager/StateStore only.
12. **Error handling:** Missing/partial/stale snapshot, item mismatch, invalid delta, duplicate evidence, transfer conservation failure, full inventory, or expired lease yields dispute/no credit—not optimistic retry.
13. **Security constraints:** Controller-submitted snapshots/evidence are untrusted; no raw NBT/packet data persisted by default; no user-controlled item ID reaches game APIs without registry validation.
14. **Resource constraints:** Bounded item lists/evidence payloads/retention; compare only task-relevant items; no whole-world or unbounded history scan.
15. **Unit tests:** Existing stock, unrelated item, pickup/drop, full inventory, crafted output/ingredient, deposit/retrieve, two-bot transfer, stale and duplicate evidence.
16. **Integration tests:** Controller fake events plus TaskManager transaction prove one verified credit maximum; crash/restart reconciliation preserves committed facts only.
17. **Acceptance criteria:** Arrival/action acknowledgement alone never credits an objective; transfers conserve counts; pre-existing stock policy is enforced; each evidence ID is idempotent.
18. **Expected deliverables:** Inventory modules/tests, evidence-policy matrix, reconciliation artifact, and review request.

---

## RPL-6.1 — Survival telemetry and hazard policy

1. **Task ID:** `RPL-6.1`
2. **Phase:** 6 — Survival, navigation and recovery
3. **Purpose:** Add conservative health/hunger/equipment/terrain threat evaluation and local safe-stop authority.
4. **Implementation approach:** Implement survival as a conservative pure policy over compact telemetry/hazards that emits directives; unknown or stale inputs increase risk and composition later supplies the directive to action execution.
5. **Preconditions:** `RPL-2.2`, `RPL-2.3`, `RPL-3.1`, and `RPL-5.1` accepted.
6. **Exact files to create:** `src/survival/SafetyController.js`, `src/survival/HazardScanner.js`, `src/survival/RouteRisk.js`, `src/survival/SafetyPolicy.js`, `tests/unit/safety-controller.test.js`, `tests/unit/hazard-scanner.test.js`.
7. **Exact files permitted to modify:** `src/survival/SafetyController.js`, `src/survival/HazardScanner.js`, `src/survival/RouteRisk.js`, `src/survival/SafetyPolicy.js`, and the tests created by this task. It implements the previously accepted local guard interface; `RPL-11.1` wires it into controller/action composition.
8. **Files that must not be modified:** `src/bots/**`, `src/tasks/**`, `src/inventory/**`, `src/core/**`, `src/ai/**`, `src/chat/**`, `src/discord/**`, `src/dashboard/**`, package/lock files.
9. **Public interfaces:** `SafetyController.evaluate/beforeAction/retreat/safeStop`; `HazardScanner.scanBounded/scoreRoute`; events from Module Interfaces.
10. **Data contracts:** `SafetyDirectiveV1`, `HazardObservationV1`, `SafeAnchorV1`, and compact vital/equipment/route-risk inputs; unknown/stale source data explicitly raises risk.
11. **Required dependencies:** Existing controller/action/snapshot modules; no new package.
12. **Error handling:** Missing/unknown sensor/world data returns conservative pause/retreat/safe-stop; action cancellation reports interruption and does not alter ledger/assignment itself.
13. **Security constraints:** No bypass of protected regions/PvP policy, no arbitrary combat target/method, no survival claim guarantee.
14. **Resource constraints:** Bounded scan radius/frequency/entity list; safety evaluation is small/fast; no provider call in movement tick.
15. **Unit tests:** Health/hunger/air/fire/effects, armour/tool/durability, hostile/lava/water/suffocation/fall/void, unknown terrain, no escape route, and action interruption.
16. **Integration tests:** Fake controller/action flow proves safety cancels work and Coordinator/TaskManager receives an interruption rather than a completion.
17. **Acceptance criteria:** Safety overrides throughput; unknown is never treated safe; no safety event credits work or spawns uncontrolled scans.
18. **Expected deliverables:** Survival policy/modules, hazard fixtures/results, action-interrupt trace, and review request.

---

## RPL-6.2 — Navigation scheduling and shared movement claims

1. **Task ID:** `RPL-6.2`
2. **Phase:** 6 — Survival, navigation and recovery
3. **Purpose:** Prevent conflicting movement/block/entity/container operations and bound pathfinding cost.
4. **Implementation approach:** Implement a lease-fenced claim registry and bounded navigation scheduler; allocate one compatible movement profile per action and release claims on cancellation, expiry, disconnect, or safe stop.
5. **Preconditions:** `RPL-3.1`, `RPL-5.2`, and `RPL-6.1` accepted; pathfinder dependency/version is already accepted in `RPL-2.1` if required.
6. **Exact files to create:** `src/navigation/NavigationScheduler.js`, `src/navigation/ClaimRegistry.js`, `src/navigation/MovementPolicy.js`, `tests/unit/navigation-scheduler.test.js`, `tests/unit/claim-registry.test.js`, `tests/integration/navigation-conflict.test.js`.
7. **Exact files permitted to modify:** `src/navigation/NavigationScheduler.js`, `src/navigation/ClaimRegistry.js`, `src/navigation/MovementPolicy.js`, and the tests created by this task. It implements the accepted navigation/claim service contract; `RPL-11.1` supplies it to controller/action/task composition.
8. **Files that must not be modified:** `src/bots/**`, `src/tasks/**`, `src/monitoring/**`, `src/inventory/**`, `src/ai/**`, `src/chat/**`, `src/discord/**`, `src/dashboard/**`, `src/persistence/**`, migrations, package/lock files.
9. **Public interfaces:** `NavigationScheduler.request/cancel/activeCount`; `ClaimRegistry.claim/release/expire`; `MovementPolicy.forAction`.
10. **Data contracts:** `NavigationRequestV1`, `ClaimV1`, `MovementProfileV1` and `NavigationStateV1` from runtime design, all lease/epoch/controller-generation fenced.
11. **Required dependencies:** Accepted pathfinder only if the reviewed tuple requires it; otherwise existing controller primitives.
12. **Error handling:** Stale lease, conflicting/expired claim, path timeout/stuck, protected region, pressure directive, or unsafe route rejects/cancels and returns observation—never success.
13. **Security constraints:** General movement cannot dig/tower/place; only typed approved substeps can alter blocks; claims cannot be forged from chat/provider/dashboard input.
14. **Resource constraints:** One active A* initially, configured tick/deadline budgets, bounded claims/regions, release on cancel/disconnect/lease expiry.
15. **Unit tests:** Claim exclusivity/expiry, action-specific movement policy, stale fence, path budget, cancellation, queue bound.
16. **Integration tests:** Two controller fakes request same block/item/death region; exactly one claim wins; disconnect releases/fences correctly; no concurrent pathfinder above cap.
17. **Acceptance criteria:** No two controllers receive conflicting live claim; non-mining travel cannot dig/tower; pathfinding cannot monopolize the event loop.
18. **Expected deliverables:** Navigation modules/tests, contention traces, path budget metrics, and review request.

---

## RPL-6.3 — Death records and evidence-only recovery

1. **Task ID:** `RPL-6.3`
2. **Phase:** 6 — Survival, navigation and recovery
3. **Purpose:** Persist death/checkpoint facts, make bounded recovery decisions, and prohibit fabricated recovery/completion claims.
4. **Implementation approach:** Record immutable death/checkpoint facts, evaluate a bounded recovery plan through safety/navigation ports, and accept `RECOVERED` only after observed item evidence plus reconciled inventory/container delta.
5. **Preconditions:** `RPL-5.2`, `RPL-5.3`, `RPL-6.1`, and `RPL-6.2` accepted.
6. **Exact files to create:** `src/survival/RecoveryManager.js`, `src/survival/DeathRecord.js`, `src/survival/RecoveryPolicy.js`, `tests/unit/recovery-manager.test.js`, `tests/integration/death-restart-recovery.test.js`, `tests/private-server/recovery-evidence.test.js`.
7. **Exact files permitted to modify:** `src/survival/RecoveryManager.js`, `src/survival/DeathRecord.js`, `src/survival/RecoveryPolicy.js`, and the tests created by this task. It implements accepted recovery/verification service interfaces; `RPL-11.1` wires collaborators.
8. **Files that must not be modified:** `src/bots/**`, `src/tasks/**`, `src/inventory/**`, `src/core/**`, `src/ai/**`, `src/chat/**`, `src/discord/**`, `src/dashboard/**`, `src/persistence/**`, migrations, package/lock files.
9. **Public interfaces:** `recordDeath/evaluateRecovery/startRecovery/verifyRecovery/abandonRecovery` and recovery events from Module Interfaces.
10. **Data contracts:** Closed `DeathRecordV1`, `RecoveryAttemptV1`, `RecoveryEvidenceV1`, `RecoveryStateV1`, including dimension/position known-or-unknown, source assignment fence, checkpoint, attempt cap, expiry, route/safety result, and verified outcome.
11. **Required dependencies:** Existing StateStore/TaskManager/InventoryVerifier/navigation/safety modules; no new package.
12. **Error handling:** Unknown/unreachable/high-risk/expired/no-item observation/repeated death/lease fence failure stops recovery safely and reports `PARTIAL`, `NOT_FOUND`, or `ABANDONED`.
13. **Security constraints:** No claim recovered from coordinate arrival, chat text, AI statement, or unverified inventory. No forbidden-region/unsafe-route bypass to collect items.
14. **Resource constraints:** One bounded recovery plan/attempt budget, bounded entity scan/route, no indefinite retry.
15. **Unit tests:** Death data completeness, attempt cap, stale source lease, despawn expiry, route risk, partial/lost state, recovery status transitions.
16. **Integration tests:** Simulated death during mining, restart with interrupted assignment, two bots competing for one drop, repeated recovery failure, verified pickup/container delta, private-server disposable death case when approved.
17. **Acceptance criteria:** Task reservation reconciles without false credit; only item observation plus verified delta can produce `RECOVERED`; repeated death cannot loop indefinitely.
18. **Expected deliverables:** Recovery modules/tests, redacted recovery trace, known loss/partial evidence, and review request.

---

## RPL-7.1 — Autonomous Minecraft chat manager

1. **Task ID:** `RPL-7.1`
2. **Phase:** 7 — Autonomous Minecraft chat
3. **Purpose:** Handle untrusted player chat conversationally with one selected responder, bounded context, and no privilege path.
4. **Implementation approach:** Treat inbound Minecraft text as untrusted data, select at most one responder deterministically, use bounded threads/cooldowns/queues, and route any generated text through the same validation and send policy.
5. **Preconditions:** `RPL-2.2`, `RPL-4.1`, `RPL-5.1`, and P1 bounded primitives accepted; OD-12 accepted for personas/language/proactive policy. Provider remains optional.
6. **Exact files to create:** `src/chat/ChatManager.js`, `src/chat/ConversationStore.js`, `src/chat/ResponseScheduler.js`, `src/chat/ChatPolicy.js`, `tests/unit/chat-manager.test.js`, `tests/security/chat-injection.test.js`, `tests/integration/chat-scheduler.test.js`.
7. **Exact files permitted to modify:** `src/chat/ChatManager.js`, `src/chat/ConversationStore.js`, `src/chat/ResponseScheduler.js`, `src/chat/ChatPolicy.js`, and the tests created by this task. It consumes accepted controller/provider/Coordinator ports; `RPL-11.1` wires them.
8. **Files that must not be modified:** `src/core/**`, `src/bots/**`, `src/ai/**`, `src/config/**`, `src/tasks/**`, `src/inventory/**`, `src/survival/**`, `src/discord/**`, `src/dashboard/**`, package/lock files.
9. **Public interfaces:** `ingestMinecraftChat/selectResponder/requestResponse/enqueueSend/setMode`; controller emits typed `chat_received`/`chat_sent`, never grants player command authority.
10. **Data contracts:** `MinecraftChatEventV1`, bounded `ConversationThreadV1`, `ChatDecisionV1`, `OutboundChatV1`; text/identity/sender/bot sequence/timestamps are bounded and redacted per retention policy.
11. **Required dependencies:** Existing provider abstraction and controller only; no external chat package.
12. **Error handling:** Invalid/self/stale/overlength/cooldown/queue-pressure/injection/provider failure yields suppression or deterministic safe reply; no exception reaches bot transport.
13. **Security constraints:** Player chat cannot invoke Coordinator task/provider/config/stop actions; self-message filtering uses actual controller identity/generation; replies cannot reveal secrets/private status/raw provider output.
14. **Resource constraints:** One normal responder, global/per-bot cooldowns, thread TTL/max turns/max threads, bounded outbound queue and visible character cap; proactive off by default.
15. **Unit tests:** Mention/question routing, one-responder selection, self filter, cooldown, queue expiry, context bound, control-character removal, injection corpus, no secret/internal disclosure.
16. **Integration tests:** Five bot fake inbound event, selected one send, provider unavailable fallback, manual stop/pressure suppression, repeated disconnect listener cleanup.
17. **Acceptance criteria:** A player cannot obtain privileged action through chat; no all-five reply; no bot replies to itself; every send passes ChatPolicy/queue.
18. **Expected deliverables:** Chat modules/tests, sanitized corpus result, chat resource counters, and review request.

---

## RPL-8.1 — Discord SDK dependency adoption

1. **Task ID:** `RPL-8.1`
2. **Phase:** 8 — Discord integration
3. **Purpose:** Select, lock, and audit the exact Discord SDK before adapter code is created.
4. **Implementation approach:** Review and lock the Discord SDK without logging in or starting a gateway, then prove its exact export/version/lockfile evidence in a clean installation.
5. **Preconditions:** OD-09 accepted; `RPL-5.1` accepted; integrator has reviewed current Node 22 compatibility, license, package scripts, and security advisories.
6. **Exact files to create:** `tools/discord/assertDiscordSdk.js`, `tests/contract/discord-sdk-contract.test.js`.
7. **Exact files permitted to modify:** `package.json`, `package-lock.json`, `DEVELOPMENT_STATUS.md`.
8. **Files that must not be modified:** All `src/**`, `config/**`, `docs/DECISIONS.md`, dashboard/chat/task/persistence files.
9. **Public interfaces:** `assertDiscordSdk()` CLI only; no gateway client or command handler.
10. **Data contracts:** `DiscordSdkEvidenceV1 = { package, version, lockfileHash, nodeVersion, license, auditSummary }`.
11. **Required dependencies:** One exact reviewed Discord SDK version; token is not needed and must not be supplied to this task.
12. **Error handling:** Node incompatibility, audit finding requiring review, missing lock integrity, or unaccepted license blocks `RPL-8.2`.
13. **Security constraints:** `npm ci --ignore-scripts` validation; no Discord login/token/network call; no token in test fixture/log.
14. **Resource constraints:** Dependency review only; no listener/client creation.
15. **Unit tests:** Version/lockfile evidence parser and package export fixture.
16. **Integration tests:** Clean locked install plus static export assertion; no Discord API access.
17. **Acceptance criteria:** Exact package is locked/reviewed and clean install passes; no adapter code is introduced.
18. **Expected deliverables:** Manifest/lock diff, audit evidence, test output, and review request.

---

## RPL-8.2 — Authenticated Discord adapter

1. **Task ID:** `RPL-8.2`
2. **Phase:** 8 — Discord integration
3. **Purpose:** Add a proper Discord slash-command adapter that authenticates immutable user IDs and invokes only Coordinator use cases.
4. **Implementation approach:** Build a thin interaction adapter: verify immutable user/guild identity and closed options, construct an Actor/correlation record, call exactly one Coordinator use case, and format only safe responses.
5. **Preconditions:** `RPL-5.1`, `RPL-5.2`, `RPL-7.1`, and `RPL-8.1` accepted; OD-09 accepted; `/botstatus` disposition recorded in `docs/DECISIONS.md` (retain alias or explicit retirement).
6. **Exact files to create:** `src/discord/DiscordAdapter.js`, `src/discord/DiscordCommandSchema.js`, `tests/security/discord-authorization.test.js`, `tests/integration/discord-adapter.test.js`, `tests/contract/discord-command-contract.test.js`.
7. **Exact files permitted to modify:** `src/discord/DiscordAdapter.js`, `src/discord/DiscordCommandSchema.js`, and the tests created by this task. It consumes the accepted Coordinator/Config contracts without rewriting them.
8. **Files that must not be modified:** `package.json`, `package-lock.json`, `src/core/**`, `src/config/**`, `src/persistence/**`, migrations, `src/tasks/**`, `src/inventory/**`, `src/bots/**`, `src/ai/**`, `src/chat/**`, `src/dashboard/**`, `docs/DECISIONS.md`.
9. **Public interfaces:** `DiscordAdapter.start/stop/registerCommands/handleInteraction`; required commands `/status`, `/bots`, `/bot`, `/task`, `/cancel`, `/stop`, `/say`, `/sayall`, `/provider`, `/chatmode`, `/help`, plus `/botstatus` only if the recorded compatibility decision retains it.
10. **Data contracts:** `DiscordInteractionV1 = { interactionId, userId, guildId, command, options, receivedAt }`; `ActorV1` with numeric user ID; closed option schema and idempotency/replay identity.
11. **Required dependencies:** Exact reviewed Discord SDK version selected by `AXIOM-INTEGRATOR`; token only in environment secret storage.
12. **Error handling:** Signature/SDK validation failure, non-allowlisted user, wrong guild, malformed/replayed/rate-limited interaction, Coordinator denial, and transient gateway fault return safe denial/status and no mutation. `/cancel` fences leases through TaskManager.
13. **Security constraints:** Numeric immutable IDs only; no username authorization; no token/raw error/provider/chat log in response; adapter never calls StateStore/Mineflayer directly; command registration restricted to development guild until approved.
14. **Resource constraints:** Bounded interaction queue/rate limits; defer/reply deadlines handled once; no duplicate handlers on reconnect; `/sayall` enters ChatManager throttles.
15. **Unit tests:** Every command option schema, authorization denial, malformed/replay/rate-limit input, `/botstatus` disposition, safe response redaction.
16. **Integration tests:** Fake Discord client proves ID allowlist before Coordinator, one Coordinator call per accepted interaction, cancel epoch fence, sayall throttle, adapter start/stop cleanup.
17. **Acceptance criteria:** Unauthorised `/sayall` causes zero chat/state action; every privileged command has audit actor/correlation ID; Discord reconnect leaves no duplicated listener/command invocation.
18. **Expected deliverables:** Adapter/command contracts, SDK/lock review, test matrix, development-guild registration evidence, and review request.

---

## RPL-9.1 — Persistence operations and dashboard session schema

1. **Task ID:** `RPL-9.1`
2. **Phase:** 9 — Dashboard and SQLite persistence
3. **Purpose:** Complete production persistence operations—retention, verified backup/restore, audit queries, and dashboard session persistence—without creating a parallel store.
4. **Implementation approach:** Extend the existing StateStore operational services with bounded retention, verified backups, redacted audit records, and durable opaque session records; never create a second database or store raw credentials.
5. **Preconditions:** `RPL-1.2` accepted; `RPL-5.2` accepted for task/audit schema; OD-10 and OD-11 accepted for dashboard/retention policy.
6. **Exact files to create:** `src/persistence/BackupService.js`, `src/persistence/RetentionService.js`, `src/observability/AuditLog.js`, `tests/integration/persistence-operations.test.js`, `tests/security/audit-log-redaction.test.js`.
7. **Exact files permitted to modify:** `src/persistence/StateStore.js`, `src/persistence/Migrator.js`, `src/persistence/RetentionPolicy.js`, and the tests created by this task. It uses the bounded dashboard-session table reserved in the P1 initial schema; no second database or migration rewrite is introduced.
8. **Files that must not be modified:** `src/bootstrap.js`, `src/core/**`, `src/config/**`, migrations, `src/bots/**`, `src/tasks/**`, `src/inventory/**`, `src/survival/**`, `src/ai/**`, `src/chat/**`, `src/discord/**`, dashboard HTTP/UI files, package/lock files.
9. **Public interfaces:** `BackupService.create/verify/restorePlan`; `RetentionService.run`; `AuditLog.record/queryBounded`; StateStore session transaction helpers are private to persistence/dashboard contracts.
10. **Data contracts:** Closed `DashboardSessionRecordV1`, `AuditEventV1`, `BackupManifestV1`, `RetentionRunV1`; session contains opaque ID/hash, actor/role, expiry/rotation/revocation, CSRF secret hash—not raw password/session token.
11. **Required dependencies:** Existing `node:sqlite` StateStore and Node crypto; no second database/cache service.
12. **Error handling:** Backup/restore/retention/audit I/O failure enters safe mode for privileged mutation where required; expired/revoked session rejected; retain evidence of failed job.
13. **Security constraints:** Parameterized SQL, private backup location/mode, bounded audit queries, redaction before persistence/query, password never stored, rotate/revoke sessions safely.
14. **Resource constraints:** Batched retention/checkpoint work, bounded backup size/age, no full audit export in memory, serialized writes.
15. **Unit tests:** Retention cutoff, audit field redaction, session expiry/rotation/revocation, backup manifest integrity, restore-plan validation.
16. **Integration tests:** Backup/reopen/verify, interrupted retention, audit query bounds, migration idempotency, session persistence after restart.
17. **Acceptance criteria:** Dashboard later has a single durable session/audit source; task/ledger data remains untouched by retention; no raw secret appears in DB/backup/query result.
18. **Expected deliverables:** Migration/services/tests, backup/restore evidence, retention report, and review request.

---

## RPL-9.2 — Loopback-first authenticated operations dashboard

1. **Task ID:** `RPL-9.2`
2. **Phase:** 9 — Dashboard and SQLite persistence
3. **Purpose:** Implement the basic modern five-bot dashboard exactly within the authenticated, Coordinator-only boundary.
4. **Implementation approach:** Build a loopback-first server/UI over accepted Coordinator and persistence ports, derive one redacted compact snapshot, enforce authentication/RBAC/CSRF/origin checks before mutation, and bound SSE delivery.
5. **Preconditions:** `RPL-5.1`, `RPL-5.3`, `RPL-6.3`, `RPL-7.1`, `RPL-9.1` accepted; OD-10 accepted. Dashboard stays disabled until all acceptance tests pass.
6. **Exact files to create:** `src/dashboard/DashboardServer.js`, `src/dashboard/DashboardAuth.js`, `src/dashboard/DashboardSnapshot.js`, `src/dashboard/SseStream.js`, `src/dashboard/public/index.html`, `src/dashboard/public/app.js`, `src/dashboard/public/styles.css`, `tests/security/dashboard-auth.test.js`, `tests/integration/dashboard-server.test.js`, `tests/contract/dashboard-snapshot.test.js`.
7. **Exact files permitted to modify:** `src/dashboard/DashboardServer.js`, `src/dashboard/DashboardAuth.js`, `src/dashboard/DashboardSnapshot.js`, `src/dashboard/SseStream.js`, `src/dashboard/public/index.html`, `src/dashboard/public/app.js`, `src/dashboard/public/styles.css`, and the tests created by this task. It consumes accepted Coordinator/persistence/redaction ports; `RPL-11.1` wires them.
8. **Files that must not be modified:** `src/bootstrap.js`, `src/core/**`, `src/config/**`, `src/observability/**`, `src/persistence/**`, `src/tasks/**`, `src/inventory/**`, `src/bots/**`, `src/survival/**`, `src/ai/**`, `src/chat/**`, `src/discord/**`, package/lock files.
9. **Public interfaces:** `DashboardServer.start/stop/authenticate/snapshot/stream`; routes and RBAC exactly in `DASHBOARD_DESIGN.md`; no additional control route without contract review.
10. **Data contracts:** `DashboardSnapshotV1`, redacted five `BotRuntimeSnapshotV1` cards, task/ledger summary, provider state, process-shared resource state, bounded events, session/CSRF request envelopes.
11. **Required dependencies:** Node built-in HTTP/crypto only unless `AXIOM-INTEGRATOR` accepts a reviewed minimal dependency; no CDN, analytics, browser provider SDK, or public tunnel.
12. **Error handling:** Unknown/malformed/oversized/unauthenticated/forbidden/CSRF/origin/rate-limit/slow-SSE requests receive safe status; no existence leakage; server stop disposes listeners/sessions safely.
13. **Security constraints:** Default loopback bind; strong environment secret/hash validation; opaque rotating HttpOnly/SameSite session; origin/host/CSRF checks; role checks; CSP/security headers; no direct StateStore/Mineflayer/provider route; redact host/path/token/chat/raw errors.
14. **Resource constraints:** ≤64 KiB compact snapshot target, coalesced ≤1 Hz normal SSE, bounded clients/replay/bytes, disconnect slow clients, no unbounded DOM/event history.
15. **Unit tests:** Password/session/rotation/revoke, cookie/header/CSRF/origin, request schema, snapshot redaction/unknown display, event coalescing/backpressure.
16. **Integration tests:** Loopback login/logout, viewer/operator RBAC, every control causes exactly one Coordinator use case, slow SSE client, pressure reduction, restart session behavior, five independent bot cards.
17. **Acceptance criteria:** Dashboard displays all required state without inventing unknown telemetry; unauthenticated and cross-origin mutations fail; controls cannot bypass Coordinator or policy; listener binds only approved host.
18. **Expected deliverables:** Dashboard/UI/tests, route/RBAC matrix, security test output, screenshots from local fixture only, and review request.

---

## RPL-10.1 — Performance, capacity, and reliability qualification

1. **Task ID:** `RPL-10.1`
2. **Phase:** 10 — Performance and security hardening
3. **Purpose:** Execute and preserve real device/server/provider reliability evidence rather than treating configuration limits as measurements.
4. **Implementation approach:** Use isolated benchmark harnesses and result manifests to measure real devices and private-server scenarios, label unavailable metrics/failures honestly, and keep calibration decisions outside production behavior changes.
5. **Preconditions:** Relevant modules accepted; OD-03/OD-06/OD-07 accepted; private compatible server and Chromebook/Android access available. No target Aternos load test.
6. **Exact files to create:** `benchmarks/chromebook/run-ollama-stages.js`, `benchmarks/termux/run-pressure-drill.js`, `benchmarks/shared/result-manifest-schema.json`, `tests/performance/leak-and-bounds.test.js`, `tests/performance/restart-soak.test.js`.
7. **Exact files permitted to modify:** `docs/spec/PERFORMANCE_PLAN.md` result appendix only, `docs/spec/ACCEPTANCE_CRITERIA.md` calibration appendix only, `DEVELOPMENT_STATUS.md`.
8. **Files that must not be modified:** All production `src/**`, package/lock, task/lease policy, configuration safety defaults.
9. **Public interfaces:** Benchmark CLIs emit `ResultManifestV1`; no production command/API.
10. **Data contracts:** Manifest requires hardware/software/model/server/config hashes, classification (`MEASURED|SIMULATED|ESTIMATED`), raw path, metric availability, scenario, thresholds, result, and failure reason.
11. **Required dependencies:** Existing runtime/device tools only; any benchmark helper dependency needs separate integrator review.
12. **Error handling:** Device/tool/metric/server failure produces retained `inconclusive`/`failed` result; stop safely on pressure/OOM/thermal; never fill missing data with zero.
13. **Security constraints:** Sanitize artifacts; no API/Discord/Minecraft credentials, raw chat, private host, or unrestricted world data; private server only.
14. **Resource constraints:** Three runs per stage after warmup; staged 0/1/2/3/5 cap; C-0..C-4 concurrent Linux workload; bounded disk retention.
15. **Unit tests:** Manifest schema, redaction, metric unavailable reason, stage ordering, threshold comparison, artifact path limits.
16. **Integration tests:** Device T-0/T-1/T-2/T-3/T-5 only after predecessor acceptance; C-0..C-4; long-running/reconnect/pressure/restart cycles.
17. **Acceptance criteria:** Maximum safe cap is evidence-based and may be <5; model may remain disabled; no accepted stage has unreconciled ledger/safety/checkpoint leak or sustained critical pressure.
18. **Expected deliverables:** Raw results, calibrated thresholds, max-cap statement, leak/soak report, failures, and review request.

---

## RPL-10.2 — Security adversarial test and correction gate

1. **Task ID:** `RPL-10.2`
2. **Phase:** 10 — Performance and security hardening
3. **Purpose:** Independently exercise attack/failure boundaries and return defects to the owning task owner instead of making cross-module security edits.
4. **Implementation approach:** Exercise closed validators and fake/private transports with adversarial fixtures, record reproducible findings, and return production defects to the exclusive module owner rather than applying cross-module fixes here.
5. **Preconditions:** All relevant adapters/services implemented and accepted through Phase 9; CI available.
6. **Exact files to create:** `tests/security/adversarial-swarm.test.js`, `tests/security/endpoint-abuse.test.js`, `tests/security/secret-scanner.test.js`, `tools/security/scan-forbidden-capabilities.sh`, `docs/evidence/SECURITY_TEST_MATRIX.md`.
7. **Exact files permitted to modify:** `docs/spec/TEST_PLAN.md` result appendix only, `DEVELOPMENT_STATUS.md`.
8. **Files that must not be modified:** All production `src/**`, package/lock, migrations, configuration. A detected defect is assigned back to its owning module task as a corrective task.
9. **Public interfaces:** Test harness only; no production interface change.
10. **Data contracts:** `SecurityFindingV1 = { id, severity, location, reproduction, expected, actual, evidencePath, ownerTask, status }`; secret scanner reports paths/rule IDs, not secret values.
11. **Required dependencies:** Node built-in test/assert, existing test doubles, shell/Git tools; no offensive scanning service.
12. **Error handling:** A failed security test records a finding and blocks P11; scanner false-positive rule changes require reviewer approval and a regression fixture.
13. **Security constraints:** Exercise prompt injection, unauthorised Discord/dashboard actions, CSRF/origin, stale lease, provider abuse, secret leakage, arbitrary method/code attempts, offline-mode misuse, and Aternos reconnect policy without attacking external services.
14. **Resource constraints:** Bounded fuzz/corpus size, fake transports only for adversarial provider/Discord/dashboard tests, no denial-of-service against real targets.
15. **Unit tests:** Closed schema/validator/property fixtures, scanner fixtures, redaction false-positive/negative fixtures.
16. **Integration tests:** All 17 adversarial scenarios from the independent review using fake/private fixtures: duplicate task/quota/recovery, death/disconnect/restart, provider outage/switch, injection, unauthorised sayall, reply storm/self-message, memory pressure, and server shutdown.
17. **Acceptance criteria:** No critical/high unresolved security finding; every unauthorised action has zero mutation; no secret reaches logs/API/SSE/Discord/provider context; no AI output executes code/method/packet.
18. **Expected deliverables:** Security matrix, test output, finding list with owner task IDs, scanner output, and review request.

---

## RPL-11.1 — Integrator composition and release evidence assembly

1. **Task ID:** `RPL-11.1`
2. **Phase:** 11 — Full integration and release acceptance
3. **Purpose:** Compose accepted modules into one reproducible application without introducing new domain behavior.
4. **Implementation approach:** Compose only accepted ports into one singleton dependency graph, keep blocked integrations disabled, implement ordered start/stop/health behavior, and verify start-stop cycles without adding new domain logic.
5. **Preconditions:** Every dependent implementation task accepted; all required owner decisions/evidence gates closed or feature-disabled; no unresolved critical/high finding.
6. **Exact files to create:** `src/composition/createApplication.js`, `src/composition/dependencyGraph.js`, `src/lifecycle/ShutdownManager.js`, `docs/evidence/RELEASE_EVIDENCE_MANIFEST.md`, `tests/integration/application-lifecycle.test.js`.
7. **Exact files permitted to modify:** `package.json`, `package-lock.json`, `src/bootstrap.js`, migration ordering files, shared export barrel files, `README.md`, `DEVELOPMENT_STATUS.md`.
8. **Files that must not be modified:** Domain-module internals under `src/bots/**`, `src/tasks/**`, `src/inventory/**`, `src/survival/**`, `src/ai/**`, `src/chat/**`, `src/discord/**`, `src/dashboard/**`, `src/persistence/**` except accepted conflict-resolution patch with owner/reviewer sign-off.
9. **Public interfaces:** Application `start/stop/health`; dependency graph exposes no raw service instance outside integration composition.
10. **Data contracts:** `ApplicationHealthV1`, `ReleaseEvidenceManifestV1`, graceful-shutdown report with enabled/disabled features, config hash, component health, unresolved risks, and redacted artifact links.
11. **Required dependencies:** Only accepted locked dependencies; run license/audit review; no new package without a dedicated accepted task/change request.
12. **Error handling:** Startup dependency/config/migration failure stops before listener/client creation; shutdown order stops intake, pauses/checkpoints, flushes transaction queue, closes adapters/providers/clients, and reports deadline expiry without false completion.
13. **Security constraints:** Safe feature flags default off; composition never passes raw secrets to logs/UI; only approved adapters receive required secret handles; no public listener by default.
14. **Resource constraints:** One process, bounded shutdown deadline, ordered disposal, no duplicate singleton/coordinator/store, no leaked timers/listeners after start/stop cycles.
15. **Unit tests:** Dependency graph singleton/ordering, disabled feature behavior, shutdown-order fixtures, health redaction.
16. **Integration tests:** Configured disabled start/stop, accepted private test profile lifecycle, adapter/provider fake lifecycle, restart with tasks, safe shutdown deadline, zero listener/timer leak.
17. **Acceptance criteria:** Application has a documented start/stop/health path; exactly one Coordinator/TaskManager/StateStore exists; all release evidence links resolve; feature flags cannot activate blocked integrations.
18. **Expected deliverables:** Composition/lifecycle code, exact lockfile, full test matrix summary, release evidence manifest, known-disabled feature list, and review request.

---

## RPL-11.2 — Independent release acceptance submission

1. **Task ID:** `RPL-11.2`
2. **Phase:** 11 — Full integration and release acceptance
3. **Purpose:** Supply a complete, falsifiable evidence package for the independent certification authority. This is a Replit evidence/submission task, not self-approval.
4. **Implementation approach:** Collect immutable commit/lock/config hashes and retained raw evidence into a redacted index, explicitly label gaps or contradictions, and submit it to independent review without choosing its own verdict.
5. **Preconditions:** `RPL-11.1` accepted; all mandated evidence artifacts retained; target operational smoke only after prior gates and owner session.
6. **Exact files to create:** `docs/evidence/RELEASE_SUBMISSION.md`, `docs/evidence/KNOWN_LIMITATIONS.md`, `docs/evidence/TEST_RESULT_INDEX.md`.
7. **Exact files permitted to modify:** `DEVELOPMENT_STATUS.md`, `docs/DECISIONS.md` evidence references only.
8. **Files that must not be modified:** All `src/**`, `tests/**`, package/lock, migrations, architecture/specification contracts, previous independent review reports.
9. **Public interfaces:** None.
10. **Data contracts:** `ReleaseSubmissionV1 = { commit, lockfileHash, configHash, ownerDecisionRefs, compatibilityReport, capacityReport, providerReports, securityMatrix, persistenceRecoveryReport, testIndex, knownLimitations, disabledFeatures }`.
11. **Required dependencies:** None beyond retained prior artifacts.
12. **Error handling:** Missing, altered, unverifiable, or contradictory evidence is explicitly `MISSING`/`INCONCLUSIVE` and blocks certification; never replace with a narrative claim.
13. **Security constraints:** Evidence is redacted; no credentials, raw chat, private network address, session token, or player-identifying data. Target operational evidence uses legitimate operator session only.
14. **Resource constraints:** No new load/benchmark run beyond accepted plans; package/index stays bounded and links raw artifacts outside Git when large.
15. **Unit tests:** Markdown/link/schema validation for submission index and manifest references.
16. **Integration tests:** None created by this task; it indexes executed tests and their raw evidence without relabelling simulations as measurements.
17. **Acceptance criteria:** The independent reviewer can reproduce every conclusion from commit/lock/config hashes and retained evidence; all known limitations/disabled features are explicit; submission asks for `PASS`, `CONDITIONAL PASS`, or `FAIL` without presuming an outcome.
18. **Expected deliverables:** Release submission package, Replit completion message with required fields, and formal request for independent audit.

## 4. Reviewer gate after every phase

After a phase submission, the independent reviewer returns only evidence-based findings:

1. **Confirmed findings** — observed defect or verified acceptance result, with exact commit/file/test evidence.
2. **Required corrections** — owner task ID, severity, expected regression test, and whether the next phase is blocked.
3. **Accepted changes** — exact scope accepted; this is not a blanket release approval.
4. **Unresolved questions** — owner decision, device access, compatibility, or evidence gap that prevents a conclusion.

No implementation phase is accepted merely because it compiles, has a green local unit test, or has polished documentation. Any target-server, device, provider, or payment claim remains `UNKNOWN` until retained evidence for the named environment is reviewed.
