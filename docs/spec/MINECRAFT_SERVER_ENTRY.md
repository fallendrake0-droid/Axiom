# AXIOM — Controlled Minecraft Server Entry Procedure

**Status:** Design/runbook for a future accepted runtime. It does not enable a connection, authorise a target-server test, or change the current release status.

## 1. Current status: AXIOM cannot yet enter the target server

There is no live-bot start command in the current repository. `npm start` validates local configuration and exits with `networkStarted: false`; it does not create a Minecraft client or socket.

The configured target is Java 26.2, while the recorded published-package evidence only supports the audited Mineflayer/Prismarine tuple through Java 26.1. No released exact Java 26.2 tuple, private-server compatibility report, accepted bot-controller implementation, authenticated Coordinator start path, device-capacity result, or target-server acceptance evidence exists. Therefore **no AXIOM bot may be connected to `zcclan-authorised` now**.

This procedure describes the only future route to admission. A missing gate means `BLOCKED`: AXIOM must not use a workaround, version downgrade, proxy, dependency patch, or target-server trial.

## 2. Non-negotiable boundaries

- The target is the owner-authorised offline-mode Java/Spigot profile recorded in the private configuration. Offline-mode usernames are permitted **only** for that validated authorised profile. AXIOM must never bypass online-mode authentication or connect those identities to another server.
- The configured identities are `hsqoswqi`, `qojjosqsjiox`, `soiqsjowisjo`, `sqisoqwsi`, and `sqosuqwos`. They are configured identities, not evidence that five live sessions are allowed.
- AXIOM does not receive OP. Minecraft player chat is conversational and cannot start, stop, or administer bots.
- A human operator starts a legitimate Aternos session. AXIOM must not automate the Aternos website, create fake activity, evade idle shutdown, keep the server alive, or reconnect indefinitely.
- Only the future authenticated Dashboard or immutable, configured Discord user IDs may invoke the Coordinator start/stop use cases. A caller-provided `operatorSessionApproved: true` boolean is not sufficient authorisation.
- AI output is proposal data only. It cannot select a connection target, bypass an admission check, issue raw packets, or call arbitrary Mineflayer methods.
- All connection, controller, and action paths remain disabled unless their exact implementation task and its independent-review gate are accepted.

## 3. Admission gates before any target-server connection

All entries in this table are cumulative. The owner records the decision/evidence; Replit implements only the named accepted work; the independent reviewer decides whether the evidence is sufficient. GitHub commit history and retained redacted evidence are the source of truth.

| Gate | Required condition before target admission | Required evidence / responsible work | Failure result |
|---|---|---|---|
| Authority | The owner has accepted later-phase scope and recorded the required decisions. At minimum, OD-01, OD-02, OD-03, OD-04, OD-05, and OD-06 have an accepted disposition. | `docs/DECISIONS.md`, RPL-0.1 traceability/gate register, owner record, independent review. | `BLOCKED` |
| Exact compatibility | A released, lockable Mineflayer + `minecraft-protocol` + `minecraft-data` tuple explicitly supports the exact selected server version. For the current target, that means Java 26.2; a 26.1 result does not authorise this target. | RPL-0.3 private-server report accepted; RPL-2.1 lockfile/tuple accepted. | `BLOCKED`; do not patch, proxy, or silently downgrade. |
| Private-server proof | The owner-approved disposable private server passed the bounded one-bot compatibility scenarios, including connect/spawn/disconnect, chat, observation/navigation, inventory, disposable-area interaction, death/respawn, restart, and clean shutdown. | RPL-0.3 retained redacted report and independent review. | `BLOCKED` or `INCONCLUSIVE` |
| Safe runtime path | The reviewed controller has a fresh-client lifecycle, listener/timer cleanup, typed disconnect classification, generation fencing, and allowlisted actions. The Coordinator is the only start boundary and issues an expiring/revocable grant after authenticated operator action. | RPL-2.2, RPL-2.3, RPL-5.1, and integration evidence accepted. | `BLOCKED` |
| Security and recovery | Offline-mode profile validation, no-OP policy, secret redaction, authorised-control path, audit, safe shutdown, bounded retries, and recovery/ledger safeguards are accepted. | Relevant RPL-1, RPL-5 through RPL-10 acceptance evidence; unresolved critical/high finding blocks entry. | `BLOCKED` |
| Capacity | The exact device/server/version workload has a measured certified live cap. Initially this may be one only. Two, three, and five require staged evidence in that order; a configured ceiling is never a certification. | RPL-3.1, RPL-3.2, RPL-10.1 result manifests and independent review. | Reduce to a lower accepted cap or remain `BLOCKED`. |
| Release and target readiness | Accepted composition/release evidence exists; the owner has reviewed current Aternos terms and manually started a legitimate server session; observed target host/port/version/auth mode/Spigot build/cap match the approved profile. | RPL-11.1, RPL-11.2, acceptance criteria Stage 7, and independent release decision. | `WAITING_FOR_OPERATOR` or `BLOCKED` |

A task completion report is not a gate closure by itself. Replit must submit changed files, commit SHA, tests, actual outcomes, known defects, resource measurements, raw evidence paths, and a review request. The independent-review response records confirmed findings, required corrections, accepted changes, unresolved questions, and a gate decision. The next dependent phase cannot begin until the prior phase is accepted.

