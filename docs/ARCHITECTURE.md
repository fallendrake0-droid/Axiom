# AXIOM implementation architecture — initial Mineflayer worker slice

## Preflight record

This repository started without application code. Before implementation, the project context and the actual `fallendrake0-droid/NEXUS-20` reference repository were inspected. AXIOM adopts its useful ideas without copying its deployment: a central lifecycle owner, lazy Mineflayer loading, strict boundaries, bounded retries/queues, compact DTO-style snapshots, resource monitoring, and mocked tests.

Owned modules for this slice:

- `src/config/*`: configuration and offline-server safeguards;
- `src/minecraft/*`: protocol support gate and Mineflayer client creation;
- `src/bots/*`: one client/controller per identity, compact snapshots, survival and death recording;
- `src/swarm/*`: central capacity coordinator and resource governor;
- `src/ai/*`: one Ollama provider, strict five-bot plan contract, and deterministic central-brain dispatch boundary;
- `src/chat/*`: non-privileged, rate-limited chat; and
- `index.js`: CLI composition only.

Affected invariants: a maximum of five identities, one independent client/state per identity, one central Ollama brain across all five identities, every accepted strategic plan covers each identity exactly once, no offline connection outside an acknowledged authorised server profile, no protocol substitution, no unbounded reconnect loop, no privileged in-game chat, and no command execution from player text or raw AI output.

The exact Mineflayer protocol tuple for server version `26.2` remains unverified until `npm run check:compatibility` runs against the installed packages and a private-server integration test is completed. That condition constrains this code: unsupported tuples fail before any network connection.

## Runtime topology

```text
operator terminal
      |
   index.js (composition / commands)
      |
SwarmManager — sole lifecycle and capacity owner
  |        |                 |                    |
BotController x5      ResourceGovernor     CentralBrain        ChatManager
  |                    (RSS / CPU / lag)      |                   (reply limits)
Mineflayer client                         OllamaProvider
                                             (one trusted provider)
```

`SwarmManager` owns all `BotController` instances. A controller owns one Mineflayer client and never exposes it to another controller. Its public status is a plain, compact object; raw Mineflayer world/entity/chunk objects do not cross the boundary.

`CentralBrain` owns one configured Ollama provider, not one provider per bot. It receives a bounded compact snapshot of all five logical bots, and asks Ollama for a versioned JSON plan that names each identity exactly once. `PlanContract` rejects unknown fields, unknown/duplicate bots, unallowlisted actions, malformed JSON, oversized context, and plans with more than one chat action. Only after that validation does `SwarmManager` dispatch an assignment to the intended controller. The executor currently permits only `idle` (clear existing control state) and rate-limited `chat`; it does not expose arbitrary Mineflayer APIs, movement, mining, combat, or raw packets to AI output.

## Lifecycle

Each controller moves through explicit states:

`STOPPED -> CONNECTING -> ONLINE -> BACKOFF -> CONNECTING`

Capacity queue: `STOPPED -> PAUSED_CAPACITY`.

Terminal/non-retryable connection outcomes enter `FAILED`. Exhausted temporary attempts enter `WAITING_FOR_OPERATOR`. `STOPPING` is used only for clean teardown. Explicit stop disables all reconnection timers.

The manager admits identities in configured order, separated by `loginStaggerMs`. It never reports a queued identity as live. When resource pressure reduces capacity, it cleanly pauses the last active controller first.

## Protocol and server gate

Configuration validates the exact host, port, auth mode and explicit offline-server acknowledgement before construction. At launch, `minecraft-data` is queried for its advertised PC version names. A missing exact version stops startup; AXIOM does not replace `26.2` with `auto` or another nearby release. Before any bot login, a short Minecraft status ping validates that the configured server is reachable and advertises the pinned version. A failed/mismatched probe opens **zero** Mineflayer bot clients and instructs the operator to restore the server manually. The only protocol escape hatch is a conspicuous experimental flag, limited to the already-authorised offline profile; it is not a compatibility claim.

Mineflayer itself is required only in `createMineflayerClient`, immediately before a connection is created. Configuration checks and unit tests do not load it or open a socket; the server probe uses the status endpoint, not a logged-in bot.

## Ollama trust, budget, and failure boundary

Only `AXIOM_AI_PROVIDER=ollama` is accepted in this slice. The endpoint must be an explicit, credential-free HTTP(S) URL whose hostname also appears in `AXIOM_OLLAMA_TRUSTED_HOSTS`; no paid endpoint or hidden fallback exists. The provider uses `/api/tags` to health-check the exact configured model and `/api/chat` with `stream:false` and JSON format for plans. Requests have a timeout, response/body bounds, an 8 KiB context cap, periodic health checks, and a configurable daily request ceiling.

An unavailable Ollama service does not make AXIOM invent a plan or expose unsafe manual methods. Bots retain deterministic survival/connection handling; brain status records the error and planning resumes only after a real health check succeeds. Each plan attempt is event-driven or bounded by `AXIOM_AI_PLAN_INTERVAL_MS`, never on movement ticks.

## Safety boundaries

- No player chat produces operator actions, JavaScript, shell, raw packets, or arbitrary Mineflayer method calls.
- The live bot is passed only fixed Mineflayer options; no account credentials are stored by this project for offline mode.
- `death` saves a bounded inventory/position snapshot before emitting a swarm event. It does not claim recovery.
- Survival actions are intentionally narrow and serialised: eat known food when hunger is low and equip available armour. There is no claim of fall, lava, combat, navigation, or recovery protection yet.
- Reconnection is capped and has jitter. Server-unavailable outcomes require a human to restore Aternos/server availability.
- Operator chat is trimmed, control-character stripped, length-limited, and throttled.

## Later phases

The master project context still requires central task allocation, SQLite-backed evidence/reconciliation, navigation, recovery, Discord, and an authenticated dashboard. They are intentionally not simulated in this slice. Future task executors must continue to route through one authoritative coordinator and must extend the deterministic action allowlist rather than calling arbitrary `BotController` methods from AI output.
