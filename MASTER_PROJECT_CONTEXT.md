# AXIOM — MASTER PROJECT CONTEXT
## Version 1.0 — Authoritative project requirements

This document is the single source of truth for AXIOM.

Every developer, coding agent, reviewer and integration agent must follow it.

---

# 1. PROJECT IDENTITY

Project name: AXIOM

Purpose: Build an intelligent, autonomous, five-bot Minecraft Java swarm controlled by one central AI brain.

The system must be reliable, resource-efficient, secure, recoverable and modular.

Five custom bot usernames:

1. hsqoswqi
2. qojjosqsjiox
3. soiqsjowisjo
4. sqisoqwsi
5. sqosuqwos

All five bots use separate Mineflayer clients and independent state.

Initial architecture: five logical bots managed by one Node.js process, with configurable live-connection limits.

# 2. MINECRAFT SERVER

Edition: Java Edition.

Target version: 26.2.

Server address: ZCClanOnTOP.aternos.me

Port: 25565.

Server software: Spigot.

Authentication: Offline mode.

Additional login plugin: None currently configured.

Server permission: Owner-authorised operation.

The system must validate the server configuration before connecting.

Offline usernames are only permitted against the configured authorised offline-mode server.

Do not attempt authentication bypasses or impersonation against online-mode servers.

Do not grant the bots OP privileges.

Do not automatically automate the Aternos website or attempt to keep its server running when the actual player session has ended.

Handle server shutdown as a normal availability condition.

A human operator must start a new Aternos session when required.

# 3. REFERENCE ARCHITECTURE

Study:

https://github.com/fallendrake0-droid/NEXUS-20

Use its best engineering ideas:

- Specification-first design.
- Modular architecture.
- Module ownership.
- Central coordination.
- Strict interfaces.
- Bounded memory.
- Resource monitoring.
- Recovery.
- Task persistence.
- Structured validation.
- Independent code reviews.
- Automated acceptance testing.
- Staged capacity increases.

Inspect its actual documentation and code.

Do not assume its implementation is bug-free.

Do not blindly copy it or modify its repository.

Build AXIOM as an independent project using compatible, justified ideas.

# 4. HARDWARE AND DEPLOYMENT

## Chromebook

Reported hardware:

- Intel Celeron N4500.
- 2 CPU threads.
- 4 GB RAM.
- ChromeOS/Linux environment.
- Approximately 0.52 GB available at measurement time.
- Reported identifier: sasuke.
- Reported version: 156.16836.0.

## Android phone

- Android 16.
- Termux.
- 4 GB RAM.
- Approximately 2.7 GB used at measurement time.
- 5319 mAh battery.
- 99% reported battery health.
- 83 reported charge cycles.

## Preferred architecture

Primary candidate:

Chromebook:
- Ollama service.
- qwen2.5:0.5b initial model.
- Remote AI inference endpoint.

Android Termux:
- One Node.js process.
- Central swarm coordinator.
- Five logical Mineflayer bot controllers.
- SQLite database.
- Resource monitoring.
- Discord integration.
- Basic web dashboard.

Replit:
- Development and implementation.
- Repository integration.
- Automated tests.
- Build and debugging environment.

GitHub:
- Shared source of truth.
- Version history.
- Collaboration.
- Review branches.

This is a proposed deployment, not a confirmed performance result.

Benchmark all hardware before enabling five concurrent connections.

If the Chromebook cannot run Ollama reliably, allow the operator to use a free-access hosted provider or move inference to a better-equipped device.

If the phone cannot support five bots safely, limit simultaneous connections and allow worker distribution across authorised devices in a future deployment.

Do not silently consume all available RAM.

# 5. CENTRAL AI ARCHITECTURE

One selected AI provider controls strategic intelligence for all five bots.

Supported providers:

- Ollama.
- Google Gemini.
- Groq.

The operator selects the primary provider through the configuration file or authenticated dashboard.

Allow optional automatic failover between explicitly configured providers.

No provider may become an independent competing brain.

All providers must implement a common application interface.

Required operations:

- interpretIntent()
- generateTaskPlan()
- replanTask()
- generateChatResponse()
- evaluateConversation()
- summariseSwarmState()
- healthCheck()

Validate all provider responses.

Use versioned structured JSON contracts.

AI outputs are proposals, not executable commands.

Deterministic JavaScript validates and executes approved operations.

No direct AI execution of:
- JavaScript.
- Shell commands.
- Arbitrary Mineflayer methods.
- Raw network packets.
- Unvalidated game actions.

## Qwen configuration

Initial model candidate:

