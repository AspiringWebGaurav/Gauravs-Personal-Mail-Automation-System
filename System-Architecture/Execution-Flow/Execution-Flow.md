# GPMAS — Execution Flow

> **Version:** 1.0 · **Classification:** Architecture  
> **Last Updated:** February 2026

---

## Execution Model

GPMAS separates **intent** from **execution**. When a user creates an invitation or schedules an email, the system records the intent as a queue job. The Execution Engine independently processes these jobs at its configured cadence.

---

## Execution Lifecycle

```
Intent → Queue → Safety Gates → Provider Selection
→ Template Rendering → Delivery Attempt → Outcome Recording
→ [Success] → Job Complete
→ [Failure] → Retry Scheduling → Re-enter Queue
```

---

## Safety Gates

Before any queue processing begins, the Execution Engine evaluates three conditions:

| Gate | Condition | If Failed |
|------|-----------|-----------|
| **System Halt** | Is global emergency stop active? | Abort entire processing cycle |
| **Simulation Check** | Is simulation mode enabled? | Process normally but simulate delivery |
| **Provider Availability** | Are any active providers present? | Abort with warning log |

All three gates must pass before any job is processed.

---

## Processing Sequence

For each pending job in the queue:

1. **Acquire processing lock** — prevents duplicate processing of the same job
2. **Evaluate provider pool** — get all active, non-exhausted providers sorted by penalty score
3. **Select optimal provider** — choose lowest-penalty provider with available quota
4. **Render email template** — interpolate variables, apply branding, generate HTML
5. **Execute delivery** — call provider API with rendered content
6. **Record outcome** — create audit entry with full diagnostic context
7. **Update job state** — mark as completed, or schedule retry with backoff
8. **Release processing lock** — allow future processing if retry is needed

---

## Trigger Mechanisms

| Environment | Trigger | Frequency |
|-------------|---------|-----------|
| **Production** | Scheduled cloud function | Configurable interval (typically 30-60 seconds) |
| **Development** | Client-side polling | Configurable interval (settings page) |

Both triggers invoke the same processing logic, ensuring behavioral consistency across environments.

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
