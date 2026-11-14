# AXIOM — Configuration Specification

**Format:** JSON configuration file plus environment-only secrets. JSON is deliberately used to avoid a YAML parser and ambiguous types. All configuration is schema-validated at startup; unknown properties fail closed.

## 1. Configuration locations and precedence

1. Built-in safe defaults (never contain an active server, token, or provider key).
2. `config/axiom.config.json` — mode `0600`, not committed.
3. Environment variables for secrets and narrow deployment overrides.
4. Authenticated runtime changes are recorded as an audited, versioned setting; they cannot replace static server/security policy without restart.

`config/axiom.config.example.json` contains placeholders only. Startup logs a redacted hash/revision, not raw configuration.

## 2. Canonical non-secret configuration

```json
{
  "schemaVersion": 1,
  "deployment": {
    "mode": "development",
    "nodeMinMajor": 22,
    "timezone": "UTC",
    "shutdownDeadlineMs": 15000
  },
  "serverProfiles": [{
    "id": "zcclan-authorised",
    "host": "ZCClanOnTOP.aternos.me",
    "port": 25565,
    "edition": "java",
    "version": "26.2",
    "authMode": "offline_owner_authorised",
    "serverApprovedByOperator": false,
    "aternos": true,
    "operatorSessionRequired": true,
    "connectionCap": 5,
    "loginSpacingMs": 5000,
    "protectedRegions": [],
    "allowedDimensions": ["minecraft:overworld"],
    "allowPvp": false,
    "compatibilityState": "blocked_unverified"
  }],
  "bots": {
    "configuredIdentities": [
      {"id": "bot-1", "username": "hsqoswqi", "enabled": true},
      {"id": "bot-2", "username": "qojjosqsjiox", "enabled": true},
      {"id": "bot-3", "username": "soiqsjowisjo", "enabled": true},
      {"id": "bot-4", "username": "sqisoqwsi", "enabled": true},
      {"id": "bot-5", "username": "sqosuqwos", "enabled": true}
    ],
    "maxIdentities": 5,
    "requestedLiveConnectionCeiling": 5,
    "certifiedLiveConnectionCeiling": 1,
    "autoConnect": false,
    "viewDistance": "tiny",
    "reconnect": {"maxTransientAttempts": 2, "delaysMs": [5000, 15000]}
  },
  "ai": {
    "primary": "ollama",
    "automaticFailover": false,
    "maxInFlight": 1,
    "maxQueued": 3,
    "requestBudget": {"perHour": 20, "perDay": 100},
    "providers": {
      "ollama": {"enabled": false, "model": "qwen2.5:0.5b", "baseUrl": "https://ollama.private.example", "connectTimeoutMs": 2500, "warmTimeoutMs": 8000, "coldTimeoutMs": 20000, "keepAlive": "0"},
      "gemini": {"enabled": false, "model": "", "freeAccessAcknowledged": false},
      "groq": {"enabled": false, "model": "", "freeAccessAcknowledged": false}
    }
  },
  "chat": {
    "enabled": true,
    "replyMode": "mentions_and_questions",
    "proactiveOllamaOnly": false,
    "globalCooldownMs": 30000,
    "perBotCooldownMs": 60000,
    "maxVisibleChars": 200,
    "threadMaxTurns": 12,
    "threadTtlMs": 1800000,
    "maxThreads": 64,
    "storeRawChat": false
  },
  "discord": {"enabled": false, "guildId": "", "authorizedUserIds": [], "registerCommandsOnStartup": false},
  "dashboard": {"enabled": true, "bindHost": "127.0.0.1", "port": 3080, "sessionTtlMinutes": 60, "requireHttpsOutsideLoopback": true},
  "persistence": {"path": "~/.local/share/axiom/axiom.sqlite", "taskRetentionDays": 7, "auditRetentionDays": 30, "chatRetentionHours": 24},
  "performance": {"sampleIntervalMs": 5000, "eventLoopWarningMs": 50, "pathfinderTickBudgetMs": 10, "maxConcurrentPathfinders": 1, "queueMax": 100, "cacheMaxEntries": 256}
}
```

The target profile is declarative only. `serverApprovedByOperator: false` and `compatibilityState: blocked_unverified` prevent connection. It must not be changed automatically by a ping, an AI response, or a dashboard browser.

## 3. Secrets: environment only

| Variable | Used by | Rules |
|---|---|---|
| `AXIOM_DASHBOARD_SESSION_SECRET` | DashboardAuth | ≥32 random bytes; rotate invalidates sessions. |
| `AXIOM_DASHBOARD_ADMIN_PASSWORD_HASH` | initial local bootstrap | hash only; raw password never config/log/database. |
| `AXIOM_DISCORD_TOKEN` | DiscordAdapter | required only if Discord enabled; never printed. |
| `AXIOM_GEMINI_API_KEY` | GeminiProvider | required only after owner enables/acknowledges no-charge use. |
| `AXIOM_GROQ_API_KEY` | GroqProvider | same policy as Gemini. |
| `AXIOM_OLLAMA_BEARER_TOKEN` | OllamaProvider | optional token to private proxy; not sent to dashboard. |
| `AXIOM_TLS_CA_PATH`, `AXIOM_TLS_CERT_PATH`, `AXIOM_TLS_KEY_PATH` | TLS clients/server | absolute private file paths, readable only by process account. |

Minecraft offline usernames are non-secret but are still configuration data. No Microsoft account flows are in scope for this offline profile.

## 4. Startup validation

Startup must reject: duplicate bot IDs/usernames; more than five identities; non-positive caps; cap values outside `0..5`; a live cap above certification; no protected regions for enabled destructive actions; an external dashboard bind without TLS/auth; non-HTTPS remote Ollama except explicit loopback development; `aternos=true` plus `autoConnect=true`; PvP true; provider enabled without its required secret and explicit no-charge acknowledgement; Discord command registration while Discord is disabled; enabled Discord without a guild-scoped development ID or an immutable user-ID allowlist; or mutable Discord usernames in place of numeric snowflakes. A profile may remain stored but inactive with `serverApprovedByOperator: false` and/or `compatibilityState: blocked_unverified`; `assertConnectionAllowed()` rejects it at activation and separately rejects target 26.2 until the published compatibility tuple is verified.

## 5. Runtime effective ceilings

```text
effectiveLiveConnectionCeiling = min(
  requestedLiveConnectionCeiling,
  certifiedLiveConnectionCeiling,
  serverProfile.connectionCap,
  ResourceGovernor.liveCap,
  operatorSelectedCap
)
```

`0` safely disconnects/deactivates workers; it does not delete identity/task state. Reducing the ceiling refuses new non-safety work first, checkpoints current actions, then parks the least suitable available controller. It never abandons a controller mid-air or silently discards a task.

## 6. Provider and financial policy

Ollama may be primary only after secure endpoint and hardware preflight. Gemini and Groq require `enabled: true`, `freeAccessAcknowledged: true`, an explicit provider model, a key in secret storage, hard request budgets, and an owner-recorded current no-charge assessment. `automaticFailover` remains false by default. A `429`, quota warning, pricing uncertainty, missing key, circuit-open condition, or budget limit returns `PROVIDER_UNAVAILABLE` and uses deterministic fallback/clarification; it never tries another paid provider.

## 7. Aternos operational policy fields

`operatorSessionRequired` means each initial connect needs an operator action after the human has started a legitimate session. A temporary transport retry can occur at most twice within that same operator-approved connection window. A known server stop, Aternos unavailable message, or expiry of the window moves to `WAITING_FOR_OPERATOR`; no task or cron job can clear it.
