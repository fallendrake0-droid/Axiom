# AXIOM

AXIOM is a **safety-first Mineflayer worker** for the owner-authorised Minecraft Java server defined in `MASTER_PROJECT_CONTEXT.md`. It creates and targets **five independent Mineflayer bot controllers** by default, coordinated by one central Ollama brain. The resource governor remains authoritative: it may defer or pause clients when the host is under measured memory or event-loop pressure.

> This is not an authentication bypass tool. Offline-mode usernames are accepted only for the explicitly configured, owner-authorised offline-mode server. AXIOM never automates Aternos, grants OP, or reconnects forever after an Aternos shutdown.

## What this first working slice does

- validates the authorised server declaration, offline-mode acknowledgement, bot identities, resource limits, and bounded reconnect policy; then status-pings the server/version before any bot login;
- creates separate Mineflayer clients and state for `hsqoswqi`, `qojjosqsjiox`, `soiqsjowisjo`, `sqisoqwsi`, and `sqosuqwos`;
- launches five identities with four-second join staggering (subject to the resource-safe cap) through a central `SwarmManager` lifecycle owner;
- uses one configured, free Ollama provider as the single central brain for all five bots, with trusted-host allowlisting, timeouts, health checks, bounded contexts, request budgets, and strict JSON plan validation;
- sends every Ollama plan through a deterministic allowlist that must cover all five bot IDs exactly once; the currently implemented strategic actions are only `idle` and one rate-limited `chat` message, never arbitrary AI-generated Mineflayer calls;
- validates the installed `minecraft-data` protocol support before opening any socket and fails closed for an unsupported tuple;
- staggers joins, classifies disconnects, uses bounded exponential backoff with jitter, and enters `WAITING_FOR_OPERATOR` after server-unavailable retries are exhausted;
- tracks per-bot health, hunger, position, inventory summaries, compact death snapshots, and connection state;
- performs conservative local survival actions: eat only when hungry and equip available armour; and
- supports conservative natural chat acknowledgements for direct mentions/questions, with per-bot and global anti-spam limits. Privileged in-game commands are disabled.

It intentionally **does not claim** that mining, navigation, coordinated resource-task allocation, Discord, dashboard, SQLite persistence, combat, building, or item recovery are implemented yet. Those are later phases from the project context, not fake success paths.

## Preflight

Requirements: Node.js 22 or newer and an owner-authorised Minecraft Java server.

```bash
npm install
cp .env.example .env
# Edit .env. Confirm the target is the authorised offline-mode server, then set:
# AXIOM_OFFLINE_SERVER_AUTHORIZED=true
npm run check:config
npm run check:compatibility
npm run check:ollama
npm test
```

`check:compatibility` loads the installed `minecraft-data` registry and checks the exact `AXIOM_MINECRAFT_VERSION`. Current project configuration requests `26.2`; AXIOM will not silently substitute a different protocol. If the package does not advertise the exact tuple, it prints the supported versions and refuses to connect unless the operator has explicitly opted into experimental protocol handling **and** the authorised offline profile. An experimental opt-in still does not make the tuple tested or guaranteed to work.

### Ollama brain setup

AXIOM defaults to `qwen2.5:0.5b` on `http://127.0.0.1:11434`. Start Ollama and ensure that exact model is installed **before** launching AXIOM. For a Chromebook or LAN host, set both `AXIOM_OLLAMA_BASE_URL` and `AXIOM_OLLAMA_TRUSTED_HOSTS` to the same private/VPN hostname or address. AXIOM refuses an Ollama endpoint outside that explicit trusted-host list.

Ollama is central strategic coordination, not unrestricted bot control: its plan has to name every bot and is then validated by deterministic JavaScript. Current safe executor coverage is intentionally limited to `idle` and a single throttled `chat` action. Mining, pathfinding, building, combat, and player targeting are not claimed or silently improvised by the model.

## Run

```bash
# Validates config plus Mineflayer protocol support, without opening a socket.
npm run dry-run

# Starts the process. Ctrl+C performs a clean disconnect.
npm start
```

The process accepts these terminal commands while it is running:

- `status` — show compact swarm and resource status.
- `say <bot> <message>` — send an operator-approved message through a connected bot.
- `sayall <message>` — send an operator-approved message through connected bots, subject to chat throttles.
- `stop <bot>` / `start <bot>` — stop or resume one logical bot, subject to the live capacity limit.
- `help`, `quit`.

Chat input is treated as untrusted text; it cannot invoke these operator commands.

## Capacity rollout

`AXIOM_MAX_LIVE_CONNECTIONS=5` is the requested default. AXIOM staggers joins and will not exceed five identities; its resource governor can reduce the active cap during pressure and it never reports queued bots as connected. If the host or server is unstable, reduce the cap for diagnosis rather than disabling the governor.

## Tests

```bash
npm test
npm run test:coverage
```

The test suite uses mocked Mineflayer clients: it does not contact the Aternos server or claim live protocol compatibility. See `docs/ARCHITECTURE.md` and `docs/RUNBOOK.md` for boundaries, failure handling, and the operator checklist.
