# AXIOM — Chromebook Ollama Feasibility Investigation

**Status:** Investigation design and current evidence boundary. No Chromebook was available to this review, so this document contains no measured Ollama result.

## 1. Current conclusion

**VERDICT: UNKNOWN / NOT CERTIFIED.**

The owner-reported Chromebook is `sasuke`, ChromeOS/Linux, Intel Celeron N4500 (two CPU threads), 4 GB RAM, and approximately 0.52 GB available at one reported point. That is not sufficient evidence to certify `qwen2.5:0.5b`, especially while normal Linux applications remain open. It is an indication of tight headroom, not an RSS, model-load, inference, thermal, or reliability measurement.

AXIOM must keep Ollama disabled and `keep_alive: "0"` until the C-0 through C-4 measurements below are retained. This is not a recommendation to close user applications merely to obtain a passing result: C-4 explicitly measures the intended concurrent Linux workload.

## 2. Question under test

> Can the Chromebook run the exact, recorded Ollama model for bounded AXIOM requests while the operator's representative Linux applications are active, without OS/container memory pressure, unacceptable user responsiveness loss, unsafe thermal/battery condition, or unacceptable structured-output reliability?

The result may be `PASS_FOR_BOUNDED_USE`, `FAIL`, or `INCONCLUSIVE`. It must not be extrapolated to five Minecraft clients, Android capacity, a different model quantisation, an unrecorded ChromeOS update, or paid-provider failover.

## 3. Preconditions and safety

1. Obtain operator approval and use only the local Chromebook/Linux container. Do not benchmark against Aternos or the target Minecraft server.
2. Record ChromeOS version, Linux container distribution/kernel, Ollama version, exact model tag/digest/size/quantisation, Node version if using the AXIOM client harness, AC/battery state, ambient temperature if available, and the list of concurrently running Linux applications.
3. Do not use credentials, real player chat, Discord tokens, private endpoint addresses, or paid provider calls in prompts/logs.
4. Preserve raw command output and timestamps under a run ID outside Git. A failed or stopped run is evidence and must be retained.
5. Keep the model unloaded between phases unless that phase tests loaded/idle residency. Never set persistent model keep-alive merely to improve a benchmark.

## 4. Representative concurrent workload

C-4 must reflect the owner's actual Linux usage, not a cleaned-up demo. Before the run, the operator records each concurrently active application/process and why it is representative. Examples may include a code editor, terminal, browser inside Linux, local development tooling, or any other workload the owner normally leaves open. ChromeOS host applications should also be noted because they compete for physical RAM even if their process telemetry is not fully visible inside the Linux container.

The report must name the chosen workload and whether it was idle, interactive, or actively compiling/rendering. It must not claim that an omitted browser/IDE workload was covered.

## 5. Measurement protocol

Use a unique UTC run ID, for example `C-2026-11-14T120000Z`. Capture the following before, during, and after each phase:

```text
UTC timestamp, phase, model tag/digest, process IDs,
/proc/meminfo MemAvailable/MemFree/SwapFree,
free -b, uptime/load, vmstat sample,
ps RSS/CPU for ollama and representative Linux applications,
Ollama service RSS/CPU, inference latency, result validity,
battery/thermal data if available, user-responsiveness observation,
OOM/kill/error evidence, and application/container restarts.
```

Where a metric/tool is unavailable in the Linux container, store `unavailable` plus the command/error. Do not replace it with zero.

### C-0 — Baseline with normal Linux applications

With the representative applications running and Ollama stopped/unloaded, record at least 10 minutes of idle samples plus one short normal interaction in each application. Capture:

```bash
uname -a
cat /etc/os-release || true
free -b
awk '/MemTotal|MemAvailable|MemFree|SwapTotal|SwapFree/ {print}' /proc/meminfo
uptime
ps -eo pid,ppid,comm,%cpu,rss,args --sort=-rss | head -n 40
```

Record whether the Linux container exposes battery/thermal data; do not infer host temperature when it does not. This phase establishes actual residual headroom under ordinary use.

### C-1 — Ollama service idle

