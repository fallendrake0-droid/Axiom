# AXIOM — Staged Implementation Roadmap and Replit Task Packets

## 1. Governance

**Integration owner:** `AXIOM-INTEGRATOR`. Only this owner edits `package.json`, `package-lock.json`, `src/bootstrap.js`, `src/composition/createApplication.js`, migration ordering, shared export barrel files, and release evidence. Specialists own only files named in their packet. Interface additions require an accepted contract change plus consumer tests before integration.

All task packets inherit: CommonJS/async; closed DTO validation; `DomainError`; structured redaction; no secrets; no direct AI execution; no direct adapter-to-database/bot invocation; bounded queues/listeners/timers; and test evidence before handoff. The field-by-field, copyable Replit assignments are in `REPLIT_IMPLEMENTATION_TASKS.md`; that document decomposes this roadmap without changing the authority, module contracts, or integration ownership defined here.

## 2. Phase sequence

| Phase | Outcome | Entry / exit gate |
|---|---|---|
| P0 | Accepted architecture and compatibility decision | G-01 |
| P1 | Config/core/persistence/test foundation, zero live bot | G-03, G-08 partial |
| P2 | Exact-version compatibility and one controller | G-02 |
| P3 | Five logical controllers with adaptive cap | G-04, G-09 |
| P4 | Coordinator/tasks/inventory/provider core | G-03..G-05 |
| P5 | Allocation, roles, deterministic work skills | G-04 |
| P6 | Survival/death/recovery | G-08 |
| P7 | Natural chat/Discord | G-05, G-07 |
| P8 | Dashboard/persistence operations | G-07, G-08 |
| P9 | Device performance/security/reliability qualification | G-09, G-10 |
| P10 | Target readiness/release review | all gates |

## 3. Task packets

### P0-T1 — Specification acceptance

- **Owner/files:** Architect; `docs/spec/*`, `AGENTS.md`, `DEVELOPMENT_STATUS.md`, `docs/DECISIONS.md` only.
- **Objective / inputs / outputs:** reconcile owner feedback against master context; output accepted version, resolved decision table, and traceable diffs.
- **Public methods/events/data:** none; decision rows must contain ID, owner, date, evidence, and effect.
- **Errors/security/performance:** reject contradictions; do not turn an unknown into a pass; no device/server contact.
- **Tests/acceptance:** `git diff --check`; G-01 owner acceptance.

### P0-T2 — Exact-version private compatibility probe

- **Owner/files:** Compatibility owner; `tools/compat/*`, `tests/private-server/compatibility.test.js`, `docs/spec/MASTER_SPEC.md` research record. No runtime modules.
- **Objective / inputs / outputs:** input owner-approved private server/version and exact lockfile; output raw protocol/package/server/soak report and `supported|unsupported|inconclusive` result.
- **Public methods/events/data:** CLI `runCompatibilityProbe(configPath)`; report `{packageTuple, serverBuild, scenarios, metrics, result}`; events `compat.started/completed`.
- **Errors/security/performance:** reject target Aternos profile; never patch modules or downgrade; one bot, bounded test window, no credentials logged.
- **Tests/acceptance:** static list assertion + private harness; closes G-02 only on all scenarios/no unresolved parser error.

### P1-T1 — Config, validation, logging, test harness

- **Owner/files:** Foundation owner; `src/config/*`, `src/core/DomainError.js`, `src/observability/{Logger,Redaction}.js`, `src/shared/validation/*`, `config/*`, `tests/unit/config*.test.js`, `tests/security/redaction*.test.js`.
- **Objective / inputs / outputs:** JSON/nonsecret config + environment; output immutable validated `Config` and redacted logs.
- **Public methods/events/data:** `ConfigLoader.load/validate/redactedSnapshot`, `Logger.child`; `config.loaded|config.invalid`; `ConfigV1`, `DomainError`.
- **Errors/security/performance:** fail closed on unknown/unsafe profile; no secrets in outputs; synchronous bounded parse only.
- **Tests/acceptance:** malformed/duplicate/cap/TLS/provider/secret config matrix; exact module contracts pass. No `package.json` edit by this owner.

### P1-T2 — StateStore and retention

- **Owner/files:** Persistence owner; `src/persistence/*`, `migrations/001_initial.sql`, `tests/integration/persistence*.test.js`.
- **Objective / inputs / outputs:** validated config; output WAL-backed transactional StateStore, migration/backup/retention interfaces.
- **Public methods/events/data:** `open/transaction/migrate/backup/health/close`; `persistence.degraded`; tables listed in Architecture §6.
- **Errors/security/performance:** private storage only; parameterized SQL; rollback/safe mode on failure; bounded retention/checkpoint; never assume Termux driver works.
- **Tests/acceptance:** migration idempotency, rollback, crash/reopen, backup verify, locked DB; Termux preflight recorded before mobile sign-off.

### P1-T3 — Core Coordinator, EventBus, monitor primitives

