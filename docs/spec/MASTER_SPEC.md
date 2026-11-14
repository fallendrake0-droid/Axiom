# AXIOM — Master Implementation Specification

**Version:** 1.0.0-proposed
**Date:** 2026-11-14 UTC
**Authority:** This specification refines, but never overrides, [`MASTER_PROJECT_CONTEXT.md`](../../MASTER_PROJECT_CONTEXT.md). Where they differ, the master context wins and the discrepancy must be resolved in `docs/DECISIONS.md` before code changes.

## 1. Purpose and delivery boundary

AXIOM is a safety-constrained Minecraft Java swarm: five configured offline-mode Mineflayer identities (`hsqoswqi`, `qojjosqsjiox`, `soiqsjowisjo`, `sqisoqwsi`, `sqosuqwos`), one Android-resident Node.js process, one central coordinator, one SQLite ledger, and one selected AI provider. It is designed only for the owner-authorised server profile declared in configuration. It is not an Aternos server-starting tool, AFK tool, anti-cheat bypass, public-server botnet, or autonomous administrator.

The initial deliverable is deliberately **not** a large codebase. This repository now contains the contract required to make an implementation reviewable. Phase 0 remains open until the owner accepts it.

### Status vocabulary

- **VERIFIED** — evidenced by a file, package, or source inspected on 2026-11-14; not a future-runtime promise.
- **MEASURED** — obtained on the named actual hardware with retained raw output. There are no AXIOM device measurements yet.
- **SIMULATED** — produced by a mock/harness, never equivalent to a live Minecraft result.
- **ESTIMATED** — a planning range, not a fact.
- **RECOMMENDED** — an architectural choice to accept or change.
- **UNKNOWN / UNVERIFIED** — cannot be claimed until evidence exists.

## 2. Normative invariants

`I-01` **Single authority.** SQLite `StateStore`, mutated only through `TaskManager` transactions, is authoritative for tasks, objectives, assignments, leases, verified progress, inventory checkpoints, recovery attempts, and audit events.

`I-02` **Coordinator ingress.** Dashboard, Discord, configuration-triggered operations, and controller reports use Coordinator use cases. No adapter writes task tables, schedules work, or calls another bot directly.

`I-03` **Aggregate quantities.** A task target belongs to the swarm once. `collect 500 cobblestone` may reserve disjoint shares totalling no more than 500; it never means 500 per bot.

`I-04` **Evidence before credit.** A reservation is not progress. A controller report is evidence only. Credit requires active lease, current allocation epoch, monotonic sequence, deduplicated evidence ID, an allowed verification policy, and reconciled inventory/world/container deltas.

`I-05` **Lease fencing.** On cancellation, expiry, controller loss, or recovery, allocation epoch increments before reassignment. Stale events cannot create credit or restart an action.

`I-06` **AI is data, not authority.** AI response schemas are closed (`additionalProperties: false` conceptually; implementation uses an equivalent explicit validator). Semantic validators map proposals only to allowlisted domain intents/actions. No model output can invoke arbitrary methods, code, shell, packets, configuration writes, Discord commands, or secrets.

`I-07` **Safety dominates throughput.** A safety interrupt can pause/stop an action. No capability claims a guaranteed survival rate. PvP is disabled by policy and only hostiles eligible for carefully gated combat.

`I-08` **Aternos respect.** AXIOM never starts/controls the Aternos website, manufactures activity, evades idle shutdown, evades caps, or reconnects indefinitely. Known shutdown/unavailability requires an operator-started session.

`I-09` **Offline identities are unauthenticated.** Minecraft chat identities/UUIDs in offline mode cannot authorize privileged swarm actions. Bots get no OP. Only immutable Discord user IDs in the configured allowlist authorize administrative commands.

`I-10` **Bounded runtime.** Queues, caches, histories, timers, listeners, pending AI requests, dashboard connections, event buffers, database retention, and pathfinding work all have declared bounds and pressure behavior. Unknown telemetry is represented as unavailable, not zero.

`I-11` **No implicit money.** Primary provider selection, host-network egress, hosted provider enablement, and failover are explicit configuration. Gemini/Groq are disabled unless the owner verifies no-charge terms and enables them. There is no automatic paid fallback.

`I-12` **Truthful delivery.** Passing tests, hardware capacity, server compatibility, models, quotas, and recovery success are reported only with evidence. Lost items remain lost until exact recovery evidence exists.

## 3. Scope

### Included after phased acceptance

- Five independently stateful controllers in one Node process, subject to `effectiveLiveConnectionCeiling`.
- Central coordination, role selection, aggregate task allocation, task dependencies, leases, inventory evidence, persistence, recovery, resource monitoring, and graceful shutdown.
- Deterministic action modules for survival, navigation, collection/mining, farming, crafting, building, storage, exploration, fishing, guarded combat, and trading — each released only after its own test gate.
- Provider adapters for Ollama, Gemini, and Groq behind one contract; deterministic fallback for known commands.
- Natural Minecraft chat, selected single-bot response, bounded context, optional Ollama-only proactive messages, Discord slash operations, and an authenticated lightweight dashboard.

