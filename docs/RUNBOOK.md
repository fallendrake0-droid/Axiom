# AXIOM operator runbook

## Before first connection

1. Confirm you own or have explicit permission to operate bots on the target server.
2. Start the Aternos server manually. AXIOM will never log into or automate the Aternos website.
3. Run `npm install`, copy `.env.example` to `.env`, then review the target host, port, capacity, and Ollama endpoint.
4. Confirm the server really is in offline mode, has no login plugin, and is the configured authorised target. Set `AXIOM_OFFLINE_SERVER_AUTHORIZED=true` only then.
5. Start Ollama and install the configured model (`qwen2.5:0.5b` by default). For a Chromebook/LAN deployment, add the exact private/VPN host to `AXIOM_OLLAMA_TRUSTED_HOSTS` and use the same host in `AXIOM_OLLAMA_BASE_URL`.
6. Run `npm run check:config`, `npm run check:compatibility`, and `npm run check:ollama`.
7. `AXIOM_MAX_LIVE_CONNECTIONS=5` launches the requested five-client target with login staggering. Keep the resource governor enabled; it can reduce this cap if measurements show pressure.
8. Run `npm run dry-run`, then `npm start`.

## Expected states

- `ONLINE`: Mineflayer emitted `spawn`; this is the only connection-success signal.
- `BACKOFF`: a temporary failure occurred; a bounded retry is scheduled.
- `WAITING_FOR_OPERATOR`: retries ended or the server appears unavailable. Start/repair the server manually, then use `start <bot>` in the running console or restart AXIOM.
- `PAUSED_CAPACITY`: a valid logical bot is queued because the configured or resource-safe connection cap is reached.
- `FAILED`: authentication/configuration/unsupported-protocol or another non-retryable outcome requires review.

## Five-bot capacity and Ollama control

The configured target is five clients. AXIOM starts them in identity order with join staggering and gives the central Ollama brain a compact state for **all five** on each plan. It requires every accepted plan to assign every identity exactly once. If a device is constrained, the resource governor can still queue or pause clients; that is a real safety state, not a claim that all five are connected.

The current deterministic execution allowlist is deliberately narrow: `idle` and one throttled `chat` response per plan. If Ollama is unhealthy, inspect `status`, the configured endpoint, and model availability; AXIOM will preserve safety behavior but will not fabricate AI plans or fall back to a paid service. Do not change identity names or disable the resource governor to force capacity.

## Death and loss

AXIOM records a compact death snapshot in `AXIOM_DATA_DIR/deaths.jsonl`; it does not retrieve items yet. Treat every death as an incident. Stop the bot or reduce capacity if danger recurs. Do not report items as recovered unless a future verified recovery workflow confirms inventory changes.

## Incident response

- **Unsupported protocol:** do not set experimental mode as a substitute for testing. Update/pin dependencies only after a compatibility test.
- **Aternos stopped / refused connection:** wait for a human to start the intended game session; do not increase reconnect attempts or script the website.
- **Repeated kicks:** inspect server rules, player cap and anti-cheat configuration. Do not use retries to evade them.
- **Ollama unhealthy/model unavailable:** ensure the endpoint is in the trusted-host list, the Ollama service is reachable, and `qwen2.5:0.5b` (or the configured tag) is installed. No paid fallback is used.
- **Resource critical state:** AXIOM pauses live clients. Lower the configured cap; do not disable the governor.
- **Unexpected chat:** player text has no administrative power. Review logs; keep `AXIOM_CHAT_COMMANDS_ENABLED=false`.

## What to preserve when reporting a fault

Include the redacted `npm run check:config` output, `npm run check:compatibility` output, the relevant `logs/axiom.log` segment, and the bot state from `status`. Never include secrets (none are required for this offline mode) or private chat content unnecessarily.
