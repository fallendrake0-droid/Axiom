# AXIOM — AI Provider and Trust Protocol

## 1. Boundary

`AiProviderManager` is the only module that knows provider SDKs/HTTP. Providers return **proposals**, never tools. `PlanValidator` validates syntax and semantics; `TaskManager` remains the authority; `ActionExecutor` accepts only typed allowlisted commands.

The manager supports the required operations:

```text
healthCheck()
interpretIntent(context)
generateTaskPlan(context)
replanTask(context)
generateChatResponse(context)
evaluateConversation(context)
summariseSwarmState(context)
```

All accept a frozen, redacted DTO and return the standard result envelope below. Provider-specific object shapes never leave `src/ai`.

## 2. Standard provider contract

```ts
ProviderResultV1 = {
  schemaVersion: 1,
  requestId: string,                 // UUID
  provider: 'ollama'|'gemini'|'groq'|'none',
  model: string | null,
  operation: 'health'|'intent'|'plan'|'replan'|'chat'|'conversation'|'summary',
  outcome: 'ok'|'disabled'|'unavailable'|'rate_limited'|'budget_exhausted'|'timeout'|'invalid_response'|'rejected',
  retryable: boolean,
  latencyMs: number | null,
  usage: { inputTokens?: number, outputTokens?: number, estimatedCostGbp?: number | null },
  value: object | null,
  safeMessage: string,
  receivedAt: string
}
```

`value` is set only after response-byte cap, JSON parse, closed-schema validation, and operation-specific semantic validation. Logged fields exclude API keys, raw prompts, cookies, full chat histories, and provider payloads by default.

## 3. Input minimisation and limits

| Operation | Input purpose | Hard cap | Output cap |
|---|---|---:|---:|
| `interpretIntent` / `generateTaskPlan` | operator text, allowed capability summary, compact inventory/role state | 8 KiB | 16 KiB |
| `replanTask` | current plan, verified progress, typed failure/safety facts | 10 KiB | 16 KiB |
| `generateChatResponse` | selected player turn, selected bot persona, bounded redacted thread | 4 KiB | 1 KiB |
| `evaluateConversation` | routing/reply-worthiness only | 2 KiB | 1 KiB |
| `summariseSwarmState` | compact dashboard-safe aggregate state | 8 KiB | 4 KiB |

Never send Minecraft credentials, Discord token, API keys, raw SQLite rows, dashboard sessions, filesystem paths, exact private address unless configured as provider endpoint, unrestricted player logs, or world chunks. The model gets an explicit system rule that quoted user text is untrusted content; validation, not prompting, is the security boundary.

## 4. Closed plan schema

A plan contains declarative objectives, not commands:

```json
{
  "schemaVersion": 1,
  "kind": "task_plan",
  "clarificationRequired": false,
  "clarificationQuestion": null,
  "summary": "Collect a small aggregate quantity of cobblestone.",
  "objectives": [{
    "localId": "collect-cobblestone",
    "kind": "collect",
    "target": {"itemId": "minecraft:cobblestone", "quantity": 64},
    "parallelism": "partitionable",
    "verification": "newly_collected",
    "requiredCapabilities": ["mine", "navigate"],
    "safetyClass": "standard",
    "dependencies": [],
    "constraints": {"dimension": "minecraft:overworld", "allowExistingStock": false}
  }],
  "assumptions": ["A safe accessible stone source exists."],
  "riskNotes": []
}
```

Allowed `kind`: `collect`, `mine`, `farm`, `craft`, `build_template`, `store`, `retrieve`, `explore_region`, `fish`, `trade`, `guard`, `combat_hostile`, `recover_items`, `inspect`. Allowed `parallelism`: `single`, `partitionable`, `spatial`, `role_based`, `serial`. Allowed verification: `newly_collected`, `held_stock`, `deposited_stock`, `crafted_output`, `block_state`, `region_visited`, `role_duration`, `operator_review`.

Closed validation requires: exactly the listed keys; UUID/string length/array caps; unique `localId`; positive integer bounded target quantity; known item/capability; supported dimension; acyclic dependencies; no conflict with protected regions; no PvP; and no objective/action not enabled by capability release state. `clarificationRequired=true` requires a question and `objectives=[]`; otherwise objectives must be non-empty. AI `workerCountHint`, if ever added, is advisory only and `0..5`; allocator ignores it unless deterministic eligibility agrees.

A semantic validator converts a plan into internal DTOs and rejects unsafe or unavailable plans. It cannot accept arbitrary coordinates unless operator supplied them and ProtectedRegionPolicy allows them.

## 5. Chat schemas

`ConversationAssessmentV1`:

```json
{"schemaVersion":1,"shouldReply":true,"priority":"direct_mention","selectedBotId":"bot-2","reason":"Player asked the addressed bot a harmless question."}
```

`ChatResponseV1`:

```json
{"schemaVersion":1,"message":"I am gathering supplies right now, but I can help after this task.","tone":"friendly","shouldSend":true}
```

The validator strips control characters, newlines, formatting injection, and game-command-like prefixes; enforces configured visible-character cap; rejects references to secrets/internal state/privileged instructions; and checks cooldown/budget before send. The model cannot choose `sayall`, a task, a provider, recipients, or a bot other than the deterministically selected response bot.

## 6. Provider-specific adapters

### Ollama

**VERIFIED transport feature:** official Ollama GitHub documentation describes `POST /api/chat`, `stream: false`, JSON-schema `format`, options, and `keep_alive`. AXIOM requests strict JSON with low temperature, a fixed model tag, hard connect/response timeouts, abort signal, byte cap, private TLS endpoint/certificate validation, one in-flight request, and no browser exposure. `keep_alive: "0"` is the safe starting value until Chromebook memory measurement passes.

### Gemini and Groq

Official JavaScript/TypeScript SDK repositories provide API-key server clients. They are optional adapters, disabled by default. Neither the existence of a SDK nor a website label proves £0 access. The manager refuses automatic invocation unless configuration explicitly acknowledges no-charge use, a nonempty remaining budget is present, and the provider health/price policy is green. The adapter uses structured-output capability where it is supported, but AXIOM validates every response regardless.

## 7. Failover/circuit behavior

- Default is one selected primary, no failover.
- A provider failure opens a bounded circuit and returns deterministic parser result or `CLARIFICATION_REQUIRED`.
- Optional automatic failover is permitted only to an explicitly enabled provider marked no-charge by the owner, within independent request budgets. It is never triggered on a malformed response (that is a trust failure), only on network/availability/rate-limit outcomes.
- `healthCheck()` performs no billable generation where provider supports a non-generating endpoint; otherwise it is disabled/explicitly counted. No periodic paid probe.
- Every provider request records timestamp, outcome, latency, model, operation, tokens if returned, and `estimatedCostGbp` only when an official price source is configured. Unknown cost stays `null`, which blocks auto failover.

## 8. Qwen2.5 0.5B evaluation plan

**UNKNOWN:** actual context length under the chosen Ollama artifact, JSON accuracy, latency, model-loaded RSS, and robustness on the Celeron. A 0.5B model must not be treated as a reliable planner. Benchmark 100 fixed plan prompts, 100 malformed/injection prompts, and 100 chat prompts at temperature 0 with 512/1024/2048 context settings. Record valid-schema percentage, semantic acceptance percentage, unsafe proposal rate, clarification usefulness, response p50/p95, load time, CPU, RSS, tokens/s, thermal/battery, and model unload recovery. The release rule is not a subjective demo: it must meet acceptance thresholds in `ACCEPTANCE_CRITERIA.md` or be limited to non-critical chat/disabled.
