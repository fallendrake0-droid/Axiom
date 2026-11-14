# AXIOM — Per-Bot Runtime State and Coordinated Work Design

**Status:** Proposed contract. No module described here exists in the reviewed application at this revision.

## 1. Purpose and invariants

This design turns the approved topology into explicit state ownership. It applies when `Coordinator`, `BotRegistry`, `TaskManager`, `TaskAllocator`, `InventoryVerifier`, `RecoveryManager`, `StateStore`, and controller modules are implemented. It does not approve a Minecraft connection, change the Java 26.2 gate, or certify a live capacity.

1. There are exactly five configured logical identities and at most one live controller/client generation for each `botId`.
2. A bot owns its immediate observation and safe-stop state. It never owns global progress, aggregate inventory, a task transition, or a role assignment.
3. `TaskManager` is the sole writer of task/objective/assignment/lease/ledger truth, through short SQLite transactions.
4. Inventory is credited only from item-specific, verifiable evidence. A bot's claim, a path completion, an arrival at a death location, or an AI assertion never credits an objective.
5. Every controller-to-core message is fenced by `botId`, `controllerGeneration`, `assignmentId`, `leaseId`, `allocationEpoch`, `eventId`, and monotonic sequence where applicable.
6. Expiry, cancellation, restart, disconnect, death, and pressure events fence old leases before a replacement can receive work.
7. Resource pressure and safety can stop action, but neither may silently mark work complete or erase durable state.

## 2. Independent per-bot state

`BotRegistry` holds a compact `BotRuntimeSnapshotV1` for each identity. A snapshot is a read model, not a second task or inventory database. Every sub-record carries `observedAt`, `monotonicSequence`, and `source` (`client`, `derived`, or `restored`); absent/stale values are `unknown`, never zero.

```text
BotRuntimeSnapshotV1 = {
  schemaVersion: 1,
  botId: 'bot-1' | 'bot-2' | 'bot-3' | 'bot-4' | 'bot-5',
  username: string,
  controllerGeneration: positive integer,
  enabled: boolean,
  connection: ConnectionStateV1,
  inventory: InventoryObservationV1,
  vitalSigns: VitalSignsV1,
  position: PositionObservationV1,
  equipment: EquipmentObservationV1,
  task: BotTaskStateV1,
  navigation: NavigationStateV1,
  recovery: RecoveryStateV1,
  resources: BotResourceMetricsV1,
  safety: SafetyStateV1,
  observedAt: UTC ISO timestamp,
  monotonicSequence: non-negative integer
}
```

### 2.1 Connection state — independent client lifecycle

```text
ConnectionStateV1 = {
  phase: 'DISABLED'|'IDLE'|'PRECHECK'|'CONNECTING'|'SPAWNING'|'ACTIVE'|
         'RETRY_BACKOFF'|'WAITING_FOR_OPERATOR'|'BLOCKED'|'STOPPING'|'STOPPED',
  serverProfileId: string|null,
  clientInstanceId: string|null,
  operatorSessionGrantId: string|null,
  attempt: non-negative integer,
  connectionEpoch: positive integer,
  connectedAt: UTC timestamp|null,
  lastDisconnect: { classification, safeCode, at }|null,
  retryAt: UTC timestamp|null,
  listenerScopeId: string|null
}
```

`ConnectionManager` creates a fresh `clientInstanceId`, listener scope, and `connectionEpoch` for each connection attempt. It must refuse a second client while one generation is connecting/active/stopping for the same identity. Listener disposal and timer cancellation are mandatory before a replacement generation becomes eligible. `WAITING_FOR_OPERATOR` has no timer capable of reconnecting; only a valid current Coordinator-issued operator-session grant may leave it.

### 2.2 Inventory state — observation, not progress credit

```text
InventoryObservationV1 = {
  snapshotId: UUID,
  inventoryEpoch: positive integer,
  serverTick: integer|null,
  held: [{ itemId, count, nbtFingerprint?: string, durability?: integer|null }],
  selectedSlot: integer|null,
  freeSlots: integer|null,
  totalSlots: integer|null,
  observedAt: UTC timestamp,
  completeness: 'complete'|'partial'|'unknown'
}
```