- **Owner/files:** Core owner; `src/core/{Coordinator,EventBus,Clock,IdFactory}.js`, `src/monitoring/{ResourceMonitor,TimerRegistry}.js`, `tests/unit/core*.test.js`.
- **Objective / inputs / outputs:** typed adapter/controller messages; output Coordinator skeleton, bounded events, compact metrics.
- **Public methods/events/data:** Coordinator methods in Module Interfaces; `resource.sample`; Actor/DomainError/BotTelemetry schemas.
- **Errors/security/performance:** no direct DB/bot access except injected contracts; scoped listeners/timers; unavailable metric stays unavailable.
- **Tests/acceptance:** authorization delegation, event bound/cleanup, fake clock, metric unknown values; no live network.

### P2-T1 — Bot transport and one-controller adapter

- **Owner/files:** Bot owner; `src/bots/{ConnectionManager,BotController,BotRegistry}.js`, `tests/contract/bot*.test.js`, `tests/private-server/one-bot*.test.js`.
- **Objective / inputs / outputs:** accepted compatibility result/profile; output one safe Mineflayer lifecycle behind controller DTOs.
- **Public methods/events/data:** `precheck/connect/disconnect/start/stop/captureSnapshot`; events in Module Interfaces; BotTelemetry/connection classification.
- **Errors/security/performance:** exact profile/version only; no reconnect on kick/ban/Aternos stop; listener scope cleanup; tiny view distance/certified cap.
- **Tests/acceptance:** mocked lifecycle and P0-T2 live harness; one controller soak gate.

### P2-T2 — Allowlisted action executor and registry

- **Owner/files:** Bot-action owner; `src/bots/ActionExecutor.js`, `src/inventory/ItemRegistry.js`, `tests/unit/actions*.test.js`.
- **Objective / inputs / outputs:** active lease and version registry; output deterministic observation/navigation/limited safe actions.
- **Public methods/events/data:** `execute/cancel/observe`, `load/validateItem`; action events; typed action schema.
- **Errors/security/performance:** no arbitrary Mineflayer method/payload; action cancellation/checkpoints; protected regions; per-step deadline.
- **Tests/acceptance:** unknown action/item/protected-region/cancel/retry observation tests; destructive actions disabled until P5.

### P3-T1 — Five-controller registry and connection governor

- **Owner/files:** Bot owner; `src/bots/{BotRegistry,ConnectionManager,BotController}.js`, `src/monitoring/ResourceGovernor.js`, `tests/integration/cap*.test.js`.
- **Objective / inputs / outputs:** five configured identities; output independent state with effective live-cap enforcement.
- **Public methods/events/data:** `setEffectiveCap/listEligible/chooseParkCandidates`; `resource.pressureChanged`, `bot.stateChanged`.
- **Errors/security/performance:** no child processes; staggered login; safe parking; governor never deletes tasks; A* limit one until benchmark permits more.
- **Tests/acceptance:** mocked 0/1/2/3/5 lifecycle, caps, listener cleanup; device T-1/T-2/T-3 before any T-5.

### P4-T1 — Task graph, ledger, inventory verifier

- **Owner/files:** Task/inventory owner; `src/tasks/*`, `src/inventory/{InventoryVerifier,InventorySnapshot}.js`, `tests/unit/{task,ledger,inventory}*.test.js`.
- **Objective / inputs / outputs:** task request/plan and snapshots; output transactional DAG, leases, aggregate ledger/evidence verification.
- **Public methods/events/data:** TaskManager/TaskAllocator/TaskLedger/InventoryVerifier methods exactly in Module Interfaces; task/assignment/ledger events.
- **Errors/security/performance:** epoch/idempotency enforcement; no unbounded evidence; transfer conservation; transaction scoped short.
- **Tests/acceptance:** 10k quota fuzz, stale/duplicate/failure/transfer/pre-existing inventory/crash fixtures; zero ledger violation.

### P4-T2 — AI provider manager and plan validator

- **Owner/files:** AI owner; `src/ai/*`, `tests/contract/ai*.test.js`, `tests/security/ai-injection*.test.js`.
- **Objective / inputs / outputs:** redacted planning/chat contexts; output standard ProviderResult and validated declarative plan/chat data.
- **Public methods/events/data:** seven provider operations; `provider.*`, `ai.invalid`; schemas from AI Protocol.
- **Errors/security/performance:** one in-flight/three queue, budgets, abort/byte caps, no tools/no auto paid fallback, TLS policy.
- **Tests/acceptance:** disabled/timeout/429/malformed/extra key/injection/circuit/fallback coverage; hosted adapters remain disabled without OD-08.

### P5-T1 — Allocation, roles, core skills

