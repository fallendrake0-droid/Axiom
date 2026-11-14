# AXIOM — Security Plan

## 1. Security posture

AXIOM controls game actions and has credentials for optional services, so it is default-deny. Convenience features do not cross trust boundaries. The system assumes player chat, offline-mode identity, provider responses, dashboard requests, Discord payload content, restored database rows, server text, and network failures can be malicious or malformed.

## 2. Primary threats and controls

| Threat | Risk | Required control | Verification |
|---|---|---|---|
| Offline-mode username/UUID spoofing | A player impersonates a permitted name | No privileged Minecraft chat commands; Discord immutable user-ID allowlist only; bots not OP | Spoof-name/UUID tests cannot create/cancel a task |
| Prompt injection through game chat | Model is tricked into an administrative/game action | Separate conversational ingress; quote/redact chat; closed output schema; semantic allowlist; no tools | Adversarial corpus produces no Coordinator action |
| Hallucinated/malicious AI plan | Unsafe/unavailable action | AI proposal validation + TaskManager policy + ActionExecutor allowlist | Reject raw method/shell/packet/unknown action fields |
| Discord account/name confusion | Unauthorized admin command | Numeric snowflake allowlist, interaction signature/SDK verification, no username authorization | Non-allowlisted ID gets no state mutation |
| Token/key leak | Account/provider compromise | Environment/secret manager only, strict redaction, `.gitignore`, no raw request logs | Secret-scanner and log redaction tests |
| Dashboard exposure/CSRF | Remote task control | loopback/VPN default, TLS beyond loopback, password hash, secure session cookie, CSRF/origin, rate limits, RBAC | cross-origin/unauthenticated tests are 401/403 |
| Remote Ollama MITM/LAN exposure | Prompt/privacy leak or hostile answers | private network, HTTPS, CA pinning, optional bearer token, host allowlist; never public bind | invalid cert/host fail closed |
| SQLite corruption / leakage | Task loss or sensitive audit exposure | private app storage, WAL, backup/restore checks, migrations, file permissions, retention | crash/backup/permission tests |
| Mineflayer/packet vulnerability | Game client compromise/unsafe behavior | exact lockfile, dependency review, private test server, no runtime patches, low privilege process | `npm audit` review + compatibility harness |
| Aternos misuse | Terms/server-policy violation | operator session state, bounded reconnect, no web calls, no AFK behavior | state-machine tests and audit review |

## 3. Authentication and authorization

### Discord

Only Discord slash interactions are privileged. `authorizedUserIds` contains decimal Discord user IDs, not display names, guild roles, Minecraft names, or mutable aliases. Each handler validates interaction type, command options, user ID, request freshness, and command-specific input before calling a Coordinator method. `/help` may be visible more broadly but never exposes secrets/internal topology.

Required commands:

| Command | Coordinator call | Authorization |
|---|---|---|
| `/say bot message` | `sendManualChat` | authorised operator |
| `/sayall message` | queued `sendManualChat` per connected bot | authorised operator |
| `/status` | `getStatus` | authorised viewer/operator |
| `/bots` | bot summaries | authorised viewer/operator |
| `/task text` | `submitTask` | authorised operator |
| `/stop scope` | `stopSwarm` / safe stop | authorised operator |
| `/provider name` | `setProvider` | authorised administrator |
| `/chatmode mode` | `setChatMode` | authorised operator |
| `/help` | static command description | interaction response, no secrets |

`/sayall` is rate-limited and can be declined if server/chat pressure is high; it never bypasses chat policy merely because it is manual.

### Dashboard

Use server-side session records storing a hash of session/CSRF secrets, `HttpOnly`, `Secure` (when HTTPS), `SameSite=Strict`, path-restricted cookies, rotating session ID at login, bounded session lifetime, CSRF token plus strict `Origin` for mutations, login rate limits, and audit records. Default bind `127.0.0.1`; remote access is via owner-approved VPN or TLS reverse proxy. API routes require role checks even after UI controls hide buttons.

### Minecraft

Minecraft chat has no administrative authorization. Offline profile connections are made only to the exact operator-approved `(host, port, version, authMode)` tuple. Bots must never receive OP and must not run server commands. Chat text is treated as content; even an owner typing a command in Minecraft must use Discord/dashboard for privileged work.

## 4. Secrets and data handling

- Secrets reside in host secret storage/environment; file-mode permissions restrict private config, DB, backups, and certificates.
- `ConfigLoader.redactedSnapshot()` replaces tokens, keys, passwords, private URLs, and certificate paths in logs/UI.
- Do not include secrets in error messages, Discord notifications, AI prompts, SQLite audit payloads, crash reports, or browser SSE.
- Raw player chat is off by default. Bounded thread metadata stores pseudonymous sender key where possible; retention default is 24 hours and must be owner-approved.
- Provider usage is recorded without provider prompt/response body. Dashboard inventory/task views omit precise data for unauthorized roles.
- Backups are encrypted at rest only if the owner provides a tested key-management approach; otherwise backup creation must warn and restrict filesystem permissions.

## 5. Remote Ollama

Ollama's default local HTTP API is not safe as a network service by itself. AXIOM uses an owner-managed private network and TLS-terminating/authenticating proxy or a VPN with certificate pinning. The client allowlists exactly one hostname/port, rejects plaintext external URLs and certificate errors, uses short connection timeout, hard response timeout, byte limit, and no browser-to-Ollama route. The model host does not receive Discord credentials or database access.

## 6. Secure implementation requirements

- Pin exact dependency versions after review and commit the lockfile. Re-audit before upgrades.
- Reject prototype-pollution keys (`__proto__`, `constructor`, `prototype`) and unknown properties in all parsed JSON.
- Use parameterized SQLite statements and fixed query sort/filter allowlists.
- Use `crypto.randomUUID`, cryptographically random tokens, `timingSafeEqual`, and current Node crypto APIs; never write custom crypto.
- Use `AbortController`/timeouts and output-size caps for all network/provider calls.
- Ensure BotController event listeners and timers are removed on disconnect. A controller cannot retain stale client references.
- Avoid `eval`, `Function`, shell execution, dynamic require based on input, path traversal, and deserializing executable data.
- All logs use structured redaction; errors are normalized to `DomainError` and raw causes retained only locally/redacted.

## 7. Incident runbooks

1. **Unexpected bot behavior:** authenticated `/stop scope:all`; controllers cancel movement/action; persist checkpoint; inspect assignment/event/audit IDs before restart.
2. **Suspected Discord/provider secret compromise:** disable adapter/provider config, rotate secret outside Git, invalidate dashboard sessions, review redacted audit/host access logs, and do not reuse old token.
3. **Dashboard exposure:** stop listener, revoke sessions, move to loopback/VPN, rotate bootstrap secret, review binding/firewall configuration.
4. **SQLite failure:** enter safe mode; no new tasks; safe-stop nonessential actions; retain DB/WAL copies; verify backup before recovery. Never delete corrupted data as a first action.
5. **Aternos shutdown or policy concern:** disconnect/enter `WAITING_FOR_OPERATOR`; do not reconnect or use website automation; human reviews server/terms and deliberately restarts a session if permitted.
