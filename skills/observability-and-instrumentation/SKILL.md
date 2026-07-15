---
name: observability-and-instrumentation
version: "1.0.0"
description: Apply when adding logging, metrics, or tracing, or reviewing how a running system reports its own behaviour
license: Unlicense
metadata:
  author: ssoft
  tags:
    - observability
    - quality
---

# Skill: Observability and Instrumentation

Apply when adding logging, metrics, or tracing, or reviewing how a running system
reports its own behaviour. This skill governs instrumentation added *for* production
visibility, not test assertions or debug-session-only tracing.

- Temporary instrumentation added to chase a specific bug → `debugging` skill
  (Instrumentation Before Speculation); remove it once the bug is understood unless it's
  worth keeping permanently under this skill's rules.
- Never logging a secret, even at debug level → `security-and-hardening` skill.
- A metric showing a performance regression → `performance-optimization` skill for the
  follow-up investigation.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own logging/metrics stack and conventions, follow those instead. This skill is the fallback for projects that do not specify their own.

---

## Define "Working" Before Instrumenting

Telemetry added without a question behind it is noise. Before instrumenting a feature,
write down the 2-4 questions an on-call engineer will actually ask about it ("what
fraction of requests succeed on the first attempt?", "when it fails, why?"). Every
signal added should answer one of those questions — if the questions can't be named yet,
instrumenting now produces volume, not visibility.

## The Three Signals

- **Logs** — discrete events with context, for reconstructing what happened in one
  specific case ("this request failed, here's why").
- **Metrics** — aggregated numeric measurements over time, for spotting trends and
  triggering alerts ("error rate is up 5x since the last deploy").
- **Traces** — the path a single request/operation took across components, for
  understanding where time or an error was introduced in a multi-step flow.

Pick the signal that answers the question being asked. Logging every request to answer
a question metrics would answer better produces volume without insight.

## Log Levels

| Level | When |
|-------|------|
| Error | The operation failed and needs attention; includes enough context to act on it |
| Warn | Unexpected but recovered-from condition; worth noticing, not urgent |
| Info | Significant lifecycle events (started, stopped, config loaded) — low volume |
| Debug | Detailed internal state, off by default in production |

Do not log routine success at `Error` or `Warn` level, and do not log a real failure at
`Info` — an operator triaging by severity depends on the level being accurate.

## Structured, Not Just Formatted

Prefer structured fields (key/value pairs, a structured logging library) over a
free-form interpolated string — a log line an operator can query by field
(`request_id`, `user_id`, `status`) is far more useful under incident pressure than one
that has to be grepped and parsed by hand.

```cpp
// Harder to query later
log.error("failed to process request " + id + " for user " + user + ": " + err);

// Structured — queryable by field
log.error("request processing failed", {{"request_id", id}, {"user_id", user}, {"error", err}});
```

## Context Propagation

Attach a correlation/request ID at the entry point of an operation and propagate it
through every log line and downstream call that operation makes. Without it,
reconstructing one request's path through a system with concurrent traffic means
guessing which log lines belong together.

## What Not to Log

- Secrets, credentials, tokens, full payloads containing personal data — see
  `security-and-hardening`.
- High-frequency events inside a tight loop at a level enabled in production — this
  degrades performance and buries the signal that matters in noise.
- The same failure repeatedly without rate-limiting or deduplication when it's expected
  to recur (e.g. a retry loop) — log the first occurrence and a periodic summary, not
  every attempt.

## Metrics

- Prefer the three standard shapes — counter (monotonically increasing, e.g. requests
  served), gauge (current value, e.g. queue depth), histogram (distribution, e.g.
  latency) — over inventing a bespoke aggregation.
- Name metrics for what they measure, not for the code path that emits them — a metric
  name should survive a refactor of the code that produces it.
- A metric with no consumer (no dashboard, no alert) is dead weight — add it with the
  dashboard/alert that will use it, not speculatively.
- For a request-driven component, cover **RED** — rate, error rate, duration — on every
  endpoint and every external dependency it calls. For a resource (a queue, a pool, a
  worker), cover **USE** — utilization, saturation, errors — instead.
- Track percentiles, never a bare average — an average of latency hides the fraction of
  callers having a bad time. Read p50/p95/p99 from a histogram, not a mean.
- **Cardinality is the failure mode of metrics.** Every unique label value combination
  becomes its own time series. Labels must come from small, fixed sets (a route
  template, a status class, a provider name) — never a user ID, a raw identifier, or
  free-form error text, which belongs in logs, not in a metric label.

## Alerting

An alert should be actionable — if firing it does not lead to a specific action, it's
noise that trains the on-call to ignore alerts, including the next one that matters.
Alert on symptoms a user would notice (error rate, latency) more than on internal
implementation details, unless the internal detail reliably predicts user-facing impact.
Use two severities, not more: one that pages a human now, one that becomes a ticket for
this week's work — a third tier of "informational" alerts becomes noise that trains
people to skim past all of them, including the two that matter.

## Traces

Instrument boundaries (service calls, database queries, external API calls) rather than
every internal function call — a trace with too many spans is as hard to read as a log
with too much noise. Each span should represent a decision-relevant unit of work.

## Verify the Telemetry Itself

Instrumentation is code and can be wrong — don't call the work done without checking
the actual output. Force the path in a non-production environment and confirm: the log
line is structured and carries the correlation ID, not `[object Object]`-style noise;
the metric series appears with the expected labels; a single request can be followed
end-to-end without a broken span; and a newly added alert, fired once at a lowered
threshold, reaches the right channel.
