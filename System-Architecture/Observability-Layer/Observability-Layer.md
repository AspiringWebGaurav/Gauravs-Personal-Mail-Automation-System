# GPMAS — Observability Layer

> **Version:** 1.0 · **Classification:** Architecture  
> **Last Updated:** February 2026

---

## Observability Philosophy

In GPMAS, observability is a **design constraint**, not an operational add-on. The system is designed so that its internal state is always knowable, its operational history is always traceable, and its health is always assessable — without requiring access to code, logs, or databases.

---

## Observability Pillars

### Pillar 1: Sent Tracker (Real-Time Operations)
**What it shows:** Live feed of every email operation — send attempts, successes, failures, retries

| Capability | Detail |
|------------|--------|
| **Live updates** | New entries appear automatically without page refresh |
| **Status classification** | Sent (green), Failed (red), Pending (amber) |
| **Diagnostic detail** | Expandable entries reveal provider, timing, error context |
| **Temporal view** | Most recent operations first |

**Answers the question: "What is happening right now?"**

---

### Pillar 2: Audit Trail (Historical Record)
**What it shows:** Immutable record of every significant system operation

| Capability | Detail |
|------------|--------|
| **Comprehensive coverage** | Every create, send, retry, accept, delete, and configuration change |
| **Actor attribution** | Who initiated each operation |
| **Temporal precision** | Exact timestamp for every entry |
| **Diagnostic context** | Provider used, response received, duration, outcome |

**Answers the question: "What happened, and why?"**

---

### Pillar 3: Provider Health (System Health)
**What it shows:** Real-time status and capacity of each registered email provider

| Capability | Detail |
|------------|--------|
| **Status indicators** | Active, Exhausted, Error, Suspended |
| **Quota tracking** | Daily usage vs. configured limit |
| **Priority ranking** | Current effective priority with penalty adjustments |
| **Health history** | Trend of failures and recoveries |

**Answers the question: "Is the delivery infrastructure healthy?"**

---

### Pillar 4: Burn Monitor (Resource Health)
**What it shows:** System resource consumption against platform limits

| Capability | Detail |
|------------|--------|
| **Daily metrics** | Database reads, writes, deletes counted per day |
| **Monthly projection** | Predictive forecast based on current usage patterns |
| **Tier alerting** | Safe (green), Warning (amber), Critical (red) |
| **Trend visibility** | Consumption patterns over time |

**Answers the question: "Are we within sustainable operating limits?"**

---

## Observability Coverage Matrix

| Operation | Sent Tracker | Audit Trail | Provider Health | Burn Monitor |
|-----------|:---:|:---:|:---:|:---:|
| Email send | ✅ | ✅ | ✅ | ✅ |
| Send failure | ✅ | ✅ | ✅ | ✅ |
| Retry attempt | ✅ | ✅ | ✅ | ✅ |
| Invite creation | — | ✅ | — | ✅ |
| Invite acceptance | — | ✅ | — | ✅ |
| Provider exhaustion | — | ✅ | ✅ | — |
| Configuration change | — | ✅ | — | — |
| System halt toggle | — | ✅ | — | — |

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