Counts are canonical namespaced item IDs and non-negative integers. The controller may report a bounded item subset plus completeness; it cannot infer missing data. `InventoryVerifier` stores a checkpoint before and after a permitted action and compares only evidence relevant to the objective. Existing stock must not satisfy a `newly_collected` objective unless its verification policy explicitly permits it. Dropped/picked-up items, crafting ingredients/output, storage deposits, and transfers require their matching evidence type.

### 2.3 Health, hunger, position, and equipment

```text
VitalSignsV1 = {
  health: number|null, food: number|null, saturation: number|null, air: number|null,
  fireTicks: integer|null, effects: bounded effect summary, observedAt, confidence
}

PositionObservationV1 = {
  dimension: 'minecraft:overworld'|'minecraft:the_nether'|'minecraft:the_end'|'unknown',
  x: number|null, y: number|null, z: number|null, yaw: number|null, pitch: number|null,
  serverTick: integer|null, observedAt, confidence
}

EquipmentObservationV1 = {
  mainHand: ItemSummary|null, offHand: ItemSummary|null,
  armour: { head: ItemSummary|null, chest: ItemSummary|null, legs: ItemSummary|null, feet: ItemSummary|null },
  foodOptions: bounded ItemSummary[], observedAt, completeness
}
```

`ItemSummary` contains only item ID, count, bounded durability/max-durability, and optional known enchantment summary. Unknown terrain or stale vital/position data raises risk; it cannot be interpreted as safe. The safety controller owns local retreat/safe-stop decisions and emits an interruption for TaskManager to reconcile.

### 2.4 Per-bot task state

```text
BotTaskStateV1 = {
  availability: 'UNAVAILABLE'|'AVAILABLE'|'RESERVED'|'EXECUTING'|'PAUSED'|'INTERRUPTED'|'SAFE_STOPPED',
  role: string|null,
  assignment: {
    taskId, objectiveId, assignmentId, leaseId, allocationEpoch,
    actionId, issuedAt, expiresAt, checkpointRequired
  }|null,
  actionPhase: 'NONE'|'PRECHECK'|'NAVIGATING'|'ACTING'|'VERIFYING'|'CANCELLING'|'FAILED',
  lastSafeCheckpointId: UUID|null,
  lastEventId: UUID|null
}
```

A controller accepts an action only when its generation and every assignment fence match the currently valid lease. It emits observations and evidence; it cannot change `verifiedQuantity`, issue itself a new lease, assign a role, or transition an objective to completed.

### 2.5 Navigation state and movement conflict control

```text
NavigationStateV1 = {
  navigationId: UUID|null,
  phase: 'IDLE'|'PLANNING'|'MOVING'|'STUCK'|'ARRIVED'|'CANCELLED'|'FAILED',
  goal: { kind, dimension, bounded target/region }|null,
  movementProfile: 'observe'|'safe_travel'|'approved_mine'|'approved_build'|null,
  blockClaimKeys: bounded string[],
  regionReservationId: UUID|null,
  pathfinderActive: boolean,
  startedAt: UTC timestamp|null,
  deadlineAt: UTC timestamp|null,
  lastProgressAt: UTC timestamp|null,
  failureCode: string|null
}
```

The shared scheduler permits the configured number of active pathfinders (initially one), and `TaskManager`/claim policy serialises conflicting block, container, item-entity, and spatial-region claims. General travel defaults to no digging, no tower building, no protected-region traversal, and no action beyond the typed lease. `ARRIVED` is a navigation observation only, never task/recovery success.

### 2.6 Recovery state

```text
RecoveryStateV1 = {
  phase: 'NONE'|'CHECKPOINTING'|'DEAD_RECORDED'|'EVALUATING'|'ROUTING'|'RETRIEVING'|
         'VERIFYING'|'RECOVERED'|'PARTIAL'|'NOT_FOUND'|'ABANDONED',
  deathId: UUID|null,
  attempt: non-negative integer,
  maxAttempts: positive integer,
  deadlineAt: UTC timestamp|null,
  sourceAssignment: { assignmentId, leaseId, allocationEpoch }|null,
  evidenceStatus: 'none'|'item_observed'|'inventory_delta_verified'|'container_delta_verified'|'unverified',
  stopReason: string|null
}
```

