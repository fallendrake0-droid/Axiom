# AXIOM — Architecture

**Status:** Proposed; implementation begins only after owner acceptance.
**Deployment target:** One Android Termux Node.js process for coordinator + up to five logical Mineflayer controllers; Chromebook-hosted Ollama is optional and separately process-isolated.

## 1. Design principles

1. Centralize decision and durable truth; decentralize only per-bot execution state.
2. Persist intent and verified facts, not infinite packet/world histories.
3. Treat all boundary data — player chat, bot observations, Discord payloads, HTTP input, provider output, and restored records — as untrusted until validated.
4. Prefer a single suitable bot. Add bots only when deterministic estimated makespan improves after travel, safety, contention, and merge costs.
5. A controller may stop itself for immediate safety, but it cannot declare global task completion or alter allocations.

## 2. Runtime topology

```text
                                      private network only (optional)
+-----------------------------+     TLS / cert pin / allowlisted host     +------------------------------+
| Chromebook Linux            | <---------------------------------------- | Android / Termux             |
| Ollama process              |                                            | one Node.js process           |
| qwen2.5:0.5b candidate      |                                            |                              |
| no control endpoints        |                                            | +--------------------------+ |
+-----------------------------+                                            | | ResourceMonitor/Governor | |
                                                                           | +-------------+------------+ |
+---------------------------+                                              |               |              |
| Discord interactions      | HTTPS/Gateway                               | +-------------v------------+ |
| authorised user IDs only  +--------------------------------------------> | | Coordinator              | |
+---------------------------+                                              | | (single use-case gate)   | |
                                                                           | +--+------+-----+----+----+ |
+---------------------------+                                                 |      |     |    |      |
| Dashboard browser         | authenticated HTTPS / VPN or loopback          |      |     |    |      |
| no direct bot/database API+-------------------------------------------------+      |     |    |      |
+---------------------------+                                                 |      |     |    |      |
                                                                            v      v     v    v      v
                                                                        Provider Task  Chat Recovery Controller
                                                                        Manager  Manager Manager  Registry
                                                                           |       |       |         |
                                            +------------------------------+-------+-------+---------+--+
                                            | SQLite StateStore (sole durable source of truth; WAL)      |
                                            +----------------------------------------------------------------+
                                                                            |
                                                in-process typed commands / events, no network hop
                                                                            |
             +------------------+-------------------+------------------+--+------------------+
             |                  |                   |                  |                     |
     +-------v-------+  +-------v-------+   +-------v-------+  +-------v-------+     +-------v-------+
     | BotController |  | BotController |   | BotController |  | BotController |     | BotController |
     | hsqoswqi      |  | qojjosqsjiox |   | soiqsjowisjo  |  | sqisoqwsi     |     | sqosuqwos     |
     | own client    |  | own client    |   | own client     |  | own client    |     | own client     |
     +-------+-------+  +-------+-------+   +-------+-------+  +-------+-------+     +-------+-------+
             \_______________________ Mineflayer TCP only after certified gate ________________________/
                                                  |
                                         owner-started Minecraft server
```

There is no second scheduler, swarm bus, per-bot database, browser control plane, or AI-to-bot tool channel. A provider response returns to `AiProviderManager`, not to a controller.

## 3. Authority, write paths, and runtime state

| Concern | Authoritative owner | Durable representation | Ephemeral/cached view |
|---|---|---|---|
| Server profiles, role policy, non-secret config | ConfigLoader / operator-approved config revision | `settings` + config hash | immutable startup snapshot |
| Tasks, objectives, dependencies, assignments, leases, epochs | TaskManager | SQLite | read-only Coordinator/cache snapshot |
| Verified inventory/progress | InventoryVerifier via TaskManager | SQLite transactions + evidence rows | controller pre/post snapshots |
| Bot liveness and current telemetry | BotRegistry | last compact checkpoint/event | in-memory BotSession (authoritative only while live) |
| Survival interruption | BotController SafetyController | safety/death/recovery events | current sensors/hazards |
| Recovery | RecoveryManager | checkpoint and attempt audit | route plan/item entity observations |
| Chat threads/cooldowns | ChatManager | bounded retained thread metadata | ring buffers |
| Provider selection/budget | AiProviderManager | non-secret provider state/audit | active circuit breaker |
| Resource pressure | ResourceGovernor | pressure/audit transitions | rolling metric window |

