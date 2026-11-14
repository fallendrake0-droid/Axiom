# AXIOM — Module Interfaces and Contracts

All types below are application DTOs. Implement with plain CommonJS objects plus explicit validators. Modules communicate via method calls and a bounded `EventBus`; no module reaches into another module's storage.

## 1. Shared schemas

```text
Actor = { source: 'discord'|'dashboard'|'system', id: string, roles: string[] }
BotId = 'bot-1'|'bot-2'|'bot-3'|'bot-4'|'bot-5'
ServerState = 'stopped'|'precheck'|'ready'|'connecting'|'active'|'server_unavailable'|'waiting_for_operator'|'blocked'|'stopping'
AssignmentLease = { assignmentId, leaseId, taskId, objectiveId, botId, allocationEpoch, quota, expiresAt, leaseTtlMs, action }
InventorySnapshot = { snapshotId, botId, capturedAt, dimension, position, itemCounts, armour, tools, selectedItem, freeSlots, sequence }
BotTelemetry = { botId, state, capturedAt, position, dimension, health, food, oxygen, inventorySummary, currentAssignmentId, safetyState, sequence }
DomainError = { code, safeMessage, retryable, details? }
```

Every external DTO has `schemaVersion: 1`, `requestId`/idempotency identity where state changes, byte limits, timestamp, and an explicit closed-key validator.

## 2. Core modules

| Module / owner | Responsibility and public methods | Emits | Failure behavior |
|---|---|---|---|
| `Coordinator` / core owner | Single use-case boundary: `startSwarm(actor)`, `stopSwarm(actor)`, `submitTask(actor, request)`, `cancelTask(actor, taskId)`, `setProvider(actor, provider)`, `setChatMode(actor, mode)`, `sendManualChat(actor, target, message)`, `getStatus(actor)`, `handleControllerEvent(event)` | `coordinator.commandAccepted`, `coordinator.commandRejected`, post-commit domain events | Validates actor/intent, delegates, returns typed `DomainError`; never throws raw provider/Mineflayer error across adapter. |
| `EventBus` / core owner | Bounded pub/sub: `publish(type,payload)`, `on(type,listener)`, `disposeScope(scope)` | n/a | Drops/coalesces explicitly configured low-priority events with audit counter; critical events route synchronously post-commit. |
| `ConfigLoader` / config owner | `load()`, `validate(config)`, `redactedSnapshot()`, `assertConnectionAllowed(profile)` | `config.loaded`, `config.invalid` | Fail startup closed; never log secret values. |
| `StateStore` / persistence owner | `open()`, `transaction(fn)`, `migrate()`, `checkpoint()`, `backup()`, `health()`, `close()` | `persistence.degraded` | Serialises writes; rollback transaction; critical I/O fault puts Coordinator safe mode. |
| `AuditLog` / observability owner | `record(actor, action, outcome, data)`, `queryBounded(filter)` | `audit.recorded` | Redacts fields, retention-bounds writes; audit failure is high-severity and blocks privileged mutating action if durable store unavailable. |

## 3. Task and inventory modules

| Module / owner | Inputs → outputs / public methods | Events | Contract |
|---|---|---|---|
| `TaskManager` / task owner | `createTask() → Task`, `attachPlan()`, `readyObjectives()`, `commitAssignments()`, `acknowledgeLease()`, `recordEvidence()`, `pauseTask()`, `resumeTask()`, `cancelTask()`, `expireLeases()`, `recover()` | `task.created`, `task.stateChanged`, `assignment.created/fenced`, `objective.completed` | Only writer of task/assignment rows. All state transitions and aggregate assertions happen in one transaction. |
| `ObjectiveGraph` / task owner | `validatePlan()`, `topologicalOrder()`, `unlockReady()` | `objective.blocked` | Reject cycles, missing prerequisite, incompatible concurrent role requirements. |
| `TaskAllocator` / allocation owner | `selectParticipants(objective,candidates)`, `splitQuota(remaining,participants)`, `partitionRegion()`, `estimateMakespan()` | `allocation.decision` | Prefer one. Quotas are positive, disjoint integers. `verified + reserved <= target` always. Decisions carry explainable factors. |
| `TaskLedger` / task owner | `reserve()`, `release()`, `creditVerified()`, `reconcile()` | `ledger.credited/disputed` | Does not trust claimed amounts; no credit above target; idempotent evidence key. |
| `InventoryVerifier` / inventory owner | `captureBaseline()`, `validateSnapshot()`, `verifyEvidence()`, `verifyTransfer()`, `summarise()` | `inventory.verified`, `inventory.disputed` | Valid item IDs, active lease/epoch, before/after snapshots, policy-specific delta. Transfer is one conserved operation, not two gains. |
| `ItemRegistry` / inventory owner | `load(version)`, `validateItem()`, `toolCapability()` | `registry.unavailable` | Version-coupled; incompatible/missing data blocks game start. |