A death record stores the last confirmed dimension/coordinates or `unknown`, inventory/equipment checkpoint, task/lease reference, safety facts, and known item entities. `RECOVERED` requires observed item entity evidence **and** reconciled pickup/container inventory evidence. Arrival at a coordinate, an empty route, or an AI statement yields `NOT_FOUND`, `PARTIAL`, or `ABANDONED`, never `RECOVERED`.

### 2.7 Resource metrics

```text
BotResourceMetricsV1 = {
  queueDepth: integer, activeAction: boolean, pathfinderActive: boolean,
  listenerCount: integer, refTimerCount: integer, eventDropCount: integer,
  actionLatencyP95Ms: number|null, navigationLatencyP95Ms: number|null,
  lastResourceSampleAt: UTC timestamp,
  attribution: 'per_bot'|'process_shared'|'unavailable'
}
```

RSS, V8 heap, CPU, event-loop delay, battery, thermal state, database latency, and provider load are process/device metrics. They must be labelled `process_shared`, not fabricated as a per-bot measurement. `ResourceMonitor` produces compact process samples; the registry may attribute bounded queue/listener/action counters to a controller. Any unavailable platform metric carries an unavailable reason.

## 3. Central coordination components

### 3.1 Coordinator

`Coordinator` is the only adapter-facing use-case boundary. Dashboard, Discord, startup/shutdown, and controller events pass a typed `Actor`, correlation ID, idempotency key, and validated DTO to it. It authorizes, applies swarm lifecycle policy, delegates to the owning component, records audit intent/outcome, and returns a safe result.

It does **not** write SQL directly, retain a Mineflayer client, parse raw provider output, or credit inventory. Every privileged mutation must traverse `Coordinator → TaskManager transaction → post-commit event`.

### 3.2 BotRegistry

`BotRegistry` owns identity-to-controller-generation mapping and the five snapshots above. It:

- rejects unknown/duplicate `botId`, username, active client instance, and non-monotonic sequence;
- exposes read-only bounded snapshots and eligibility views;
- creates/disposes scoped listener/timer ownership for each generation;
- applies connection-cap and ResourceGovernor parking decisions; and
- never mutates task, ledger, or durable recovery truth.

A controller event from an old generation is retained only as a fenced audit fact and cannot affect the live snapshot or task state.

### 3.3 TaskManager, scheduler, and allocator

`TaskManager` is the transaction boundary for task DAGs, objectives, assignment leases, idempotency records, progress evidence, inventory ledger entries, and recovery reassignment decisions. `TaskScheduler` asks `TaskAllocator` for a deterministic candidate set but has no direct write path. Dynamic roles are labels chosen per current objective; they are not permanent bot permissions.

Candidate scoring considers current connection/safety state, valid capability release, relevant equipment/durability, bounded inventory facts, position/route risk, task dependencies, current lease, resource pressure, and measured rate only when available. A simple/nearby objective normally selects one suitable bot. Parallel work is selected only when deterministic predicted benefit exceeds travel, contention, and merge costs.

### 3.4 Assignment lease transaction

For a partitionable aggregate objective, the only allocation procedure is conceptually:

```text
BEGIN IMMEDIATE
  expire/fence leases whose expiry, cancellation, controller generation, or session state is invalid
  load objective current version and ledger totals
  assert objective is READY/RUNNING and dependencies are satisfied
  remaining = targetQuantity - verifiedQuantity - unexpiredReservedQuantity
  assert requested quota is positive and <= remaining
  assert bot is eligible, unleased for conflicting work, and spatial/item claims are available
  increment allocation epoch; create assignment + unique lease + reservation + idempotency record
  assert verifiedQuantity + unexpiredReservedQuantity <= targetQuantity
COMMIT
publish assignment-issued after commit
```

The transaction returns a lease with a deadline and fencing epoch. Cancellation, expiry, death interruption, disconnect, restart reconciliation, and reassignment increment/fence the active epoch before releasing residual reservation. At most one active conflicting lease can exist for an exclusive objective, block claim, container operation, item entity, or role slot.

### 3.5 Shared inventory ledger and verification

`TaskLedger` is aggregate and objective-scoped. It stores `targetQuantity`, `verifiedQuantity`, `reservedQuantity`, `disputedQuantity`, and append-only adjustments/evidence links. It never treats a bot's local total as a global total.