**Write rule:** Controller event → validation → Coordinator → TaskManager transaction → post-commit event. No event emitted before its transaction commits. Immediate local safety may cancel movement and emit `bot.safetyInterrupted`; TaskManager decides whether an assignment pauses, reassigns, or fails.

## 4. Lifecycle state machines

### 4.1 Swarm / server availability

```text
STOPPED --operator start--> PRECHECK --pass--> READY --connect permitted--> CONNECTING
 PRECHECK --blocked compatibility/authority--> BLOCKED
 CONNECTING --all desired sessions complete--> ACTIVE
 CONNECTING/ACTIVE --Aternos stopped/unavailable/explicit shutdown--> WAITING_FOR_OPERATOR
 CONNECTING/ACTIVE --temporary transport error during current operator session--> RETRY_BACKOFF (max 2)
 RETRY_BACKOFF --retry succeeds--> ACTIVE
 RETRY_BACKOFF --limit/server unavailable--> WAITING_FOR_OPERATOR
 any --operator stop/shutdown--> STOPPING --> STOPPED
```

`WAITING_FOR_OPERATOR` has **no autonomous reconnect timer**. Operator starts the server/session legitimately and uses an authenticated control action to move AXIOM through `PRECHECK`. Kick, ban, auth failure, whitelist rejection, or connection-limit rejection goes `BLOCKED`, not retry.

### 4.2 Bot lifecycle

`DISABLED → IDLE → CONNECTING → SPAWNED → AVAILABLE → ASSIGNED → EXECUTING → AVAILABLE`.

Interruption transitions: `ASSIGNED/EXECUTING → SAFETY_RETREAT | RECOVERING | DISCONNECTED | SAFE_STOPPED`. A controller returns to `AVAILABLE` only after a verified safe state and Coordinator lease decision. `DEAD` is a reported event, not a final state: it enters `RECOVERING` or `IDLE` if recovery is rejected.

### 4.3 Task lifecycle

`DRAFT → PLANNING → CLARIFICATION_REQUIRED | READY → RUNNING → COMPLETED`.

Any non-terminal task may become `PAUSED`, `BLOCKED`, `CANCELLED`, or `FAILED`; terminal records are immutable except append-only audit/reconciliation rows. Objectives use `PENDING`, `READY`, `RESERVED`, `EXECUTING`, `VERIFYING`, `COMPLETED`, `BLOCKED`, `FAILED`, `CANCELLED`. A dependency DAG must be acyclic.

## 5. Directory structure and file ownership target

```text
AXIOM/
├── MASTER_PROJECT_CONTEXT.md                 # authoritative owner brief
├── AGENTS.md
├── DEVELOPMENT_STATUS.md
├── package.json                              # AXIOM-INTEGRATOR only
├── package-lock.json                         # AXIOM-INTEGRATOR only
├── config/
│   └── axiom.config.example.json             # custom closed validator lives in src/shared/validation
├── migrations/
│   └── 001_initial.sql                       # persistence owner, ordered by integrator
├── src/
│   ├── bootstrap.js                           # integrator composition only
│   ├── composition/createApplication.js       # integrator composition only
│   ├── config/ConfigLoader.js
│   ├── core/{Coordinator,DomainError,EventBus,Clock,IdFactory}.js
│   ├── persistence/{StateStore,Migrator,RetentionService}.js
│   ├── tasks/{TaskManager,TaskAllocator,TaskLedger,ObjectiveGraph}.js
│   ├── inventory/{InventoryVerifier,InventorySnapshot,ItemRegistry}.js
│   ├── bots/{BotRegistry,BotController,ConnectionManager,ActionExecutor}.js
│   ├── survival/{SafetyController,HazardScanner,RecoveryManager,RouteRisk}.js
│   ├── ai/{AiProviderManager,OllamaProvider,GeminiProvider,GroqProvider,PlanValidator}.js
│   ├── chat/{ChatManager,ConversationStore,ResponseScheduler,ChatPolicy}.js
│   ├── discord/DiscordAdapter.js
│   ├── dashboard/{DashboardServer,DashboardAuth,public/}
│   ├── monitoring/{ResourceMonitor,ResourceGovernor,TimerRegistry}.js
│   ├── observability/{Logger,AuditLog,Redaction}.js
│   └── shared/{schemas,queues,cache,validation}.js
├── tests/{unit,contract,integration,private-server,performance,security}/
├── benchmarks/{termux,chromebook,remote}/
└── docs/{DECISIONS.md,spec/}
```

