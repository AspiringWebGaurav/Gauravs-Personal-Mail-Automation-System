# GPMAS — Reliability Layer

> **Version:** 1.0 · **Classification:** Architecture  
> **Last Updated:** February 2026

---

## Reliability Model

GPMAS achieves operational reliability through **five complementary mechanisms** that work in concert to prevent, detect, and recover from failures at every layer of the system.

---

## Mechanism 1: Multi-Provider Redundancy

**Single point eliminated:** Email delivery service dependency

- Multiple providers operate simultaneously in an active-active configuration
- Provider selection uses a penalty-based ranking algorithm that adapts to real-time conditions
- Failed providers are automatically deprioritized; recovered providers are gradually reintroduced

**Guarantee:** No single provider outage can halt the system's delivery capability.

---

## Mechanism 2: Queue Persistence

**Single point eliminated:** Transient failure causing message loss

- All email operations are queued before execution
- Queue jobs persist through processing cycles, restarts, and provider failures
- Failed jobs are retained with retry metadata — never silently discarded

**Guarantee:** Every email that enters the system is tracked to terminal state.

---

## Mechanism 3: Atomic Transactions

**Single point eliminated:** Partial state from interrupted multi-step operations

- Operations that modify multiple records execute as atomic batches
- Either all operations succeed, or none do — no intermediate states are committed
- Used for: event creation, event deletion, invitation acceptance, cascade cleanup

**Guarantee:** Database state is always consistent and complete.

---

## Mechanism 4: Distributed Locking

**Single point eliminated:** Race conditions from concurrent access

- Critical sections acquire distributed locks before proceeding
- Lock contention is handled gracefully — concurrent requests wait or fail safely
- Used for: invitation acceptance, event deletion, queue processing

**Guarantee:** Concurrent operations cannot interfere with each other's state changes.

---

## Mechanism 5: Circuit Breaking

**Single point eliminated:** Cascading failures from degraded providers

- Providers that accumulate consecutive failures receive increasing penalty scores
- Penalty thresholds effectively "circuit break" — excluding degraded providers from selection
- Recovery is gradual — penalty scores decrease over time as providers stabilize

**Guarantee:** One degraded provider does not degrade overall system performance.

---

## Reliability Metric: Mean Time to Recovery

| Failure Type | Expected Recovery |
|-------------|-------------------|
| Single provider transient failure | Immediate (next-provider failover) |
| Provider quota exhaustion | < 24 hours (daily quota reset) |
| Provider sustained outage | Immediate failover; full recovery on provider restoration |
| Network interruption | Retry with backoff; automatic on connectivity restoration |
| System halt activation | Immediate on administrator deactivation |

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
