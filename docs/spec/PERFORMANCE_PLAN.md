# AXIOM — Performance and Hardware Validation Plan

## 1. Current feasibility conclusion

**No AXIOM hardware benchmark has been run.** The reported device headroom is not enough to certify five clients or local Ollama.

| Workload | Status | Assessment |
|---|---|---|
| Chromebook Linux baseline | UNKNOWN | Celeron N4500, 2 threads, 4 GB RAM, reported 0.52 GB available needs direct measurement. |
| Ollama idle/model/inference | UNKNOWN | Qwen2.5 0.5B is likely too close to current headroom once model/runtime/KV/desktop pressure are included. Do not keep it loaded without preflight. |
| Android Termux baseline | UNKNOWN | Android 16 memory pressure, Doze, thermal, and Termux build state are device-specific. |
| 1/2/3/5 Mineflayer clients | UNKNOWN | Five configured identities are not a five-client capacity result. |
| Remote communication | UNKNOWN | Must measure private-link latency, failures, bytes, and TLS overhead. |
| NEXUS benchmark figures | SIMULATED / non-transferable | Different topology/code/hardware; not AXIOM evidence. |

## 2. Instrumentation requirements

`ResourceMonitor` samples at a bounded interval (initially 5 s) and emits a compact time-series row:

```text
wallTime, monotonicMs, process.rss, heapUsed, heapTotal, heapLimit,
external, arrayBuffers, cpuUserMs, cpuSystemMs, cpuPercent,
eventLoopP50/P95/P99, eventLoopMax, loadAverage?, memAvailable?,
batteryPercent?, batteryState?, temperature?, activeBots, liveCap,
pathfinderActive, queueDepths, cacheSizes, listeners, timers,
dbLatencyP95, networkTx/Rx, providerInFlight, providerLatencyP95
```

A `?` metric is recorded as `unavailable`, including its reason, never zero. Process RSS and V8 heap are both mandatory. CPU is sampled from process delta rather than a single instantaneous host load. Use `perf_hooks.monitorEventLoopDelay` and reset/report bounded histograms. Battery/thermal adapters must be platform-specific and non-fatal.

`TimerRegistry`, `ScopedListeners`, `BoundedQueue`, and `BoundedCache` expose count/size/oldest-age metrics. Every interval has a named owner and cleanup closure.

## 3. Benchmark rules

- Perform on a privately controlled, version-compatible test server after the compatibility gate, never by loading/probing Aternos.
- Record raw JSON/CSV, command line, config hash, exact Node/JDK/package-lock/server build, ambient state, and failures under `benchmarks/results/<utc-run-id>/` outside Git unless a small representative report is approved.
- Disable dashboard browser clients except where the scenario says otherwise. No synthetic result is labeled measured.
- Run each steady scenario three times after a warm-up; record median and worst run. Let device cool/charge state be recorded between runs.
- A stage does not progress based on a mean alone: no fatal OOM, no uncontrolled disconnects, no unreconciled ledger errors, no sustained critical resource state, and no unacceptable thermals/battery policy violation.

## 4. Required benchmark matrix

### Android/Termux

| ID | Workload | Procedure | Required output |
|---|---|---|---|
| T-0 | Baseline Termux process | Start AXIOM core with zero Mineflayer imports/clients for 20 min. | RSS/heap/CPU/lag, SQLite WAL/latency, timers/listeners, device MemAvailable. |
| T-1 | One live client | One idle 10-min soak, then 20-min safe navigation/observation script at tiny view distance. | Per-bot incremental RSS, packet errors, p95 lag, CPU, disconnect reason. |
| T-2 | Two live clients | Repeat with staggered logins and disjoint paths. | Same plus collision/block-claim/path scheduling behavior. |
| T-3 | Three live clients | Repeat only after T-2 acceptance. | Same plus aggregate ledger/control-plane latency. |
| T-5 | Five live clients | Stagger all five; 60-min mixed safe workload. | Peak/post-GC RSS, p95/p99 lag, CPU, battery drain, thermal, SQLite, task correctness, loss/reconnect record. |
| T-P | Pressure drill | At each accepted cap create controlled heap/CPU/queue pressure without killing device. | Governor transitions, persisted paused tasks, safe-stop behavior, recovery. |