`src/bots` owns Mineflayer imports. The rest of the program receives compact DTOs and commands only. This prevents accidental dependency bloat in dashboard/Discord/provider code.

## 6. SQLite model

Use one `StateStore` connection/serialized write queue on the Android process. The preferred driver is `node:sqlite` only after Termux verification. Enable foreign keys, WAL, bounded cache/journal settings validated for the actual device, `busy_timeout`, migrations, transactions, backups, and retention. Never locate the DB on Android shared/FUSE storage.

Core tables: `schema_migrations`, `settings`, `bot_identities`, `bot_checkpoints`, `tasks`, `objectives`, `objective_dependencies`, `assignments`, `assignment_events`, `inventory_checkpoints`, `inventory_evidence`, `ledger_entries`, `deaths`, `recovery_attempts`, `chat_threads`, `provider_usage`, `resource_samples`, `audit_events`, and `idempotency_keys`.

Required key constraints:

- `bot_identities.bot_id` is stable and unique; username is unique per server profile.
- `objectives(task_id, local_key)` unique; dependency foreign keys form a validated DAG in code.
- assignment `(objective_id, allocation_epoch, bot_id)` unique for active leases; no `reserved_quantity <= 0`.
- objective check: `0 <= verified_quantity <= target_quantity`; transaction asserts verified + unexpired reserved ≤ target.
- evidence `(controller_id, evidence_id)` and commands `(source, idempotency_key)` unique.
- all timestamps include UTC ISO and monotonic local sequence where ordering matters.

Snapshots are compact: position/dimension, health/hunger/air, armour/tools/durability summary, bounded target-item counts, action state, captured time, and sequence. Never persist arbitrary chunks or packet traces by default.

## 7. Allocation and controller execution

1. Coordinator validates authorised request and creates a task with an idempotency key.
2. Deterministic parser handles known templates; AI may propose a closed-schema plan only when needed.
3. TaskManager validates plan, creates objective DAG, calculates eligible bots, and asks TaskAllocator for a subset.
4. Allocator checks capability, safety state, tools, inventory, proximity, route risk, travel/setup time, prior measured rate, contention, and resource cap. It begins with one bot and expands only with a conservative net predicted benefit.
5. TaskManager reserves aggregate quotas and issues per-bot leases. The command has action type/parameters from an allowlist, baseline snapshot requirements, deadline, epoch, and idempotency key.
6. Controller executes deterministic action steps. Before non-idempotent retry it reports observed state; it never assumes an acknowledgement means world success.
7. InventoryVerifier reconciles evidence. TaskManager credits verified amount, releases residual reservation, completes/opens objectives, and emits post-commit events.

Mining block claims are local shared state keyed `dimension:x:y:z` with TTL and spatial separation. Action-specific pathfinder movements default to no digging/no 1×1 tower except an explicitly approved mining/build substep. Pathfinder gets a low per-tick budget and an in-process per-host scheduler to prevent five concurrent A* loops monopolising the event loop.

## 8. Chat architecture

### 8.1 Minecraft conversational flow

```text
BotController chat event → ChatPolicy parse/sanitise → ChatManager deduplicate/rate check
  → ConversationStore bounded thread lookup → ResponseScheduler chooses exactly one candidate bot
  → AiProviderManager.evaluateConversation/generateChatResponse (optional)
  → PlanValidator validates ChatResponseV1 → ChatManager cooldown/queue check
  → selected BotController.sendChat → delivery audit/event
```

Incoming player chat is an untrusted `ConversationInput`, never a Coordinator task request. Direct bot-name mention and clear question priority may make a reply eligible; ambiguous/global chat normally remains silent. Deterministic selection breaks ties by: addressed bot, existing conversation owner, available/non-dangerous bot, longest per-bot cooldown elapsed, then stable bot-ID order. The selected responder is skipped if busy in a critical survival/action state.