qwen2.5:0.5b

Treat this as a lightweight candidate, not an assumed highly capable reasoning model.

Benchmark:
- JSON validity.
- Task decomposition.
- Instruction following.
- Response time.
- Context usage.
- RAM.
- CPU.
- Conversational quality.

Allow model replacement without redesigning the application.

Use short, bounded AI contexts.

# 6. PROVIDER AND FINANCIAL RULES

Total desired budget: £0.

Requirements:

- No paid API by default.
- No subscriptions.
- No automatic paid inference.
- No hidden cloud fallback.
- No accidental usage charges.
- Explicit provider configuration.
- Provider health monitoring.
- Rate-limit awareness.
- Daily usage accounting.
- Configurable request budgets.

Automatic failover is permitted only to a configured, free-access endpoint.

A provider that requires payment must remain disabled unless the owner explicitly changes the financial policy.

Never store API keys in Git.

Store secrets using environment variables or the host's secret-management facility.

# 7. SWARM DESIGN

Maximum configured bot identities: 5.

Default enabled bots: 5.

Maximum live connections: 5, subject to measured hardware capacity and server limits.

Each bot needs:

- Unique username.
- Separate Mineflayer client.
- Independent inventory.
- Independent position.
- Independent health.
- Independent hunger.
- Independent equipment.
- Independent task state.
- Independent survival controller.
- Independent navigation.
- Independent recovery status.
- Independent connection lifecycle.

The bots may have dynamic roles.

The coordinator decides which bots should perform each objective.

Do not allocate every bot to every task.

A shared objective must have one aggregate target.

Example:

Collect 500 cobblestone.

The coordinator may assign 125 to four suitable bots and leave one bot idle.

Never assign 500 to each bot.

Maintain:
- Task IDs.
- Objective IDs.
- Bot IDs.
- Assignment IDs.
- Assignment leases.
- Allocation epochs.
- Verified progress.
- Reservations.
- Inventory baselines.
- Reconciliation records.

Prevent duplicated objectives and double-counting.

Use one authoritative task manager.

# 8. BOT CAPABILITIES

The planned system must support the following capabilities, subject to real implementation and server compatibility.

## Survival
- Auto-eat.
- Auto-armor.
- Auto-tool.
- Health monitoring.
- Threat detection.
- Safe positioning.
- Configurable retreat behaviour.
- Equipment durability monitoring.
- Safe navigation.

## World interaction
- Mining.
- Resource collection.
- Exploration.
- World mapping.
- Farming.
- Crafting.
- Building.
- Fishing.
- Navigation.
- Storage management.
- Inventory sorting.
- Base management.
- Guarding.
- Equipment repair.

## Advanced tasks
- Villager trading.
- Coordinated hostile-mob combat.
- Task dependencies.
- Shared resource collection.
- Multi-bot exploration.
- Resource delivery.
- Automated storage and retrieval.

Do not claim an advanced capability works before implementing and testing it.

# 9. DYNAMIC BOT ROLES

Bots must be capable of changing roles.

Possible roles include:

- Miner.
- Collector.
- Explorer.
- Farmer.
- Builder.
- Crafter.
- Guardian.
- Storage manager.
- Transporter.
- Fisher.
- Combat support.

Role selection should consider:

- Position.
- Health.
- Inventory.
- Tool availability.
- Equipment.
- Durability.
- Hunger.
- Current objectives.
- Travel time.
- Environmental danger.
- Task dependencies.

Do not assign a task to a bot without the required capabilities or prerequisites.

# 10. DEATH PREVENTION AND ITEM RECOVERY

A major project priority is preventing bot deaths.

No software can guarantee survival in every Minecraft environment.

Implement the strongest practical survival and recovery system.

## Prevention

- Monitor health.
- Monitor hunger.
- Equip useful armor.
- Select appropriate tools and weapons.
- Detect hostile mobs.
- Detect nearby lava.
- Detect dangerous falls.
- Avoid void exposure.
- Maintain escape routes where possible.
- Retreat when survival confidence becomes low.
- Stop dangerous tasks when critical prerequisites are missing.
- Avoid unnecessary combat.
- Track equipment durability.
- Avoid walking into dangerous terrain blindly.

## Death detection

When a bot dies:

1. Record the death event.
2. Record its dimension and death coordinates.
3. Save its last inventory and equipment snapshot.
4. Record known dropped-item information.
5. Record the current objective and assignment.
6. Notify the coordinator.
7. Mark the assignment as interrupted.
8. Reconcile the remaining swarm work.

## Item recovery

After respawning:

