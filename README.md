# AXIOM

AXIOM is a **safety-constrained, specification-first** Minecraft Java swarm project. Its intended architecture is one Node.js coordinator managing up to five named Mineflayer identities, durable SQLite state, optional local/private AI inference, controlled Discord operations, and a lightweight authenticated dashboard. Every live capability is gated by exact protocol compatibility, measured device capacity, owner authority, and independent review.

> **Current status — Phase 1 foundation only:** The repository currently implements zero-network configuration validation, redaction, structured logging, typed errors, a safe configuration-only `npm start` entry point, and 21 unit/security tests. It does **not** yet contain a Mineflayer dependency/client, Minecraft connection, task coordinator, SQLite state store, dashboard, Discord client, provider transport, Aternos automation flow, or measured Android/Chromebook result. Do not describe it as an operational bot swarm or attempt to connect it to a server.

## How to run the current foundation

### Prerequisites

- Node.js **22 or later** (`node --version`)
- npm supplied with that Node.js installation
- A POSIX shell only for the optional private configuration-file permission command below

### Install and validate

```bash
npm ci --ignore-scripts
npm run check
```

`npm run check` runs the current 21 zero-network unit/security tests. It does not contact Minecraft, Aternos, Discord, Ollama, Gemini, Groq, a dashboard listener, or SQLite.

### Validate a private configuration file locally

The repository intentionally does not commit `config/axiom.config.json`. To validate a local non-secret configuration, copy the safe example and restrict its file permissions on non-Windows systems:

```bash
cp config/axiom.config.example.json config/axiom.config.json
chmod 600 config/axiom.config.json
node - <<'NODE'
const { loadConfiguration } = require('./src/bootstrap');
const { loader } = loadConfiguration();
console.log(JSON.stringify(loader.redactedSnapshot(), null, 2));
NODE
```

This command validates and prints a **redacted** configuration snapshot only. The example retains the requested Java 26.2 target as `blocked_unverified`; calling its connection gate is expected to reject the target. It cannot start a bot, open a socket, start a dashboard, call a provider, or automate Aternos.

### Start the safe foundation

After creating the private configuration file, run:

```bash
npm start
```

Expected output is a small JSON status record with `status: "FOUNDATION_READY"`, `networkStarted: false`, and `liveConnections: 0`. `npm start` validates configuration and exits; it is **not** an operational bot/swarm start command. It cannot connect to Minecraft, start a dashboard, call a provider, connect Discord, or automate Aternos.

An operational runbook can be added only after the exact Minecraft compatibility gate, implementation tasks, private-server tests, device qualification, security tests, and release acceptance gates pass.

## Read first

- [Authoritative project context](MASTER_PROJECT_CONTEXT.md)
- [Agent instructions and implementation guardrails](AGENTS.md)
- [Development status](DEVELOPMENT_STATUS.md)
- [Owner decisions required](docs/DECISIONS.md)
- [Final release certification audit — FAIL](docs/reviews/FINAL_RELEASE_CERTIFICATION_2026-11-14.md)
- [Downloadable Replit handoff pack](AXIOM_SPECIFICATION_PACK.zip) — reviewed specifications, import brief, reviews, and checksums
- [Rebuild the handoff pack](tools/build-specification-pack.sh) after reviewed documentation changes

## Specification index

| Document | Purpose |
|---|---|
| [Master specification](docs/spec/MASTER_SPEC.md) | Scope, invariants, research findings, compatibility decision and success definition |
| [Architecture](docs/spec/ARCHITECTURE.md) | Single-process topology, data authority, state machines, directory map, database model |
| [Module interfaces](docs/spec/MODULE_INTERFACES.md) | Module ownership, public contracts, events and schemas |
| [Swarm runtime design](docs/spec/SWARM_RUNTIME_DESIGN.md) | Independent bot snapshots, coordinator authority, leases, shared ledger, verification, recovery, restart fencing |
| [Dashboard design](docs/spec/DASHBOARD_DESIGN.md) | Authenticated five-bot operations view, controls, endpoint boundary, session and SSE protections |
| [Chromebook Ollama feasibility](docs/spec/CHROMEBOOK_OLLAMA_FEASIBILITY.md) | C-0 through C-4 measurement protocol with concurrent Linux applications; no unmeasured certification |
| [Configuration](docs/spec/CONFIGURATION.md) | Non-secret JSON configuration and secret environment contract |
| [AI protocol](docs/spec/AI_PROTOCOL.md) | Provider contract, closed AI response schemas and validation pipeline |
| [Performance plan](docs/spec/PERFORMANCE_PLAN.md) | Hardware feasibility, measurement protocol and resource governor |
| [Security plan](docs/spec/SECURITY_PLAN.md) | Threat model, controls, authorization, secret handling and incident runbooks |
| [Test plan](docs/spec/TEST_PLAN.md) | Unit, integration, private-server, security, compatibility and benchmark tests |
| [Acceptance criteria](docs/spec/ACCEPTANCE_CRITERIA.md) | Release gates and staged live-connection certification |
| [Implementation roadmap](docs/spec/IMPLEMENTATION_ROADMAP.md) | High-level phases, non-overlapping ownership, and integration authority |
| [Replit implementation assignments](docs/spec/REPLIT_IMPLEMENTATION_TASKS.md) | Copyable phase-by-phase task packets with exact file boundaries, contracts, dependencies, tests, evidence, and review gates |
| [Risk register](docs/spec/RISK_REGISTER.md) | Technical, operational, security, compatibility and compliance risks |

## Research conclusion at a glance

**VERIFIED (2026-11-14 package audit):** Current npm `mineflayer@4.39.0`, `minecraft-protocol@1.68.0`, and `minecraft-data@3.119.0` explicitly advertise Java support through **26.1**, not 26.2. `mineflayer-pathfinder@2.4.5` offers `Movements`, `canDig`, `allow1by1towers`, `thinkTimeout`, and `tickTimeout`, but does not establish a 26.2 game-protocol claim.

**UNVERIFIED:** Minecraft Java/Spigot 26.2 end-to-end support; the target Aternos server's current availability and protocol; Aternos' current terms text; Replit's current deployment limitations; both device's actual capacity; Qwen2.5 0.5B model behavior and memory; and every free-tier provider quota.

**RECOMMENDED:** Do not connect AXIOM to the target server until a clean private-server compatibility harness passes. If the owner needs an immediately package-supported alternative, select **Java 26.1** only after verifying that the chosen authorised server host offers that exact build. No automatic downgrade and no protocol proxy are permitted.

## Current foundation validation

```bash
npm test
```

The Phase 1 test suite validates closed configuration, safe connection gating, file-permission checks, secret redaction, structured logging, and typed errors. It intentionally performs no network, provider, database, Discord, Aternos, or Minecraft operation.