Start Ollama without loading a model and sample for 20 minutes while the same representative applications remain active. Record its PID/RSS/CPU, exposed listening address, container memory, errors, and impact on normal interaction. The listener must remain local/private; this phase does not authorise remote exposure.

### C-2 — Exact model loaded, no generation

Record the exact model artifact before/after loading. Load the approved `qwen2.5:0.5b` candidate without generation and sample for 20 minutes. Capture load duration, process RSS/CPU, `MemAvailable`, swap changes, CPU load, errors, and any app/container termination. The result must state whether the model remains resident or unloads after the configured safe `keep_alive: "0"` policy.

### C-3 — Bounded AXIOM-style inference

With the same applications active, issue the fixed non-secret corpus from `AI_PROTOCOL.md` at bounded 512, 1024, and 2048-context settings. The corpus contains 100 plan, 100 malformed/prompt-injection, and 100 chat fixtures; it is not a free-form demo. Use one request in flight and the proposed response-byte/time caps.

For every request record outcome (`ok`, `timeout`, `unavailable`, `invalid_response`, or rejected), first-token/total latency where available, response bytes, valid JSON rate, closed-schema validity, semantic acceptance, unsafe-proposal rate, and service/process metrics. A model returning syntactically valid JSON but unsafe/invalid semantic plans does not pass planning use.

### C-4 — Combined interactive workload

Repeat C-2 and C-3 while the representative Linux applications are used normally. Log start/end and major interaction points. Record deltas from C-0/C-2, missed/slow interactions, user-visible freezes, kernel/container OOM/error events, model/server restarts, and thermal/battery evidence when observable.

Do not close the workload after a pressure event to turn a failing C-4 run into a pass. If the system becomes unsafe/unresponsive, stop the run, preserve evidence, unload the model, and classify `FAIL` or `INCONCLUSIVE`.

## 6. Decision rules

The owner and integrator must approve thresholds from measured C-0 baseline before the run. At minimum, a bounded-use pass requires all of the following:

- no OOM kill, container/application crash, persistent swap thrash, or unexplained service restart;
- a documented remaining-memory reserve that stays above the owner-approved C-0-derived floor during C-2/C-4;
- no sustained CPU saturation or event-driven responsiveness failure that prevents normal representative application use;
- no thermal/battery policy breach where those metrics are available; unavailable hardware telemetry remains a limitation, not a pass;
- recorded p50/p95 total latency and a response timeout suitable for the selected AXIOM operation;
- the owner-approved JSON-schema and semantic-safety rate for the fixed corpus; and
- a successful model unload/recovery observation, because AXIOM begins with `keep_alive: "0"`.

A `FAIL` means Ollama remains disabled for AXIOM on this Chromebook. An `INCONCLUSIVE` means a measurement prerequisite or evidence set is missing; it is not permission to enable the provider. A `PASS_FOR_BOUNDED_USE` permits only the recorded model/version/context/concurrency/workload envelope and must be re-run after material ChromeOS, Ollama, model, or workload changes.

## 7. Result template

```text
runId:
classification: MEASURED | INCONCLUSIVE | FAIL | PASS_FOR_BOUNDED_USE
hardware/container:
representative Linux applications:
ChromeOS-host workload noted:
Ollama version:
model tag/digest/size/quantisation:
C-0 baseline summary:
C-1 idle summary:
C-2 loaded summary:
C-3 inference p50/p95, JSON/schema/semantic result:
C-4 combined-workload summary:
peak RSS / MemAvailable / swap evidence:
CPU / thermal / battery evidence:
errors, OOMs, restarts:
allowed AXIOM configuration if any:
limitations:
raw artefact paths:
operator/integrator sign-off:
```

## 8. Consequences for AXIOM provider policy

Until a measured pass exists, `OllamaProvider` remains disabled. No automatic provider failover may treat Ollama as healthy based on a static URL or model name. If the Chromebook fails, the safe alternatives are deterministic no-AI/clarification handling or an explicitly approved provider that separately proves current £0 entitlement, security, rate limits, and budget controls. A model capability or a free-tier claim is never inferred from this Chromebook benchmark.
