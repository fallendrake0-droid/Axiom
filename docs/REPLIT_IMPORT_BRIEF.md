# AXIOM — Replit Implementation Handoff

**Source branch:** `arena/a942c4c1-axiom`

**Current status:** Documentation and zero-network P1-T1 foundation only. This package is not a release candidate and must not be read as evidence that Minecraft, Aternos, Discord, AI, SQLite, dashboard, survival, or device behavior works.

## Mandatory reading

1. `MASTER_PROJECT_CONTEXT.md` — authoritative requirements.
2. `AGENTS.md` — gates, scope, ownership, and non-negotiable constraints.
3. `docs/reviews/FINAL_RELEASE_CERTIFICATION_2026-11-14.md` — actual certification verdict and missing evidence.
4. `docs/spec/REPLIT_IMPLEMENTATION_TASKS.md` — complete non-overlapping implementation assignment packets, file ownership, tests, evidence, and review gates.
5. `docs/spec/SWARM_RUNTIME_DESIGN.md` — per-bot state, Coordinator, leases, ledger, verification, and recovery contract.
6. `docs/spec/DASHBOARD_DESIGN.md` — authenticated dashboard boundary.
7. `docs/spec/CHROMEBOOK_OLLAMA_FEASIBILITY.md` — device investigation protocol.
8. The remaining `docs/spec/` documents in the reading order in `AGENTS.md`.

## Existing implementation boundary

The repository currently contains only the dependency-free P1-T1 foundation: closed configuration validation, target-version/connection gating, redaction, structured logging, typed errors, and 17 unit/security tests. There is no bot runtime, Mineflayer/protocol dependency, connection routine, persistence implementation, AI transport, Discord client, dashboard server, provider call, or benchmark. Do not fabricate runtime results from the design documents.

## Required safety boundaries

- Minecraft Java 26.2 remains blocked until a released exact client/protocol/data tuple and private-server harness pass. Never patch dependencies or silently downgrade.
- Never automate Aternos, fake activity, evade idle shutdown, start the server via web UI, or reconnect indefinitely. Known unavailability transitions to `WAITING_FOR_OPERATOR`.
- Five configured identities do not certify five live clients. Use measured staged caps only.
- AI is untrusted proposal data. It cannot select JavaScript, shell, raw packets, arbitrary Mineflayer methods, provider controls, or privileged operations.
- Minecraft chat is conversational untrusted input. Privileged remote actions require immutable configured Discord IDs and traverse Coordinator.
- No automatic paid provider use. Hosted providers stay disabled until current no-charge entitlement, budgets, security, and tests are accepted.
- SQLite/TaskManager is the sole durable authority for assignments, verified progress, inventory ledger, recovery, and audit state.

## Discord command compatibility hold

The newer command contract requires `/status`, `/bots`, `/bot`, `/task`, `/cancel`, `/stop`, `/say`, `/sayall`, `/provider`, `/chatmode`, and `/help`. The authoritative master context also lists legacy `/botstatus`. Do not silently omit it: obtain the documented decision, or implement it as an identically authorised compatibility alias of `/bot` through the same Coordinator use case.

## Implementation sequence

Follow the non-overlapping task packets in `IMPLEMENTATION_ROADMAP.md`. First resolve owner gates, run the Termux SQLite preflight, implement persistence and the coordinator contract, and obtain version-compatible one-bot evidence before live capacity work. Every delivery must include exact changed files, contract changes, test output, environment, raw artefact paths, known failures, and an integrator review request.
