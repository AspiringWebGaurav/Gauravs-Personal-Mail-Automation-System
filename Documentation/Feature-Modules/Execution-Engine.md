# GPMAS — Execution Engine

> **Module:** Execution Engine · **Version:** 1.0  
> **Classification:** Feature Module Documentation  
> **Last Updated:** February 2026

---

## What It Is

The Execution Engine is the queue processor responsible for dispatching all pending email jobs. It reads from the mail queue, selects the optimal provider through the Provider Engine, executes the delivery, handles failures with retry logic, and records every outcome in the audit trail.

---

## Why It Exists

Email delivery is inherently asynchronous and failure-prone. Rather than attempting immediate delivery (which would block the user interface and fail silently on network issues), GPMAS decouples email creation from delivery through a persistent queue. The Execution Engine processes this queue with retry guarantees, ensuring no email is silently lost.

---

## How It Behaves

### Queue Processing Model
1. The Engine is triggered at regular intervals (cron-based in production, polling-based in development)
2. Before processing, it performs three safety checks:
   - Is the global system halt active? → If yes, abort processing
   - Is the system in simulation mode? → If yes, simulate but don't send
   - Are any active providers available? → If no, abort with logged warning
3. Pending and retrying jobs are retrieved from the queue
4. Each job is processed sequentially: provider selection → template rendering → delivery execution
5. Successful sends update the job status and log the outcome
6. Failed sends trigger retry scheduling with exponential backoff

### Retry Logic
- Failed jobs are not discarded — they are marked for retry
- Each retry attempt uses exponential backoff (increasing delay between attempts)
- The provider selection is re-evaluated on each retry — a different provider may be chosen
- After maximum retry attempts are exhausted, the job is marked as permanently failed
- All retry attempts are fully logged in the audit trail

### Simulation Mode
In simulation mode, the Engine processes the queue identically to live mode — template rendering, provider selection, and variable interpolation all execute normally — but the final delivery step is simulated. No email leaves the system. All operations are logged as if they were real, enabling risk-free testing of the entire pipeline.

---

## Failure Scenarios

| Scenario | System Response |
|----------|----------------|
| System halt active | Processing aborted; jobs remain queued |
| No active providers | Processing aborted; warning logged |
| Provider selection fails | Job deferred to next processing cycle |
| Delivery timeout | Retry scheduled with exponential backoff |
| Provider returns error | Retry with next-priority provider |
| All retry attempts exhausted | Job marked as permanently failed; full diagnostic log created |
| Queue empty | Processing completes immediately with no action |

---

## Business Implications

- **No email loss** — every queued message is persisted until delivered or explicitly failed
- **Decoupled operations** — email creation never blocks the user interface
- **Automatic retry** — transient failures are recovered without manual intervention
- **Full audit coverage** — every send attempt (successful or failed) is recorded with complete context
- **Risk-free testing** — simulation mode allows complete pipeline validation without real sends

---

## Risk Controls

| Risk | Control |
|------|---------|
| Runaway processing | Global system halt immediately stops all queue processing |
| Accidental sends | Simulation mode provides a full-fidelity testing environment |
| Silent failures | Every operation is logged; failures include full diagnostic context |
| Provider exhaustion | Retry logic re-evaluates provider selection on each attempt |
| Data corruption | Queue state updates use atomic operations |

---

## Operational Boundaries

- Processing is sequential within a cycle — one job at a time
- Processing frequency is determined by the trigger mechanism (cron interval or polling rate)
- The Engine does not prioritize jobs — processing order is determined by queue insertion time
- Simulation mode must be explicitly deactivated before real sends resume

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