`ConversationStore` retains at most 64 pseudonymous threads, 12 compact turns each, 30-minute TTL, with raw content persistence off by default. `ResponseScheduler` permits one normal swarm reply per 30 seconds and one per bot per 60 seconds initially; manual messages share the outbound limiter. It holds at most 100 expiring messages and audits explicit suppression reasons. A server message, bot echo, control characters, commands, or sensitive/internal content is never echoed.

Proactive chat is disabled by default. It can be enabled only when Ollama is selected, hardware/provider budgets are healthy, no active safety/pressure state exists, a human-visible cooldown has elapsed, and the owner has accepted the persona/policy. It is never used to keep a server alive or manufacture player activity.

### 8.2 Discord operations

Discord receives interactions through `DiscordAdapter`, validates numeric `interaction.user.id` against the configured immutable allowlist, validates typed options/lengths, audits an actor ID/correlation ID, then invokes the same Coordinator methods as the dashboard. The adapter neither opens SQLite nor sees a Mineflayer client. Required slash commands are `/say`, `/sayall`, `/status`, `/bots`, `/bot`, `/task`, `/cancel`, `/stop`, `/provider`, `/chatmode`, and `/help`; `/bot` returns a safe per-bot snapshot, `/cancel` fences active task leases through `TaskManager`, `/say` selects one connected bot, `/sayall` queues bounded sends through ChatManager, and `/provider` is administrator-only. Replies show safe status/error codes, never credentials, raw provider text, private address detail, or complete player chat.

## 9. Survival and recovery architecture

A `SafetyController` runs before each action step and on bounded telemetry/hazard updates. Its state is `NORMAL`, `CAUTION`, `RETREAT`, `CRITICAL_STOP`, or `DEAD`. Its inputs are health, hunger, air, fire/effects, armour/weapon/tool/durability, held food, nearby hostile/entity classification, current/destination terrain, lava/liquid, fall/drop/void exposure, suffocation, route confidence, and escape route. Unknown world data increases risk. Safety can consume food, choose equipped armour/tool, cancel combat/navigation, retreat to a known safe anchor, or safe-stop. It does not guarantee safety and does not mine/place/move through a protected region merely to complete a task.

Before high-risk operations, the controller writes a compact checkpoint: dimension/position/time/lease/action, inventory and equipped snapshot, health/hunger/armour/durability, and known safe anchor. On death it writes a `DeathRecord` with exact observed location/dimension (or `unknown`), last checkpoint, task/assignment/epoch, death time, known item-entity observations, and server-rule estimate only if the rule is explicitly configured. It marks the assignment interrupted; TaskManager releases only unverified reservation after reconciliation.

Recovery evaluation considers time since death, configured/observed despawn window, dimension match, respawn location, replacement food/armour/tool availability, route risk, hostile/lava/fall conditions, controller health, item visibility, and expected value. The manager requires a safe route and one attempt budget; it may allocate a different equipped bot only if aggregate task policy allows it. It stops after configured attempts, critical safety, expiry, no item observation, or worsening route. `RECOVERED` requires observed item entity plus a reconciled after-inventory/container delta. Otherwise the audit says `PARTIAL`, `NOT_FOUND`, or `ABANDONED` and exact known loss/unknown fields are preserved.

## 10. Graceful shutdown and pressure

On `SIGINT`, `SIGTERM`, operator stop, pressure criticality, or uncaught fatal condition: stop accepting work; cancel nonessential work; safe-stop controllers; flush active checkpoint/evidence and SQLite transaction queue; stop Discord/dashboard; close provider transport; then quit bot clients with a bounded deadline. Unfinished leases expire/reconcile on restart; no task is marked complete just because shutdown occurred.

See `SWARM_RUNTIME_DESIGN.md` for the required per-bot snapshots, Coordinator/lease/ledger transaction contract, recovery fencing, and restart semantics. See `DASHBOARD_DESIGN.md` for the authenticated operations view and API boundary, `CHROMEBOOK_OLLAMA_FEASIBILITY.md` for the concurrent-Linux-workload investigation, `PERFORMANCE_PLAN.md` for the measured-cap requirement, and `SECURITY_PLAN.md` for network/authentication controls.