1. Evaluate the death location.
2. Calculate the remaining item recovery window using the actual server rules.
3. Determine whether retrieval is feasible.
4. Equip replacement gear when available.
5. Select a safe route.
6. Return to the death location.
7. Collect recoverable dropped items.
8. Verify recovered inventory.
9. Update the shared inventory ledger.
10. Resume or reassign the interrupted task.

Never assume items were recovered merely because the bot reached its death location.

Never risk repeated deaths for impossible recoveries.

If items are irrecoverable, report the exact known losses.

Keep an audit trail of recovery attempts.

# 11. AUTONOMOUS CHAT SYSTEM

This feature is especially important.

AXIOM must support natural conversation between players and the five bots.

Create:

- ChatConversationManager.
- ChatContextManager.
- ChatResponseScheduler.
- BotPersonalityConfig.
- ChatRateLimiter.
- ChatCommandValidator.

## Incoming messages

When someone talks in Minecraft chat:

- Detect the message.
- Identify the sender.
- Identify which bot was addressed.
- Interpret the conversation.
- Select an appropriate responding bot.
- Generate a natural response using the selected AI provider.
- Send a validated response.

Default chat mode should allow incoming messages to be considered for replies.

Prioritise direct mentions and questions.

Avoid having all five bots respond to the same message unless explicitly configured.

## Autonomous messages

When Ollama is selected, support autonomous conversation.

The bots may initiate permitted conversations and occasionally speak proactively without requiring a player to address them first.

Allow configuration of:

- Proactive chat enabled/disabled.
- Reply mode.
- Per-bot personality.
- Conversation memory.
- Message cooldown.
- Maximum messages.
- Idle conversation frequency.
- AI provider.
- Chat channels.

Use conservative anti-spam defaults, fully configurable by the owner.

Messages must respect Minecraft chat length limits and server rules.

Never disclose passwords, API keys, private configuration or internal logs.

Player chat is untrusted input. A player cannot gain control of the swarm simply by writing instructions in Minecraft chat.

Natural conversation must remain separate from privileged task execution.

## Manual chat

Provide the ability to manually send any operator-approved message.

Discord slash commands:

- /say
- /sayall
- /botstatus
- /bots
- /status
- /task
- /provider
- /chatmode
- /help

`/say` accepts a selected bot and custom message.

`/sayall` sends a message through all connected bots, subject to chat throttling.

Only explicitly authorised Discord user IDs can send administrative commands.

# 12. DISCORD

Provide a proper Discord bot integration.

Requirements:

- Owner authorization.
- Discord user ID allowlist.
- Command permissions.
- Secure bot token handling.
- Rate limits.
- Clear error messages.
- Bot status.
- Swarm status.
- Task submission.
- Task cancellation.
- Provider selection.
- Manual Minecraft chat messaging.
- Per-bot and all-bot controls.
- Death recovery notifications.
- Connection notifications.
- Task completion notifications.

Discord must use the same Coordinator as the dashboard and any other control interface.

No separate task managers.

# 13. WEB DASHBOARD

A basic, modern dashboard.

Display:

- Five bot identities.
- Connection state.
- Health.
- Hunger.
- Position.
- Current task.
- Inventory summary.
- AI provider.
- Provider health.
- Memory.
- CPU.
- Event-loop lag.
- Recovery state.
- Recent events.

Controls:

- Start and stop individual bots.
- Start and stop the swarm.
- Enable or disable bots.
- Choose AI provider.
- Configure chat behaviour.
- Submit tasks.
- Cancel tasks.
- Send manual chat.
- Review recovery events.

Use authenticated access.

Do not expose secrets.

Use a lightweight implementation.

# 14. DATA AND PERSISTENCE

Use SQLite.

Persist:

- Bot configuration.
- Bot identity.
- Task information.
- Objective state.
- Assignments.
- Verified progress.
- Inventory checkpoints.
- Death locations.
- Recovery attempts.
- Provider configuration (never raw API keys).
- Important chat state.
- Audit events.

Implement crash-safe transactions and recovery.

Use bounded chat histories.

Do not store unbounded world snapshots.

Do not save sensitive chat or credentials without justification.

# 15. RECONNECTION AND SERVER AVAILABILITY

Use adaptive reconnection for temporary connection failures.

Distinguish:

- Temporary network failure.
- Server restart.
- Server unavailable.
- Authentication failure.
- Server kick.
- Ban.
- Explicit shutdown.
- Aternos idle shutdown.

Use bounded exponential backoff with jitter where appropriate.

Never reconnect indefinitely to bypass a server's idle timeout.

