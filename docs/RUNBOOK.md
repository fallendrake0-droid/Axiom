# AXIOM operator runbook

## Before first connection

1. Confirm you own or have explicit permission to operate bots on the target server.
2. Start the Aternos server manually. AXIOM will never log into or automate the Aternos website.
3. Run `npm install`, copy `.env.example` to `.env`, then review the target host, port and bot capacity.
4. Confirm the server really is in offline mode, has no login plugin, and is the configured authorised target. Set `AXIOM_OFFLINE_SERVER_AUTHORIZED=true` only then.
5. Run `npm run check:config` and `npm run check:compatibility`.
6. Keep `AXIOM_MAX_LIVE_CONNECTIONS=1` for initial validation. Do not assume five clients are safe because five identities exist.
7. Run `npm run dry-run`, then `npm start`.

## Expected states

- `ONLINE`: Mineflayer emitted `spawn`; this is the only connection-success signal.
- `BACKOFF`: a temporary failure occurred; a bounded retry is scheduled.
- `WAITING_FOR_OPERATOR`: retries ended or the server appears unavailable. Start/repair the server manually, then use `start <bot>` in the running console or restart AXIOM.
- `PAUSED_CAPACITY`: a valid logical bot is queued because the configured or resource-safe connection cap is reached.
- `FAILED`: authentication/configuration/unsupported-protocol or another non-retryable outcome requires review.

## Raising capacity

Run a real observation period after each stage: one, two, three, then five clients. Record memory, CPU, event-loop lag, disconnect rate, and server acceptance. Increase `AXIOM_MAX_LIVE_CONNECTIONS` only between runs. Do not change identity names. If memory pressure appears, return to a lower cap and keep the logs.

## Death and loss

AXIOM records a compact death snapshot in `AXIOM_DATA_DIR/deaths.jsonl`; it does not retrieve items yet. Treat every death as an incident. Stop the bot or reduce capacity if danger recurs. Do not report items as recovered unless a future verified recovery workflow confirms inventory changes.

## Incident response

- **Unsupported protocol:** do not set experimental mode as a substitute for testing. Update/pin dependencies only after a compatibility test.
- **Aternos stopped / refused connection:** wait for a human to start the intended game session; do not increase reconnect attempts or script the website.
- **Repeated kicks:** inspect server rules, player cap and anti-cheat configuration. Do not use retries to evade them.
- **Resource critical state:** AXIOM pauses live clients. Lower the configured cap; do not disable the governor.
- **Unexpected chat:** player text has no administrative power. Review logs; keep `AXIOM_CHAT_COMMANDS_ENABLED=false`.

## What to preserve when reporting a fault

Include the redacted `npm run check:config` output, `npm run check:compatibility` output, the relevant `logs/axiom.log` segment, and the bot state from `status`. Never include secrets (none are required for this offline mode) or private chat content unnecessarily.
