# GPMAS — Sent Tracker

> **Module:** Sent Tracker · **Version:** 1.0  
> **Classification:** Feature Module Documentation  
> **Last Updated:** February 2026

---

## What It Is

The Sent Tracker is the real-time observability dashboard for all mail operations. It provides a live-updating feed of every email send attempt, invitation event, and system action — with full diagnostic detail accessible through expandable log entries.

---

## Why It Exists

Without centralized, real-time delivery tracking, email operations become a black box. The administrator has no way to know whether emails were delivered, which provider handled them, or what caused failures. The Sent Tracker eliminates this blindness by capturing every operation with full traceability.

---

## How It Behaves

### Real-Time Feed
- Log entries appear automatically as operations complete — no page refresh required
- Entries are ordered by most recent first
- Each entry displays status, recipient, timestamp, and provider at a glance
- Clicking an entry expands full diagnostic details

### Log Entry Structure

| Field | Description |
|-------|-------------|
| **Status** | Sent (green), Failed (red), Pending (amber) |
| **Recipient** | Email address the message was sent to |
| **Timestamp** | Operation initiation and completion times |
| **Provider** | Which email provider handled the delivery |
| **Event** | Associated event name (if applicable) |
| **Error** | Failure description with diagnostic context (if applicable) |
| **Retry Count** | Number of send attempts for this job |

### Audit Integration
The Sent Tracker surfaces data from the underlying audit service, which captures:
- Every create, send, retry, and delete operation
- The identity of the acting user
- The provider used and its response behavior
- Duration of each operation
- Idempotency keys for duplicate detection

---

## Failure Scenarios

| Scenario | Tracker Behavior |
|----------|-----------------|
| Email delivered successfully | Green status entry with provider and timing details |
| Email delivery failed | Red status entry with error message; retry count shown |
| Email pending in queue | Amber status entry indicating awaiting processing |
| Event deleted | Associated log entries retain diagnostic value but event reference shows "Deleted" |
| No operations logged | Clean empty state with instructional content |

---

## Business Implications

- **Complete transparency** — every email that enters the system can be traced from creation to final outcome
- **Proactive issue detection** — failure patterns become visible before they escalate
- **Compliance readiness** — the audit trail provides the evidentiary foundation for compliance reviews
- **Stakeholder confidence** — delivery success rates are demonstrable, not assumed
- **Diagnostic speed** — when issues occur, the root cause is immediately visible in the expanded log entry

---

## Operational Boundaries

- The Tracker displays the most recent entries for performance optimization
- Real-time updates require an active connection; offline viewing is not supported
- Log entries are retained according to the data retention policy
- The Tracker is read-only — it does not provide controls to modify or retry operations

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