## 4. Future start sequence after every gate is accepted

This sequence belongs to the future composed runtime; it is intentionally not a command for the current foundation.

1. **Human prepares the session.** The owner manually starts the server through the permitted Aternos process and confirms current terms/policy allow the intended operation. The human observes that the legitimate session is running. AXIOM does not visit or control the Aternos website.
2. **Operator checks the approved profile.** Using a private local configuration file, the operator confirms the profile ID, exact host/port, Java version, offline-mode authorisation, Spigot build, allowed dimensions/protected regions, server cap, and requested cap match the accepted evidence. Credentials and private endpoints stay out of Git, logs, and chat.
3. **Operator requests one controlled start.** An immutable authorised Discord user ID or an authenticated Dashboard session calls the Coordinator's future `startSwarm(actor)` use case. Minecraft chat, a shell flag, an AI proposal, and an untrusted internal boolean cannot create a grant.
4. **Coordinator creates a bounded admission grant.** The Coordinator authenticates/authorises the actor, records the profile, actor, issuance/expiry, one-use or session identifier, and revocation state, then invokes the reviewed `ConnectionManager.precheck(profile)`. The precheck verifies compatibility evidence, profile authority, server/device effective cap, and all feature gates before a client exists.
5. **Start only the certified cap.** The controller starts one selected identity at first, never more than the effective cap: the minimum of the approved server cap, configured request, certified device cap, resource-governor directive, and active valid grants. Starts are staggered by the accepted login spacing. Five names in configuration never override this calculation.
6. **Require a complete spawn/snapshot observation.** A connection becomes usable only after the controller has emitted a generation-fenced connection event and a complete safe snapshot, or explicitly marks unknown data as unknown. Begin with a non-destructive smoke check in the approved area. Do not assert task progress, survival, recovery, or inventory changes without the accepted verification path.
7. **Observe the bounded operating window.** Monitor redacted connection state, RSS, heap, CPU, event-loop lag, battery/thermal where available, disconnect classification, and audit state. Keep actions within approved regions/dimensions and policy; no OP or privileged server operation is required.
8. **Scale only after separate certification.** Cap 2, then cap 3, then cap 5 are eligible only after the prior stage passed its private-server/device qualification and independent review. A target-session test never substitutes for these staged results.

## 5. Required failure and stop behaviour

| Observation | Required state/action | Prohibited response |
|---|---|---|
| Exact version/tuple, profile authority, session grant, or cap check fails | Do not instantiate a client; transition to `BLOCKED` and retain a redacted reason. | **Prohibited:** patch dependencies, use a protocol proxy, choose a different version, or override with a boolean. |
| Aternos/server is known stopped or unavailable, or the legitimate session expires | Safely checkpoint/stop and enter `SERVER_UNAVAILABLE` or `WAITING_FOR_OPERATOR`. A human must start a new legitimate session and issue a new authenticated start request. | Website automation, keepalive/AFK behaviour, cron retries, or an autonomous reconnect timer. |
| Temporary transport failure during a still-valid current grant | Apply only the reviewed bounded retry policy (at most two attempts with backoff/jitter), then preserve the observed outcome. | **Prohibited:** infinite retry or a new grant created by the controller. |
| Kick, ban, auth failure, whitelist rejection, profile mismatch, or connection-limit rejection | Classify as `BLOCKED`, stop the controller, and require operator investigation. | Retrying to evade a server decision or switching identity/profile automatically. |
| Resource pressure, unsafe telemetry, or lifecycle shutdown | Governor/coordinator safely parks or stops work, checkpoints durable state, releases/fences leases, and reports the safe state. | Continuing work, discarding audit/ledger state, or claiming graceful recovery without evidence. |
| Authenticated operator invokes the future stop control | Coordinator stops intake, safely stops controllers, checkpoints, disposes listeners/timers, and records the shutdown result. | Leaving live clients, ref'd timers, or reconnection jobs running. |

## 6. What an operator can do today

Today the operator can run `npm ci --ignore-scripts`, `npm run check`, and the safe `npm start` configuration validation documented in the README. These commands prove only the current zero-network foundation; they cannot put a bot into Minecraft.

The next live-admission prerequisite is not another shell command. It is an owner decision and compatibility evidence: resolve OD-01 through OD-06 as applicable, wait for an exact published/verified Java 26.2 tuple (or explicitly authorise a separately verified different server/version through OD-02), provide the owner-controlled private test server, and complete the gated RPL work with independent review.

## 7. Traceability

- Authority and owner decisions: [`docs/DECISIONS.md`](../DECISIONS.md)
- Acceptance stages and target readiness: [`ACCEPTANCE_CRITERIA.md`](ACCEPTANCE_CRITERIA.md)
- Per-task implementation/evidence/review requirements: [`REPLIT_IMPLEMENTATION_TASKS.md`](REPLIT_IMPLEMENTATION_TASKS.md)
- Connection state and controller generation model: [`SWARM_RUNTIME_DESIGN.md`](SWARM_RUNTIME_DESIGN.md)
- Module ownership/interfaces: [`MODULE_INTERFACES.md`](MODULE_INTERFACES.md)
- Security restrictions and incident response: [`SECURITY_PLAN.md`](SECURITY_PLAN.md)