### Chromebook/Ollama

| ID | Workload | Procedure | Required output |
|---|---|---|---|
| C-0 | Linux/ChromeOS baseline | Record `MemAvailable`, CPU/temp/battery before Ollama. | Baseline snapshot. |
| C-1 | Ollama idle | Service started, no model loaded, 20 min. | RSS/CPU/listening exposure. |
| C-2 | Model loaded | Pull/load exactly recorded `qwen2.5:0.5b` artifact, no generation, 20 min. | model tag/digest/size, service RSS, MemAvailable, load time. |
| C-3 | Inference | Fixed 100 JSON/chat prompts at two bounded contexts. | valid JSON/schema/semantic rates, p50/p95 TTFT/total latency, tokens/s if available, peak CPU/RSS/temp. |
| C-4 | Combined Chromebook workload | C-2/C-3 while normal expected Chromebook desktop/browser load is present; do not hide pressure. | delta from C-2/C-3, responsiveness and thermal/battery evidence. |
| N-1 | Remote overhead | Android runs a 100-request mock and 100 real approved request sequence through secured route. | DNS/connect/TLS/response p50/p95, bytes TX/RX, errors, reconnect behavior. |

## 5. Adaptive governor behavior

Thresholds are **not fixed before measurement**. The initial config derives conservative warning/critical values from a device calibration file and requires hysteresis/hold windows. Inputs: RSS, heap/heap-limit ratio, `MemAvailable` when trustworthy, event-loop p95, CPU saturation, battery/thermal availability, DB p95, queue depth, provider latency, and active pathfinders.

| State | Permitted work | Required response |
|---|---|---|
| `NORMAL` | certified live cap, bounded scans, selected provider | normal telemetry/coalesced dashboard |
| `CONSTRAINED` | safety, persistence, active leases; reduced optional work | stop proactive chat, reduce scan radius/frequency/context, one pathfinder, no new low-priority task, dashboard coalesce |
| `CRITICAL` | safety, checkpoint, orderly safe-stop, persistence | provider off, no new action, persist paused task state, reduce live cap only after safe park, notify Discord/dashboard |
| `RECOVERY` | staged recovery after sustained healthy window | resume persisted work by priority; never jump cap automatically above last certified/operator cap |

Pressure action ordering preserves: (1) life/safe stop, (2) checkpoint/ledger transaction, (3) connection protocol, (4) recovery state, (5) operator notifications; it sheds proactive chat, AI, exploration scans, map detail, dashboard frequency, and low-priority work first.

## 6. Bounds and targets

Targets are acceptance **limits**, not claims of current performance:

- One active AI generation, three waiting requests maximum; requests beyond this return typed backpressure.
- One active A* computation initially; pathfinder `tickTimeout` starts at ≤10 ms and must be tuned only if lag evidence supports it; total action deadlines bounded.
- Chat: 64 threads, 12 turns/thread, 30 min TTL, 100 queued outbound messages maximum with expiry/drop audit.
- Dashboard: compact snapshot ≤64 KiB, coalesced emission no faster than 1 Hz normal, slow client disconnect threshold/byte cap.
- Event buffer: 1,000 compact records maximum; audit database retention from configuration.
- No unbounded `setInterval`, retry loop, map cache, entity history, or world snapshot.

## 7. Termux and SQLite preflight

Before persistence implementation acceptance, verify on the actual phone: `node --version`; `require('node:sqlite')`; create/transaction/rollback/backup/WAL/reopen test in app-private `$HOME`; `PRAGMA foreign_keys`; filesystem lock behavior; readable metrics; and graceful Termux background/wake-lock behavior. Do not use `/sdcard`/shared storage for WAL. Native addons such as `better-sqlite3` are not a default because Android/Bionic availability and build memory are unverified.

## 8. Result classification

A report must label each row `MEASURED`, `SIMULATED`, or `ESTIMATED`; name hardware and version; preserve negative results; state test server. A benchmark cannot certify the Aternos target, 26.2, all gameplay capabilities, or hosted-provider quotas by itself.
