# AXIOM — Test Plan

## 1. Test philosophy

Tests prove a narrow claim in a named environment. Unit mocks do not prove Mineflayer, private-server tests do not prove Aternos, and a benchmark does not prove security. Every test records its environment and fails closed on missing prerequisites.

Proposed stack: Node built-in `node:test` and `node:assert/strict`; deterministic fake clock/transport/Mineflayer adapter; no test framework that is not justified/pinned. Live private-server tests are opt-in and require owner approval.

## 2. Test layout

```text
tests/
├── unit/          # pure allocation, schemas, policy, parsing, state transitions
├── contract/      # module DTO and event compatibility
├── integration/   # SQLite, Coordinator/adapters, recovery, mocked providers/controllers
├── security/      # auth, injection, secrets/redaction, hostile input, limits
├── private-server/# owner-controlled Minecraft harness only; never default CI
├── performance/   # leak/bounds/governor harnesses
└── fixtures/      # sanitised static plans, chat corpus, telemetry, server captures
```

## 3. Mandatory test scenarios

### 3.1 Configuration and compatibility

1. Reject duplicate identity/usernames, >5 identities, unauthorised profile, invalid cap, external dashboard without TLS, disabled provider use, and missing secret.
2. Static package test asserts selected Minecraft version appears simultaneously in Mineflayer, minecraft-protocol, and minecraft-data supported lists. Current expected result: 26.2 fails with a clear `MINECRAFT_VERSION_UNSUPPORTED` error.
3. Compatibility harness described in `MASTER_SPEC.md` §4.4 runs only when owner provides private server. It includes connect/spawn, 30-minute stability, chat, navigation, inventory, block interaction, death/respawn, restart, and clean shutdown.
4. Exact supported-alternative test remains explicit; no test may mutate the requested server version or accept a protocol proxy as a pass.

### 3.2 Task integrity and allocation

1. Fuzz quota splitting for 10,000 random positive target/candidate sets: integer positive quotas, no overlap, sum ≤ remaining, `verified + reserved <= target` always.
2. A trivial or nearby task chooses one bot despite five availability; wide disjoint work chooses a measured-benefit subset, not automatically all five.
3. Objective graph rejects cycle, missing dependency, incompatible item/capability, and destructive work in protected region.
4. Lease expiry/cancel/restart increments epoch; duplicate/out-of-order/stale controller events create zero duplicate credit.
5. Crash during transaction/restart preserves committed facts, releases expired reservation, and reconciles before repeat of non-idempotent work.

### 3.3 Inventory, recovery, and survival

1. Existing stock, unrelated items, pickup-then-drop, full inventory, broken tool, container deposit, crafted output, and two-bot transfer evidence receive the correct credit/dispute outcome.
2. Death record contains position/dimension/task/lease/checkpoint/time. Recovery rejects unreachable/unknown/high-risk/expired routes and caps attempts.
3. Reaching a death location alone never completes recovery. Verified pickup/container inventory delta is required; unobserved/lost items are reported as lost.
4. Safety unit fixtures exercise health/hunger/air, armour/tool condition, hostile proximity, lava, fall, water/suffocation, void, unknown terrain, and no retreat route. Expected result is conservative pause/retreat/safe-stop, never an assertion of invulnerability.
5. Bot collision/block claim and action-specific pathfinder movement tests prove no two controller commands target the same claimed block and non-mining movement cannot dig/tower.

### 3.4 AI and chat

1. Contract tests for every provider result outcome, timeout, abort, body-byte limit, malformed JSON, extra key, invalid enum, budget exhaustion, circuit breaker, and disabled provider.
2. 100 fixed valid/invalid plan fixtures assert closed-schema and semantic rejection of shell/method/packet/config/provider fields, protected regions, PvP, unknown item, and cycles.
3. Prompt-injection corpus from player chat can cause no Coordinator task/provider/config action. Player text remains conversational data.
4. Chat scheduler chooses at most one bot per normal inbound message, honors direct mention/question precedence, cap/cooldowns/queue limits, thread TTL, and no secret/internal disclosure.
5. Qwen evaluation uses the fixed corpus in `AI_PROTOCOL.md`; valid JSON alone is insufficient—semantic safe acceptance is reported separately.

### 3.5 Discord/dashboard/security

1. Every required slash command — `/status`, `/bots`, `/bot`, `/task`, `/cancel`, `/stop`, `/say`, `/sayall`, `/provider`, `/chatmode`, and `/help` — verifies authorised numeric user ID where privileged. Unauthorised, malformed, replayed, and rate-limited interaction gets a safe denial and no state mutation.
2. `/cancel` proves lease fencing and idempotency; `/sayall` queues per-bot sends through chat throttles and cannot flood or bypass stop/pressure policy.
3. Dashboard tests cover password/session rotation, role access, secure cookie options, CSRF, origin, rate limit, request cap, SSE slow consumer, redaction, and route-to-Coordinator-only rule.
4. Secret scanner plus unit redaction test proves environment values never appear in logs, error envelopes, dashboard snapshot, Discord response, or provider prompt.
5. TLS tests reject wrong host, untrusted CA, expired cert, plaintext external Ollama URL, and public bind when policy forbids it.

### 3.6 Aternos compliance and lifecycle

1. Known server unavailable/shutdown string/classification moves to `WAITING_FOR_OPERATOR`, stops reconnect timer, persists task state, and emits an operator notice.
2. Transport error in an explicitly active operator session performs no more than configured two retries with jitter; after limit it waits.
3. Kick, ban, auth/whitelist/cap failure blocks immediately with zero retry.
4. No module exposes website automation, AFK movement, artificial chat, idle keepalive, or server-start routine. Static source scan enforces this.

### 3.7 Resource and leak tests

1. Repeated controller connect/disconnect mock cycles leave zero scoped listeners/ref'd timers and bounded queues/caches.
2. Provider timeout/abort and dashboard slow clients do not retain promises/sockets beyond caps.
3. Pressure transition persists paused low-priority task state before shedding; restart restores it; safety/persistence actions remain enabled.
4. The actual-device benchmark matrix in `PERFORMANCE_PLAN.md` records each stage 0/1/2/3/5 and rejects advancement if any acceptance threshold fails.

## 4. Test execution lanes

| Lane | Trigger | Environment | Claim |
|---|---|---|---|
| Fast unit/contract/security | every change | Replit/CI | pure deterministic contract |
| Integration | every merge candidate | clean Node + temporary SQLite | persisted/coordinator behavior |
| Dependency compatibility | dependency or target version change | clean install + private server when available | exact client tuple only |
| Private-server | manual owner approval | isolated owner server | live game behavior, not Aternos |
| Device benchmark | manual owner approval | named Chromebook/Android | capacity/thermal/battery only |
| Target operational smoke | manual operator session after all gates | target server | target-specific controlled observation |

The P1-T1 foundation `npm test` command has run and currently reports 17 passing unit/security tests; its exact limited scope is recorded in `DEVELOPMENT_STATUS.md`. No later integration, private-server, provider, Discord, dashboard, device, or performance command has run. `SWARM_RUNTIME_DESIGN.md`, `DASHBOARD_DESIGN.md`, and `CHROMEBOOK_OLLAMA_FEASIBILITY.md` add the required future contract, dashboard, and concurrent-workload acceptance cases.