### Explicitly excluded

- A claim that all listed gameplay skills work before implementation/testing.
- Website automation, account/authentication bypass, anti-cheat avoidance, AFK/idle behavior, player-limit bypass, raw packet exploits, PvP by model suggestion, OP permissions, autonomous purchases, and any hidden provider fallback.
- Distributed swarm infrastructure, worker processes, or remote control planes in v1. The preferred topology is a single Android process; scaling to another device is an ADR, not an accidental consequence of five bots.

## 4. Research audit and compatibility

### 4.1 NEXUS-20 inspection — VERIFIED, inspiration only

The requested repository was cloned read-only at `97a632457eb66bc0b530ce07716f251fb8dca9e1` (2026-11-13). Its README, AGENTS, master context, independent review/recommendations/risk/tests, performance report, all requested `docs/spec` files, package metadata, benchmark scripts/results, and key Coordinator, TaskManager, StateStore, InventoryLedger, ResourceMonitor, WorkloadGovernor, protocol, BotRunner, WorkerHost, and 26.2 compatibility source were inspected.

Useful ideas to adapt: specification-first ownership, one authoritative ledger, bounded primitives, leases/epochs, evidence verification, resource governor, staged capacity, mock-vs-live distinction, and security review.

AXIOM must not infer implementation success from it. NEXUS package metadata has no production Mineflayer dependency or lockfile. Its worker can run a `SimulatedBotDriver`; real packages are dynamically loaded. Its `mc26_2Compat.js` mutates installed module internals, injects packet behavior, and consumes a repository-private compressed bundle. Current upstream issue/PR status does not make that an approved AXIOM compatibility solution.

### 4.2 Published ecosystem audit — VERIFIED on 2026-11-14

| Component | Latest audited package | Audited fact | AXIOM interpretation |
|---|---:|---|---|
| Mineflayer | `4.39.0` | Node `>=22`; `lib/version.js` lists 26.1 as its latest tested version. | 26.2 **UNVERIFIED**. |
| minecraft-protocol | `1.68.0` | Node `>=22`; `src/version.js` lists 26.1 as default/latest support. | 26.2 packet serialization/deserialization **UNVERIFIED**. |
| minecraft-data | `3.119.0` | Published data ends at PC 26.1; no PC `26.2` directory/entry. | 26.2 registry/feature data **missing**. |
| mineflayer-pathfinder | `2.4.5` | Exposes `Movements`, `canDig`, `allow1by1towers`, `thinkTimeout`, and `tickTimeout`; it does not assert game-version support itself. | Use only after the base protocol tuple passes. |
| PrismarineJS related packages | current dependency ranges of Mineflayer | Mineflayer brings Prismarine entity/world/chunk/item/physics/registry packages transitively. | Exact lockfile, single resolved tuple, and smoke test are mandatory. |
| Node/Termux | Termux package definitions | Current `nodejs-lts` definition is 24.22.3 and `nodejs` 26.13.1; both link shared `libsqlite`. | `node:sqlite` availability is still an on-device test, not assumed. |
| Ollama | official GitHub API documentation | `/api/chat` supports non-streaming responses, JSON/JSON-schema `format`, and `keep_alive`. | Transport schema does not prove Qwen quality or Chromebook capacity. |
| Gemini/Groq | official SDK repositories | Current SDKs offer server-side API-key clients. | SDK availability does not verify free access, quota, or permitted model. |
| Discord | official API docs repository / `discord.js@14.28.1` | Interaction/slash-command integration is supported by the official ecosystem. | Bot token and authorised IDs remain owner-provided secrets. |

The audit also found open `minecraft-protocol` PR #1550 (26.2 work, not merged) and Mineflayer PR #4201 (open 1.21.2+ `tick_end` handling). These are useful risk signals only.

### 4.3 Minecraft Java 26.2 compatibility decision

**Status: BLOCKED / UNVERIFIED.** The exact missing published components are:

1. `minecraft-data` PC 26.2 registry, protocol, item/block/entity/recipe/feature data;
2. `minecraft-protocol` 26.2 supported-version entry and packet codec test coverage;
3. Mineflayer 26.2 tested-version/feature compatibility plus stable login, configuration, movement, world, inventory, chat, and disconnect handling;
4. confirmation that the specific owner-authorised Spigot build speaks the expected protocol and does not add incompatible plugin behavior; and
5. real private-server integration evidence.

**No node_modules patch, vendored protocol bundle, NEXUS runtime monkey patch, ViaVersion bridge, or silent server downgrade is permitted.** An upstream update may subsequently close part of this gap, but it must be repinned, inspected, and retested.

**Supported alternative:** Java **26.1**, conditional on the owner verifying the selected authorised server host offers an exact 26.1-compatible Spigot build. The audited client tuple advertises it; AXIOM has not yet run it. This is not an automatic fallback.