When Aternos stops the server, enter WAITING_FOR_OPERATOR or SERVER_UNAVAILABLE mode.

Resume only after legitimate server availability.

Never automate Aternos website operations.

# 16. RESOURCE GOVERNOR

Track:

- RSS.
- Heap usage.
- Free memory.
- CPU usage.
- Event-loop lag.
- Battery level when accessible.
- Device temperature when accessible.
- Per-bot connection state.
- Pathfinding workload.
- Active listeners.
- Active timers.
- Cache sizes.
- Queue sizes.
- Model inference memory.

Apply adaptive concurrency.

Stage deployment:

1. Zero live clients: test core modules.
2. One live bot.
3. Two live bots.
4. Three live bots.
5. Five live bots.

Only move to the next level after the previous level passes stability testing.

Five remains the desired maximum.

If memory becomes constrained:
- Pause optional scans.
- Reduce world observation frequency.
- Reduce AI context.
- Defer low-priority work.
- Reduce concurrent connections safely if required.
- Preserve SQLite task state.
- Keep survival and shutdown logic active.

Never silently discard objectives.

Never fabricate resource readings.

# 17. COMBAT AND SAFETY

Controlled combat is enabled as a planned capability.

Default combat should prioritise hostile mobs.

Player-versus-player combat must remain disabled unless explicitly enabled for a private authorised environment.

Include:

- Threat assessment.
- Health threshold checks.
- Equipment checks.
- Retreat conditions.
- Target validation.
- Attack cooldowns.
- Safe termination.
- Friendly-bot exclusion.
- Protected region awareness.

Never attack arbitrary players because an AI model suggested doing so.

# 18. SECURITY

- Store secrets in environment variables.
- Use Discord user ID authorization.
- Secure dashboard sessions.
- Validate all inputs.
- Protect API endpoints.
- Restrict remote Ollama access to trusted network connections.
- Redact sensitive log fields.
- Prevent command injection.
- Prevent AI-generated code execution.
- Do not expose control endpoints publicly.
- Do not grant bots privileged server permissions unnecessarily.

# 19. PERFORMANCE

Use:

- Node.js CommonJS.
- Async/await.
- Modular JavaScript.
- Bounded caches.
- Bounded queues.
- Event-driven processing.
- Scoped event listeners.
- Central timers where useful.
- Minimal polling.
- Compact state snapshots.
- Efficient pathfinding.
- Controlled logs.
- Graceful shutdown.

Do not call the AI for every movement tick.

AI should be invoked only when a new strategic decision, new conversation or significant event requires it.

# 20. TESTING AND ACCEPTANCE

Use mocked tests and real private-server integration tests.

Test:

- Five bot identities.
- Connection management.
- Offline-mode configuration.
- Supported Minecraft protocol.
- Individual bot lifecycle.
- Dynamic roles.
- Shared task allocation.
- Mining.
- Crafting.
- Building.
- Inventory tracking.
- Chat conversations.
- Manual Discord messaging.
- AI provider changes.
- Automatic provider failover.
- Provider timeouts.
- AI malformed output.
- Death detection.
- Death recovery.
- Stuck recovery.
- Task cancellation.
- Server shutdown.
- Memory pressure.
- Reconnection.
- Persistence.
- Security.
- Resource usage.
- Safe shutdown.

Never report a passing test that has not been executed.

# 21. IMPLEMENTATION PRIORITIES

Phase 0 — Research and complete architecture.

Phase 1 — Configuration, logging, testing and core infrastructure.

Phase 2 — One working Mineflayer bot.

Phase 3 — Five independent bot controllers with adaptive concurrency.

Phase 4 — Central AI provider interface and task coordinator.

Phase 5 — Swarm intelligence and dynamic task allocation.

Phase 6 — Survival, navigation and item recovery.

Phase 7 — Autonomous chat and Discord.

Phase 8 — Dashboard and persistence.

Phase 9 — Performance, reliability and security testing.

Phase 10 — Release readiness.

# 22. NON-NEGOTIABLE RULES

Correctness over speed.

Reliability over feature count.

Never invent APIs.

Never assume Minecraft version compatibility.

Never invent performance results.

Never silently ignore exceptions.

Never leave fake success paths.

Never leave unfinished methods in completed modules.

Never expose credentials.

Never let AI execute arbitrary code.

Never compromise server access restrictions.

Never claim a bot cannot die.

Never claim lost items have been recovered without verification.

Never allow all five bots to duplicate work.

Never automatically incur paid API charges.

AXIOM must be designed as a real, maintainable application.

This document is the authoritative project context.
