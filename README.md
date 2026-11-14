# AXIOM

AXIOM is a **specification-first** design for an intelligent Minecraft Java swarm with up to five configured Mineflayer identities, a single Node.js coordinator, local SQLite persistence, optional remote Ollama, Discord operations, a lightweight dashboard, and strict safety controls.

> **Current status — Phase 0 / no runtime implementation:** The repository contains the authoritative brief and an architecture proposal. It does **not** contain a bot, dependencies, a dashboard, an Aternos automation flow, or measured Android/Chromebook results. Specification acceptance and the blocking owner decisions are required before implementation.

## Read first

- [Authoritative project context](MASTER_PROJECT_CONTEXT.md)
- [Agent instructions and implementation guardrails](AGENTS.md)
- [Development status](DEVELOPMENT_STATUS.md)
- [Owner decisions required](docs/DECISIONS.md)

## Specification index

| Document | Purpose |
|---|---|
| [Master specification](docs/spec/MASTER_SPEC.md) | Scope, invariants, research findings, compatibility decision and success definition |
| [Architecture](docs/spec/ARCHITECTURE.md) | Single-process topology, data authority, state machines, directory map, database model |
| [Module interfaces](docs/spec/MODULE_INTERFACES.md) | Module ownership, public contracts, events and schemas |
| [Configuration](docs/spec/CONFIGURATION.md) | Non-secret JSON configuration and secret environment contract |
| [AI protocol](docs/spec/AI_PROTOCOL.md) | Provider contract, closed AI response schemas and validation pipeline |
| [Performance plan](docs/spec/PERFORMANCE_PLAN.md) | Hardware feasibility, measurement protocol and resource governor |
| [Security plan](docs/spec/SECURITY_PLAN.md) | Threat model, controls, authorization, secret handling and incident runbooks |
| [Test plan](docs/spec/TEST_PLAN.md) | Unit, integration, private-server, security, compatibility and benchmark tests |
| [Acceptance criteria](docs/spec/ACCEPTANCE_CRITERIA.md) | Release gates and staged live-connection certification |
| [Implementation roadmap](docs/spec/IMPLEMENTATION_ROADMAP.md) | Phases, non-overlapping Replit task packets and integration ownership |
| [Risk register](docs/spec/RISK_REGISTER.md) | Technical, operational, security, compatibility and compliance risks |

## Research conclusion at a glance

**VERIFIED (2026-11-14 package audit):** Current npm `mineflayer@4.39.0`, `minecraft-protocol@1.68.0`, and `minecraft-data@3.119.0` explicitly advertise Java support through **26.1**, not 26.2. `mineflayer-pathfinder@2.4.5` offers `Movements`, `canDig`, `allow1by1towers`, `thinkTimeout`, and `tickTimeout`, but does not establish a 26.2 game-protocol claim.

**UNVERIFIED:** Minecraft Java/Spigot 26.2 end-to-end support; the target Aternos server's current availability and protocol; Aternos' current terms text; Replit's current deployment limitations; both device's actual capacity; Qwen2.5 0.5B model behavior and memory; and every free-tier provider quota.

**RECOMMENDED:** Do not connect AXIOM to the target server until a clean private-server compatibility harness passes. If the owner needs an immediately package-supported alternative, select **Java 26.1** only after verifying that the chosen authorised server host offers that exact build. No automatic downgrade and no protocol proxy are permitted.
