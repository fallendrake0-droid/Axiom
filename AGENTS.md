# AXIOM repository instructions

## Current delivery state

AXIOM is in **Phase 0 — specification acceptance**. The authoritative project brief is [`MASTER_PROJECT_CONTEXT.md`](./MASTER_PROJECT_CONTEXT.md). The architecture documents in [`docs/spec/`](./docs/spec/) are a proposed, internally consistent implementation contract; they are not evidence that a live bot, a provider, or Minecraft 26.2 works.

**Do not begin large-scale implementation until the owner accepts the specification and the blocking decisions in [`docs/DECISIONS.md`](./docs/DECISIONS.md) have been resolved.** A small compatibility probe may be approved independently, but it must not silently alter the target version or connect repeatedly to Aternos.

## Required reading order before any change

1. `MASTER_PROJECT_CONTEXT.md`
2. `docs/spec/MASTER_SPEC.md`
3. `docs/spec/ARCHITECTURE.md`
4. `docs/spec/MODULE_INTERFACES.md`
5. `docs/spec/CONFIGURATION.md`
6. `docs/spec/AI_PROTOCOL.md`
7. `docs/spec/SECURITY_PLAN.md`
8. `docs/spec/PERFORMANCE_PLAN.md`
9. `docs/spec/TEST_PLAN.md`
10. `docs/spec/ACCEPTANCE_CRITERIA.md`
11. `docs/spec/IMPLEMENTATION_ROADMAP.md`
12. `docs/spec/RISK_REGISTER.md`
13. `DEVELOPMENT_STATUS.md` and `docs/DECISIONS.md`

When a task touches an external dependency, repeat the package/version research rather than relying on this document's 2026-11-14 audit.

## Non-negotiable implementation rules

- Use Node.js CommonJS and `async`/`await`. Do not introduce an alternate backend runtime, an unreviewed framework, a queue broker, or a second database.
- One process on Android owns the Coordinator, TaskManager, SQLite state store, five *logical* BotControllers, providers, Discord adapter, dashboard, and resource governor. It is one process, not five child processes. A future distributed topology requires a new ADR.
- There is exactly one source of truth for durable task, assignment, verified-progress, recovery, and inventory state: the SQLite `StateStore`, mutated through `TaskManager` transactions. UI, Discord, chat, and BotControllers must call the Coordinator; they must not write task state directly.
- AI output is untrusted data. It must satisfy the closed schemas in `AI_PROTOCOL.md`, then semantic validation, then deterministic policy/action allowlists. It must never select JavaScript, shell commands, raw packets, arbitrary Mineflayer methods, credentials, or dashboard actions.
- Treat Minecraft player chat as untrusted conversational text, never as privileged control input. Only configured immutable Discord user IDs may submit privileged actions.
- Offline-mode Minecraft usernames and UUIDs are not authenticated identities. Bots receive no OP privileges. Never use them against an online-mode or unapproved server.
- Aternos compliance is a product constraint: no website automation, fake activity, idle-timeout evasion, player-limit evasion, or indefinite reconnection. Known Aternos shutdown/unavailability transitions to `WAITING_FOR_OPERATOR`.
- Never claim Minecraft 26.2 compatibility. The current public package audit establishes support only through 26.1; see `MASTER_SPEC.md` §4.4. Do not patch `node_modules` or copy NEXUS-20's unsupported runtime patch.
- Never claim a benchmark, device metric, external quota, or integration test was run unless its raw result is retained and named. Label assumptions `ESTIMATED`, simulations `SIMULATED`, and device results `MEASURED`.
- Do not place credentials, Discord tokens, provider keys, session secrets, host names intended to be private, or chat logs in Git. Use environment variables / secret storage; examples contain placeholders only.

## Mandatory preflight in every implementation pull request

State: (1) documents read; (2) task packet ID; (3) files exclusively owned; (4) module contracts and schemas used; (5) invariants affected; (6) decisions/risks that constrain the change; (7) exact tests added and run; and (8) whether any hardware, provider, or server claim is still unknown.

## Ownership and integration

Follow the non-overlapping file ownership in `IMPLEMENTATION_ROADMAP.md`. `AXIOM-INTEGRATOR` alone owns `package.json`, the lockfile, `src/bootstrap.js`, `src/composition/createApplication.js`, migration ordering, and final integration/release gates. A specialist may propose an interface change but must not independently change another specialist's consumers.

## Validation baseline

No application test command exists in Phase 0. Documentation changes require at minimum:

```bash
git diff --check
git status --short
```

When implementation starts, the exact test commands, compatibility harness, benchmark procedures, and release gates are those in `TEST_PLAN.md` and `ACCEPTANCE_CRITERIA.md`. A test is not a pass until its command, environment, raw output location, and commit are recorded in `DEVELOPMENT_STATUS.md`.