For each completion claim, `InventoryVerifier` validates the current lease fence, evidence idempotency, item identity, action type, pre/post snapshots, source/destination facts, and objective verification mode. In a single transaction it either:

- adds verified credit, reduces the matching reservation, and records immutable evidence; or
- records a dispute/failure, releases only the allowed residual reservation, and leaves verified credit unchanged.

Transfers require linked debit and credit evidence; crafted output requires ingredient/output accounting; deposits/retrieval require an observed container delta; pre-existing stock cannot be credited to collection. The invariant is always:

```text
0 <= verifiedQuantity <= targetQuantity
0 <= activeReservedQuantity
verifiedQuantity + activeReservedQuantity <= targetQuantity
```

Duplicate evidence IDs, stale lease epochs, out-of-order controller sequences, and a second claim for the same item entity/container operation are idempotent no-ops or safe typed rejections. They never add credit.

### 3.6 RecoveryManager

`RecoveryManager` consumes only durable death/checkpoint records and current safety/route observations. It evaluates one bounded recovery plan at a time, fences the interrupted lease, reserves recovery work separately, and hands a typed action to an eligible equipped controller. It cannot resurrect a task, invent a drop list, or write verified inventory directly. After every attempt it requests reconciliation; attempts stop at expiry, policy cap, unsafe route, missing evidence, or critical pressure.

## 4. Restart, disconnect, and race handling

1. On disconnect, controller loss, process crash, or shutdown, the durable assignment remains `INTERRUPTED`/`PAUSED`; no optimistic completion is written.
2. On restart, `StateStore` validates migrations, expires/fences leases using wall-clock plus persisted sequence rules, loads the latest compact checkpoints, and requires fresh controller observation before reusing inventory/position data.
3. A restarted controller receives a new generation. Events from its old generation cannot satisfy a new lease.
4. Reconciliation restores only committed ledger facts. It releases expired reservations after evidence review and requires a new allocation transaction before work resumes.
5. Server shutdown/unavailability enters `WAITING_FOR_OPERATOR`, checkpoints safely, and has no reconnect loop. A new operator-issued session is required before the scheduler can dispatch work.
6. Resource pressure pauses lower-priority scheduling first, preserves safety/checkpoint/ledger work, and never discards objectives.

## 5. Required durable records and indexes

The future SQLite schema must provide at least these relationships:

- `bot_checkpoints(bot_id, controller_generation, sequence, captured_at)` with unique `(bot_id, controller_generation, sequence)`;
- `assignments(assignment_id, objective_id, bot_id, allocation_epoch, state, lease_expires_at)` with a unique active-conflict index;
- `assignment_events(controller_generation, event_id)` unique for idempotency;
- `inventory_evidence(evidence_id)` unique and linked to assignment/lease/checkpoints;
- `ledger_entries(objective_id, sequence)` append-only, with objective totals transactionally maintained;
- `block_claims`, `entity_claims`, and `container_claims` with owner lease, expiry, and release reason;
- `deaths`, `recovery_attempts`, and `recovery_evidence` linked to the interrupted assignment; and
- `resource_samples`/`audit_events` with bounded retention.

## 6. Acceptance tests before any live-cap increase

1. Fuzz 10,000 quota allocations and prove the ledger invariant after every commit/retry/cancel/expiry.
2. Deliver duplicate, stale, out-of-order, and post-restart controller evidence; prove zero duplicate credit.
3. Give all five candidates the same objective and prove the allocator issues only disjoint quotas/claims or selects fewer bots.
4. Kill/disconnect a controller during mining; prove the lease is fenced, residual reservation reconciled, and unverified inventory receives no credit.
5. Send two recovery attempts for one item entity/death; prove exactly one claim can verify pickup and arrival alone does not recover inventory.
6. Run repeated connect/disconnect cycles with fake clients; prove one client generation per identity and zero scoped listeners/ref'd timers after disposal.
7. Apply memory pressure; prove scheduler pause/checkpoint behaviour preserves durable task/ledger/recovery state.
8. Restart with active work; prove only committed facts restore and every resumed action holds a new valid lease.

See `ARCHITECTURE.md`, `MODULE_INTERFACES.md`, `TEST_PLAN.md`, and `PERFORMANCE_PLAN.md` for the broader topology, public APIs, test lanes, and capacity gates.