## 4. Bot and survival modules

| Module / owner | Public methods | Events | Safety/security/performance contract |
|---|---|---|---|
| `BotRegistry` / bot owner | `registerIdentity()`, `getTelemetry()`, `listEligible()`, `setEffectiveCap()`, `chooseParkCandidates()` | `bot.stateChanged`, `bot.telemetry` | Tracks five independent sessions only; no direct task writes. Compact telemetry replaces unbounded history. |
| `ConnectionManager` / bot owner | `precheck(profile)`, `connect(botId)`, `disconnect(botId,reason)`, `classifyDisconnect()` | `server.stateChanged`, `bot.connected/disconnected` | Enforces certified cap, login spacing, Aternos operator session, and bounded transient retries. Never website automation or indefinite retry. |
| `BotController` / bot owner | `start()`, `stop()`, `acceptLease(lease)`, `safeStop(reason)`, `captureSnapshot()`, `sendChat(message)` | `controller.leaseAck`, `controller.evidence`, `controller.death`, `controller.safetyInterrupted` | Owns only its Mineflayer client/listeners. Commands are typed allowlist. It may halt unsafe action, not self-credit or reschedule. |
| `ActionExecutor` / bot owner | `execute(action,lease)`, `cancel()`, `observe()` | `action.started/progress/completed/failed` | Maps typed actions to reviewed Mineflayer calls. Checks cancellation between steps and observes before retry. |
| `SafetyController` / survival owner | `evaluate(telemetry,world)`, `beforeAction()`, `retreat()`, `safeStop()` | `safety.warning/critical/retreat` | Highest local priority. Detects health/hunger/air/fall/lava/void/suffocation/hostiles/durability and route risk. No survival guarantee. |
| `HazardScanner` / survival owner | `scanBounded()`, `scoreRoute()` | `hazard.observed` | Bounded radius/frequency; unknown terrain increases risk instead of being assumed safe. |
| `RecoveryManager` / survival owner | `recordDeath()`, `evaluateRecovery()`, `startRecovery()`, `verifyRecovery()`, `abandonRecovery()` | `recovery.started/attempted/completed/abandoned` | Persists checkpoints and attempts; caps attempts; requires evidence before recovered claim. |

## 5. AI, chat, and external interfaces

| Module / owner | Public methods | Events | Contract |
|---|---|---|---|
| `AiProviderManager` / AI owner | seven methods listed in `AI_PROTOCOL.md`, `selectPrimary()`, `getStatus()` | `provider.request/result/circuitOpen` | Central provider selection and financial/budget policy; returns standard envelopes only. |
| Provider adapters / AI owner | `invoke(operation,context,signal)` | none directly | Ollama/Gemini/Groq transports are isolated; no adapter sees Coordinator methods. |
| `PlanValidator` / AI owner | `validatePlan()`, `validateChat()`, `validateSummary()` | `ai.invalid` | Closed schema then semantic validation; strips/rejects unsafe content. |
| `ChatManager` / chat owner | `ingestMinecraftChat()`, `selectResponder()`, `requestResponse()`, `enqueueSend()`, `setMode()` | `chat.received/sent/suppressed` | Player chat is never privileged. One responder normally; cooldowns/threads/queues bounded. |
| `DiscordAdapter` / Discord owner | `start()`, `stop()`, `registerCommands()`, `handleInteraction()` | `discord.command`, `discord.denied` | Validates numeric immutable user IDs before Coordinator call. Slash commands only; no token leaks. |
| `DashboardServer` / dashboard owner | `start()`, `stop()`, `authenticate()`, `snapshot()`, `stream()` | `dashboard.session`, `dashboard.command` | Authenticated/CSRF-protected presentation. No database/Mineflayer route. Backpressure/coalesced stream. |
| `ResourceMonitor` / monitoring owner | `sample()`, `recordMetric()`, `getWindow()` | `resource.sample` | RSS, V8 heap, CPU, event-loop delay, battery/thermal where accessible; inaccessible means `unavailable`. |
| `ResourceGovernor` / monitoring owner | `evaluate()`, `directives()`, `setCertifiedCap()` | `resource.pressureChanged` | Alters scan/path/AI/concurrency policy and persists paused work before shed; never silently deletes objectives. |

## 6. Command and event allowlists

Controller commands: `connect`, `disconnect`, `safe_stop`, `assignment_start`, `assignment_cancel`, `assignment_pause`, `chat_send`, `capture_snapshot`. Actions: only the enumerated task kinds in `AI_PROTOCOL.md`, additionally enabled by feature-release config. Events: `lease_ack`, `action_progress`, `action_completed`, `action_failed`, `inventory_evidence`, `telemetry`, `death`, `chat_received`, `chat_sent`, `disconnect`, `safety_interrupt`.

Every listener is scoped to a controller/session and disposed on disconnect. A replacement connection increments session generation; events from older generations are rejected.
