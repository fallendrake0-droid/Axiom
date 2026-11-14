# AXIOM — Risk Register

Likelihood and impact are reviewed at each phase; mitigations are requirements, not assurances.

| ID | Risk | Likelihood | Impact | Status | Mitigation / trigger / owner |
|---|---|---:|---:|---|---|
| R-01 | Published PrismarineJS stack lacks 26.2 support. | High | Critical | **OPEN / VERIFIED GAP** | Block 26.2; follow `MASTER_SPEC.md` compatibility gate; use only owner-approved 26.1 alternative after test. Owner + compatibility owner. |
| R-02 | NEXUS runtime patch appears to make 26.2 work but is unmaintained/unsafe. | Medium | Critical | OPEN | Do not vendor/mutate packages; use upstream release only. Integration owner. |
| R-03 | Spigot/Aternos actual protocol/build differs from requested 26.2. | High | High | OPEN | Require owner server evidence and private harness. Owner. |
| R-04 | Five Mineflayer clients exhaust Android memory/CPU or lag protocol. | High | Critical | OPEN | Five identities but certified cap 1; staged 1→2→3→5 benchmarks/governor. Performance owner. |
| R-05 | Chromebook has insufficient free RAM for Ollama/Qwen or poor CPU latency. | High | High | OPEN | Keep Ollama disabled; C-0..C-4 measurement; optional remote/no AI deterministic mode. AI/performance owner. |
| R-06 | Android Doze/Termux background restrictions disconnect process. | Medium | High | OPEN | Operator preflight/wake-lock guidance, foreground/charging policy, bounded recovery; test actual device. Operations owner. |
| R-07 | Hosted free tier changes or causes a paid call. | Medium | High | OPEN | Disable Gemini/Groq; owner evidence/no-charge acknowledgement/request budget; no automatic paid fallback. AI owner. |
| R-08 | Qwen 0.5B emits syntactically valid but strategically unsafe/weak plans. | High | High | OPEN | Advisory only; schema+semantic checks; deterministic fallback; fixed corpus metrics; possibly chat-only. AI owner. |
| R-09 | Player chat prompt injection/identity spoof controls swarm. | High | Critical | CONTROLLED BY DESIGN | No privileged in-game chat; separate chat, closed schemas, Discord IDs only. Security owner tests. |
| R-10 | Offline bots impersonate/are impersonated or receive OP. | Medium | Critical | OPEN | Exact approved offline server only, bots no OP, no chat authorization, operator review. Owner/security. |
| R-11 | Aternos rules are violated by reconnect/activity behavior. | Medium | Critical | OPEN | Operator session state, max two transient retries, waiting state, no web/AFK automation; owner terms review. Operations owner. |
| R-12 | Duplicate work/double progress corrupts aggregate objective. | Medium | Critical | CONTROLLED BY DESIGN | Single TaskManager, leases, epochs, reservations, evidence and fuzz/integration tests. Task owner. |
| R-13 | Inventory credit falsely treats carried/pre-existing/dropped item as collection. | High | High | OPEN | Baseline/post snapshots, policy-specific verification, transfer conservation/dispute path. Inventory owner. |
| R-14 | Death recovery causes repeated deaths or falsely reports recovery. | Medium | High | OPEN | Risk scoring, max attempts, replacement gear prerequisites, evidence-only completion. Survival owner. |
| R-15 | Pathfinder digs/protected-region damage or event-loop stalls. | Medium | High | OPEN | Action scoped movements, protected region policy, claim registry, per-tick budget/queue. Bot owner. |
| R-16 | SQLite unavailable/corrupt on Termux/shared storage. | Medium | Critical | OPEN | On-device node:sqlite/WAL test, private storage, transactional backup/restore/safe mode. Persistence owner. |
| R-17 | Dashboard/Discord credential leakage or remote command compromise. | Medium | Critical | OPEN | secret store, redaction, ID allowlist, RBAC/CSRF/TLS, incident runbook. Security owner. |
| R-18 | Remote Ollama endpoint exposed/MITM. | Medium | High | OPEN | private network, TLS/pinned CA/token, outbound allowlist, no browser API. Security owner. |
| R-19 | AIs/repositories implement conflicting contracts in parallel. | High | High | OPEN | task packet ownership, interface freeze, one integration owner, contract tests. Integrator. |
| R-20 | Documentation implies untested capability is complete. | Medium | High | CONTROLLED BY PROCESS | status vocabulary, disabled feature flags, phase gates, no fabricated result. Architect/reviewer. |
| R-21 | Discord rate limit/chat spam/server moderation risk. | Medium | Medium | OPEN | global/per-bot cooldown, bounded queue, manual sends through same limiter, no proactive by default. Chat/Discord owner. |
| R-22 | Browser dashboard public exposure via proxy misconfiguration. | Medium | High | OPEN | loopback default; explicit VPN/TLS config test; route auth. Dashboard owner. |
| R-23 | AI/provider request volume drains capacity or blocks event loop. | Medium | Medium | OPEN | one in-flight, budgets, circuit breaker, abort/timeouts, deterministic fallback. AI owner. |
| R-24 | Minecraft version upgrade breaks recorded item/registry IDs. | High | High | OPEN | version-pinned ItemRegistry, startup assertion, rebuild compatibility harness for every upgrade. Integration owner. |
| R-25 | Owner cannot currently provide private test server/device access. | Medium | High | OPEN | Preserve Phase 0 only; no target deployment. Owner. |

## Escalation rules

- **Critical risk triggered:** `SAFE_MODE`, no new destructive tasks, safe-stop/snapshot active bots, notify authorized operator, preserve evidence.
- **Compatibility/compliance risk triggered:** transition `BLOCKED` or `WAITING_FOR_OPERATOR`; never use a workaround that changes server terms/version/auth.
- **Resource risk triggered:** governor pressure procedure first; if persistence/safety cannot be maintained, orderly shutdown with recovery evidence.
- Risks may be closed only with named evidence and an owner/reviewer sign-off; a claim from another repository, an AI response, or a single happy-path demo is insufficient.