- **Owner/files:** Gameplay owner; `src/tasks/TaskAllocator.js`, `src/bots/skills/{Navigate,Collect,Mine,Craft,Farm,Storage,Explore,BuildTemplate,Fish,Trade,Guard,Combat}.js`, `tests/{unit,private-server}/skills*.test.js`.
- **Objective / inputs / outputs:** valid lease/capabilities/protected policy; output disjoint action plans and evidence hooks.
- **Public methods/events/data:** `selectParticipants/splitQuota/partitionRegion`, `Skill.execute`; action events.
- **Errors/security/performance:** each skill feature-flagged; no PvP; tool/hunger/durability/safety precheck; action-scoped movement; no high-frequency AI; bounded scan/path.
- **Tests/acceptance:** one skill at a time in disposable private world; capability claims released only after its test; role conflict/duplicate claim tests.

### P6-T1 — Survival and death recovery

- **Owner/files:** Survival owner; `src/survival/*`, `tests/{unit,integration,private-server}/recovery*.test.js`.
- **Objective / inputs / outputs:** telemetry/hazards/checkpoints; output safety directives and auditable recovery decisions.
- **Public methods/events/data:** SafetyController/RecoveryManager methods/events in Module Interfaces; DeathRecord/RecoveryAttempt DTOs.
- **Errors/security/performance:** safety overrides throughput; unknown terrain conservative; attempt cap; no false recovery; bounded scans/routes.
- **Tests/acceptance:** all hazards + death/restart/partial/lost item evidence + repeated-death prevention; G-08.

### P7-T1 — Chat and Discord adapter

- **Owner/files:** Chat/Discord owner; `src/chat/*`, `src/discord/DiscordAdapter.js`, `tests/{unit,security,integration}/chat-discord*.test.js`.
- **Objective / inputs / outputs:** inbound chat/Discord interactions; output one selected safe response or authorised Coordinator request.
- **Public methods/events/data:** ChatManager/DiscordAdapter methods/events; conversation/chat queue/interaction DTOs. Required adapter commands are `/status`, `/bots`, `/bot`, `/task`, `/cancel`, `/stop`, `/say`, `/sayall`, `/provider`, `/chatmode`, and `/help`; each invokes an existing Coordinator use case.
- **Errors/security/performance:** player chat cannot privilege; Discord IDs only; tokens secret; `/cancel` requires task-ID validation and epoch fencing; cooldown/retention/queue cap; proactive disabled default.
- **Tests/acceptance:** complete required command matrix, unauthorised tests, cancel/lease-fencing test, injection/sayall throttle/one responder tests; G-05/G-07.

### P8-T1 — Dashboard and operational views

- **Owner/files:** Dashboard owner; `src/dashboard/*`, `tests/{security,integration}/dashboard*.test.js`.
- **Objective / inputs / outputs:** Coordinator snapshots/events; output authenticated lightweight dashboard and controls.
- **Public methods/events/data:** `start/stop/authenticate/snapshot/stream`; DashboardSnapshot/SSE event DTOs.
- **Errors/security/performance:** loopback/TLS/RBAC/CSRF; no raw DB/bot controls; coalesced bounded SSE/redaction.
- **Tests/acceptance:** session/CSRF/origin/RBAC/slow-client/no-secret/direct-route tests.

### P9-T1 — Reliability, security, and device qualification

- **Owner/files:** QA/performance owner; `benchmarks/*`, `tests/performance/*`, `tests/security/*`, `docs/spec/{PERFORMANCE_PLAN,TEST_PLAN,ACCEPTANCE_CRITERIA}.md` result appendices only.
- **Objective / inputs / outputs:** integrated app + owner hardware; output raw benchmark/security/soak reports and calibrated threshold proposal.
- **Public methods/events/data:** benchmark CLI only; ResultManifest schema; no production behavior change without integrator review.
- **Errors/security/performance:** preserve failed runs, no target Aternos load test, no secrets/raw chat in artefacts, retain bounded disk usage.
- **Tests/acceptance:** T/C/N matrix, leak/pressure/crash/security suites; G-09/G-10 evidence.

### P10-T1 — Integration, release review, target readiness

- **Owner/files:** AXIOM-INTEGRATOR; composition/package/lock/migration order/release docs only, plus conflict-resolution changes explicitly reviewed.
- **Objective / inputs / outputs:** accepted specialist deliverables; output reproducible release candidate and owner runbook.
- **Public methods/events/data:** application `start/stop/health`; ReleaseEvidenceManifest; no new domain API without contract update.
- **Errors/security/performance:** dependency license/audit review; feature flags default safe; target requires operator session and approved cap; rollback path.
- **Tests/acceptance:** full test matrix, compatibility evidence, device evidence, owner Aternos terms record, independent review; all G-01..G-10.

## 4. Handoff rules

A packet is not “done” because code compiles. Its owner supplies changed-file list, public API/event diff, test output, raw artefact paths, known failures, and a request for integrator review. The integrator rejects overlapping file ownership, direct task-state mutation outside TaskManager, unsupported version claims, missing test evidence, or changes that weaken the safe defaults.
