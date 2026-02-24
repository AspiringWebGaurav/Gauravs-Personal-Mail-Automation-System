# GPMAS — Failure Handling & Recovery Philosophy

> **Version:** 1.0 · **Classification:** Engineering Documentation  
> **Last Updated:** February 2026

---

## Failure Philosophy

GPMAS is designed with the assumption that **failure is inevitable**. Networks will drop. Providers will go down. Quotas will be exhausted. Credentials will expire. The question is never "will failure occur?" — it is "how does the system respond when failure occurs?"

The answer: **automatically, gracefully, and traceably**.

---

## Failure Classification

| Category | Examples | System Treatment |
|----------|----------|-----------------|
| **Transient** | Network timeout, provider busy, rate limiting | Automatic retry with backoff |
| **Provider** | Quota exhausted, credentials expired, service outage | Provider deprioritization + failover |
| **Systemic** | All providers down, database unavailable | Graceful degradation; queue preservation |
| **Operational** | Incorrect configuration, missing provider | Clear error messaging; operation blocked |
| **Data integrity** | Concurrent modification, orphaned records | Atomic transactions + distributed locks |

---

## Recovery Mechanisms

### Exponential Backoff
Transient failures trigger retries with increasing delays:
- First retry: minimal delay
- Subsequent retries: progressively longer intervals
- Maximum retry count: configurable per operation type
- After exhaustion: job transitions to permanent failure state

### Provider Cascade
When the selected provider fails:
1. Penalty score increases for the failed provider
2. Next-lowest-penalty provider is selected automatically
3. Operation retries through the fallback provider
4. Process repeats until delivery succeeds or provider pool is exhausted

### Queue Persistence
Failed jobs are never silently discarded:
- Jobs remain in the queue with retry metadata
- Each retry attempt is independently logged
- On permanent failure, the job retains full diagnostic context
- The administrator can identify failed jobs through the Sent Tracker

### Emergency Stop
For catastrophic scenarios, the global system halt:
- Immediately stops all queue processing
- Prevents new email operations from initiating
- Preserves all queue state for post-recovery processing
- Can be deactivated to resume normal operations

---

## Recovery Prioritization

| Priority | Scenario | Recovery Path |
|----------|----------|---------------|
| **P0** | Data integrity compromise | Atomic rollback; no partial writes committed |
| **P1** | All providers exhausted | Queue pauses; resumes automatically when providers recover |
| **P2** | Individual provider failure | Automatic failover to remaining healthy providers |
| **P3** | Individual send failure | Retry with exponential backoff |
| **P4** | Non-critical warning | Logged; no operational impact |

---

## What the System Will NOT Do

- Will not retry indefinitely — maximum retry counts prevent runaway loops
- Will not send through a known-bad provider — penalized providers are deprioritized
- Will not silently drop messages — every job's terminal state is recorded
- Will not recover from invalid configuration — configuration errors require human correction
- Will not auto-fix expired credentials — credential management is the administrator's responsibility

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
