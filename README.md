# AXIOM

AXIOM is a **safety-first Mineflayer worker** for the owner-authorised Minecraft Java server defined in `MASTER_PROJECT_CONTEXT.md`. It creates five independent logical bot controllers while deliberately starting with **one live connection**. The remaining identities are held in a capacity queue until the operator raises the configured limit after a stability test.

> This is not an authentication bypass tool. Offline-mode usernames are accepted only for the explicitly configured, owner-authorised offline-mode server. AXIOM never automates Aternos, grants OP, or reconnects forever after an Aternos shutdown.

## What this first working slice does

- validates the authorised server declaration, offline-mode acknowledgement, bot identities, resource limits, and bounded reconnect policy; then status-pings the server/version before any bot login;
- creates separate Mineflayer clients and state for `hsqoswqi`, `qojjosqsjiox`, `soiqsjowisjo`, `sqisoqwsi`, and `sqosuqwos`;
- keeps a central `SwarmManager` as the sole owner of client lifecycle and live-capacity allocation;
- validates the installed `minecraft-data` protocol support before opening any socket and fails closed for an unsupported tuple;
- staggers joins, classifies disconnects, uses bounded exponential backoff with jitter, and enters `WAITING_FOR_OPERATOR` after server-unavailable retries are exhausted;
- tracks per-bot health, hunger, position, inventory summaries, compact death snapshots, and connection state;
- performs conservative local survival actions: eat only when hungry and equip available armour; and
- supports conservative natural chat acknowledgements for direct mentions/questions, with per-bot and global anti-spam limits. Privileged in-game commands are disabled.

It intentionally **does not claim** that mining, navigation, coordinated task allocation, Discord, dashboard, persistence, or AI planning are implemented yet. Those are later phases from the project context, not fake success paths.

## Preflight

Requirements: Node.js 22 or newer and an owner-authorised Minecraft Java server.

```bash
npm install
cp .env.example .env
# Edit .env. Confirm the target is the authorised offline-mode server, then set:
# AXIOM_OFFLINE_SERVER_AUTHORIZED=true
npm run check:config
npm run check:compatibility
npm test
```

`check:compatibility` loads the installed `minecraft-data` registry and checks the exact `AXIOM_MINECRAFT_VERSION`. Current project configuration requests `26.2`; AXIOM will not silently substitute a different protocol. If the package does not advertise the exact tuple, it prints the supported versions and refuses to connect unless the operator has explicitly opted into experimental protocol handling **and** the authorised offline profile. An experimental opt-in still does not make the tuple tested or guaranteed to work.

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

Keep `AXIOM_MAX_LIVE_CONNECTIONS=1` for the first private-server test. After observing stable resource use, clean shutdown, and server behaviour, increase to `2`, then `3`, then `5`. AXIOM will not start more than five identities and its resource governor can reduce the active cap during pressure. It never silently treats queued bots as connected.

## Tests

```bash
npm test
npm run test:coverage
```

The test suite uses mocked Mineflayer clients: it does not contact the Aternos server or claim live protocol compatibility. See `docs/ARCHITECTURE.md` and `docs/RUNBOOK.md` for boundaries, failure handling, and the operator checklist.