### 4.4 Reproducible compatibility gate

Run only against an owner-controlled private server, never by repeatedly probing Aternos:

1. Record Node/OS/CPU/RAM, Java, server distribution/build hash, configured offline mode, server `version` output, protocol reported by a status query, and package lockfile checksums.
2. Install a clean exact lockfile. Assert at process start that Mineflayer, minecraft-protocol, and minecraft-data all list the chosen version. For 26.2, this must be true without runtime mutation.
3. Use one configured bot with a unique private-test username. Prove one connect/spawn/disconnect; then a 30-minute idle/movement/chunk soak; then deterministic chat, inventory window, block observation, navigation, place/dig in a disposable region, death/respawn, and safe disconnect.
4. Capture errors, packet/protocol error classes, RSS/heap/CPU/event-loop delay, and server console output. Repeat after restart.
5. Add a two-bot collision/pathfinding and aggregate-ledger test only after one bot passes.
6. Require an independent reviewer to sign the retained report. A failure holds the target at `UNSUPPORTED`; it never changes the configured server version automatically.

### 4.5 Aternos, Spigot, and Replit research limits

The workspace outbound allowlist did not permit retrieving current `aternos.org` terms or Replit deployment documentation, so their current wording is **UNKNOWN**. AXIOM applies the explicit owner rules regardless. The owner must manually review and record current Aternos terms before target deployment. Public GitHub metadata did not establish a current official Spigot 26.2 build; actual server build/protocol evidence is required.

### 4.6 Research provenance (retrieved 2026-11-14)

The compatibility conclusions above were taken from published npm metadata/tarballs and official upstream source, not a search-engine summary: [Mineflayer](https://github.com/PrismarineJS/mineflayer), [minecraft-protocol](https://github.com/PrismarineJS/node-minecraft-protocol), [minecraft-data](https://github.com/PrismarineJS/minecraft-data), [mineflayer-pathfinder](https://github.com/PrismarineJS/mineflayer-pathfinder), [Ollama API documentation](https://github.com/ollama/ollama/blob/main/docs/api.md), [Qwen upstream](https://github.com/QwenLM/Qwen), [Gemini JS SDK](https://github.com/googleapis/js-genai), [Groq JS SDK](https://github.com/groq/groq-typescript), [Discord developer documentation](https://github.com/discord/discord-api-docs), and [Termux package definitions](https://github.com/termux/termux-packages). The npm package versions are named in §4.2. NEXUS-20 was inspected at its named commit under its repository URL in the master context. These sources establish APIs/package claims only; they do not establish AXIOM runtime compatibility, device capacity, service quota, Aternos permission, or Spigot target behavior.

## 5. Hardware feasibility assessment

### Chromebook — ESTIMATED, not measured

The Celeron N4500 has two CPU threads and 4 GB RAM, with only ~0.52 GB reportedly available. Qwen2.5 0.5B is small relative to larger LLMs but is not zero-cost: a 0.5B parameter model quantized near four bits has a theoretical weight floor of roughly 0.23 GiB before container/runtime/KV cache/allocator/OS overhead. A practical loaded process can exceed the currently reported headroom. CPU-only inference on two low-power threads is likely latency-sensitive.

**Recommendation:** do not start Ollama with this headroom. A preflight must measure model-loaded RSS and require `MemAvailable >= measured model-loaded RSS + 300 MiB` before keeping it resident. Default `keep_alive` should be `0` until successful measured inference and thermals justify a bounded value. Context must be short (initial 512–1024 generated/input tokens combined policy cap, revisited from measurement). Qwen 0.5B is a candidate for constrained JSON/chat experiments only, not a trusted strategic planner.

### Android/Termux — ESTIMATED, not measured

With 4 GB physical RAM and ~2.7 GB reportedly used, only ~1.3 GB apparent headroom is not a reservation for AXIOM. Node, protocol/chunk/entity state, world view distance, pathfinding, Discord, SQLite, and five sessions can fluctuate substantially. An estimate of 25–100 MiB incremental RSS per live bot after shared modules is intentionally broad; it must not become a capacity claim.

**Recommendation:** retain five logical identities but use a persisted `certifiedLiveCap`, initially 1. Five may be configured/enabled but must not all auto-connect. The governor takes `min(configuredCap, certifiedCap, operatorCap, serverCap, resourceCap)` and preserves safety/persistence while reducing optional work. Five live sessions require the exact staged benchmark in `PERFORMANCE_PLAN.md`.

## 6. Success definition

AXIOM is technically achievable only if: an accepted exact client/server version tuple passes the compatibility harness; resource measurements permit each live-cap stage; the TaskManager retains aggregate accounting through crashes; controller safety/recovery operates on verified observations; Discord commands are allowlisted by user ID; public/provider keys remain secret; and an owner-started, currently compliant Aternos session is used without keepalive behavior. See the release gates in `ACCEPTANCE_CRITERIA.md`.
