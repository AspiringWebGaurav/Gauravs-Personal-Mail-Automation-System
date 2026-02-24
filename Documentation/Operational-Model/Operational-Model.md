# GPMAS — Operational Model

> **Version:** 1.0 · **Classification:** Operational Documentation  
> **Last Updated:** February 2026

---

## Operating Principles

GPMAS operates under a **queue-driven, event-sourced operational model**. The system separates intent (creating an email) from execution (delivering that email) through a persistent, auditable mail queue. This decoupling provides retry resilience, failure isolation, and complete operational traceability.

---

## Operational Layers

```
┌─────────────────────────────────────────────┐
│          User Interface Layer               │
│    Create events, manage providers,         │
│    compose templates, monitor delivery      │
├─────────────────────────────────────────────┤
│          Orchestration Layer                │
│    Queue management, provider routing,      │
│    retry scheduling, audit logging          │
├─────────────────────────────────────────────┤
│          Delivery Layer                     │
│    External provider API communication,     │
│    template rendering, response handling    │
├─────────────────────────────────────────────┤
│          Persistence Layer                  │
│    Event storage, queue state, audit trail, │
│    provider configuration, user settings    │
└─────────────────────────────────────────────┘
```

---

## System States

| State | Meaning | Operations Allowed |
|-------|---------|-------------------|
| **Normal** | All systems operational, providers healthy | Full functionality |
| **Degraded** | One or more providers unhealthy or exhausted | Full functionality with reduced provider pool |
| **Halted** | Global Emergency Stop activated | Read-only; no queue processing or new sends |
| **Simulation** | Test mode active | Full pipeline executes; no real emails sent |
| **Zero-Provider** | No active providers configured | Event management only; no email operations |

---

## Processing Cadence

### Production Environment
- The Execution Engine is triggered at configurable intervals via scheduled cloud functions
- Each trigger processes all pending and retrying queue jobs
- Processing executes sequentially within a cycle to prevent race conditions

### Development Environment
- A polling mechanism replaces cron-based triggers
- Polling interval is configurable through system settings
- Behavior is functionally identical to production for testing fidelity

---

## Audit Model

Every significant system operation generates an audit entry containing:

| Field | Purpose |
|-------|---------|
| **Operation type** | What happened (send, create, delete, retry, accept) |
| **Actor** | Who initiated the action |
| **Target** | What resource was affected |
| **Timestamp** | When the operation occurred |
| **Provider** | Which delivery service was involved (if applicable) |
| **Outcome** | Success, failure, or intermediate state |
| **Duration** | How long the operation took |
| **Context** | Additional diagnostic information |

The audit trail is immutable — entries cannot be modified or deleted post-creation. This provides compliance-ready evidentiary records.

---

## Concurrency Model

GPMAS handles concurrent access through two mechanisms:

### Distributed Locking
Critical operations that modify shared state (event deletion, invitation acceptance) acquire distributed locks before proceeding. This prevents race conditions between simultaneous requests.

### Atomic Transactions
Multi-step operations (create event + initialize queue; delete event + cascade all related records) execute as atomic batches. Either all operations succeed, or none do — ensuring no orphaned or inconsistent records.

---

## Resource Awareness

The Burn Monitor continuously tracks system resource consumption:

| Metric | Tracking |
|--------|----------|
| **Database reads** | Counted per day against free-tier limits |
| **Database writes** | Counted per day against free-tier limits |
| **Database deletes** | Counted per day against free-tier limits |
| **API calls** | Tracked per provider per day |

Predictive monthly forecasting calculates projected consumption and categorizes:
- **Safe** — well within limits
- **Warning** — approaching limit boundaries
- **Critical** — projected to exceed limits before period end

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
