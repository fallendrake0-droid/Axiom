# AXIOM — Architecture Decision Record and Owner Decisions

**Status:** Proposed decisions; no implementation authorization is implied.
**Decision date:** 2026-11-14 UTC

## Accepted architecture decisions proposed for approval

| ADR | Decision | Rationale | Status |
|---|---|---|---|
| ADR-001 | Use one Node.js CommonJS process on Android for the coordinator and up to five logical controllers. | Matches the requested topology and avoids duplicate control planes / Android child-process pressure. | **PROPOSED** |
| ADR-002 | SQLite is the sole durable state authority; writes flow through TaskManager transactions. | Prevents competing task, inventory, and recovery truth. | **PROPOSED** |
| ADR-003 | Treat AI as an advisory parser/planner/chat generator only. | Schema and semantic validation protect game actions and administration from hallucinations and prompt injection. | **PROPOSED** |
| ADR-004 | Start with one certified live connection, while keeping five configured identities. | Five configured identities does not prove five safe concurrent sessions. Certification gates protect the phone and server. | **PROPOSED** |
| ADR-005 | Do not support Minecraft 26.2 until published PrismarineJS releases and the private compatibility harness pass. | Current package contents explicitly cap support at 26.1. | **BLOCKING / PROPOSED** |
| ADR-006 | Default all hosted providers and automatic failover to disabled. | A £0 target cannot rely on an unverified free tier or incur an automatic paid charge. | **PROPOSED** |
| ADR-007 | In-game chat is conversational only; Discord interaction user IDs are the only privileged remote command identities. | Offline-mode usernames/UUIDs are forgeable, so Minecraft chat cannot authenticate an operator. | **PROPOSED** |
| ADR-008 | Bind dashboard and Ollama access to loopback or an authenticated private network by default. | Prevents exposing control endpoints and local inference. | **PROPOSED** |
| ADR-009 | Aternos failures transition to `SERVER_UNAVAILABLE` or `WAITING_FOR_OPERATOR`; no website automation, keepalive, idle evasion, or reconnect loop. | Required product compliance boundary. | **PROPOSED** |
| ADR-010 | Use Node's built-in `node:sqlite` only after an on-device Termux probe confirms it; do not make a native addon mandatory. | Current Termux package definitions link Node to shared SQLite, but actual Android runtime behavior is unmeasured. | **PROPOSED** |

## Blocking owner decisions

| ID | Decision required | Safe default before decision | Blocks |
|---|---|---|---|
| OD-01 | Formally accept the specification and confirm later-phase implementation authority. The owner's 2026-11-14 “do whatever is best” instruction has been interpreted narrowly to authorize P1-T1 only. | Zero-network P1-T1 foundation may proceed; all later/live work remains blocked. | P1-T2 onward / all live work |
| OD-02 | Is exact Java **26.2** mandatory, or is a verified Java **26.1** private-server alternative permitted while upstream support catches up? | 26.2 remains blocked; no silent downgrade. | Any live Mineflayer integration |
| OD-03 | Provide an owner-controlled private test server and its exact Java/Spigot build for the compatibility harness. | No target-server connection. | P0-T2 / Phase 2 |
| OD-04 | Confirm the target server is owner-authorised and set protected regions, allowed worlds/dimensions, server connection cap, and prohibited actions. | `mine`, `build`, PvP, trading, fishing and storage mutation disabled on shared worlds. | World interaction |
| OD-05 | Confirm current Aternos terms manually, especially bot/activity/reconnect/server-start provisions, and nominate the human who starts sessions. | Treat all availability loss as operator-required. | Target deployment |
| OD-06 | Supply device access / raw measurements and an acceptable phone battery and thermal policy. | `certifiedLiveCap = 1`; Ollama disabled. | Scaling beyond one |
| OD-07 | Choose private-network method for Android ↔ Chromebook (for example, owner-managed WireGuard/Tailscale or local LAN with certificate pinning) and provide a CA/certificate plan. | No remote Ollama connection. | Ollama deployment |
| OD-08 | Decide whether Gemini and/or Groq are allowed at all, and if so provide written evidence of a no-charge account/project, model IDs, quota/rate limits, and a hard monthly spend cap of £0. | Both disabled; no automatic failover. | Hosted provider enablement |
| OD-09 | Supply Discord application credentials through secret storage and immutable authorized Discord user IDs; select guild-scoped command registration for development. | Discord adapter disabled. | Discord phase |
| OD-10 | Choose dashboard reachability: loopback only, VPN only, or a separately authenticated reverse proxy. | Bind loopback only. | Dashboard deployment |
| OD-11 | Confirm retention periods for audit events, task history, recovery evidence, and player chat. | 30 d audit/recovery, 7 d terminal tasks, 24 h bounded chat; no raw secrets. | Persistence migration |
| OD-12 | Approve bot chat personas, language, reply/proactive-chat settings, and policy for unsolicited messages. | Reactive natural chat only; proactive chat disabled. | Chat launch |

## Evidence required to close a decision

- **OD-02 / OD-03:** saved dependency-lock manifest, private-server version command output, compatibility test report, and a human review of the captured protocol/version result.
- **OD-05:** owner-maintained date, URL, and plain-language outcome of live Aternos terms review. AXIOM must not scrape or automate the website to obtain it.
- **OD-06:** raw benchmark JSON/CSV from the actual Chromebook and phone, including all failed runs and thermal/battery observations.
- **OD-08:** provider console screenshots/export or official plan terms held by the owner; no API key in this repository.
- **OD-09:** user IDs (not usernames), Discord application ID, and token stored only as deployment secrets.
