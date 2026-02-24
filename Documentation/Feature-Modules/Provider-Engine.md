# GPMAS — Provider Engine

> **Module:** Provider Engine · **Version:** 1.0  
> **Classification:** Feature Module Documentation  
> **Last Updated:** February 2026

---

## What It Is

The Provider Engine is the intelligent routing core of GPMAS. It manages multiple email delivery providers, selects the optimal provider for each send operation, and ensures delivery reliability through adaptive health-aware routing and automatic failover.

---

## Why It Exists

Relying on a single email delivery provider creates an unacceptable single point of failure. Provider outages, quota exhaustion, rate limiting, and credential expiry can all cause total delivery halts. The Provider Engine exists to **eliminate this risk** by distributing sends across multiple providers intelligently.

---

## How It Behaves

### Provider Registration
- Administrators register providers with credentials, daily quotas, and priority rankings
- Each provider is immediately active and included in the sending rotation upon creation
- The system monitors each provider's health from the moment of registration

### Intelligent Selection
When an email needs to be sent, the Engine evaluates all available providers using a **penalty-based ranking model**:

- Providers are scored based on their current health, available capacity, and historical performance
- The provider with the lowest penalty score is selected for each send
- Scores are recalculated dynamically — providers recovering from issues see their penalties decrease over time

### Automatic Failover
If the selected provider fails to deliver:
1. The failure is recorded and the provider's penalty score increases
2. The next lowest-penalty provider is selected
3. The send is retried through the fallback provider
4. This cascade continues until delivery succeeds or all providers have been exhausted

### Quota Awareness
- Each provider's daily usage is tracked against its configured quota
- Providers approaching or exceeding their quota are automatically excluded from the rotation
- Quotas reset daily

### Health Monitoring
The Engine continuously monitors:
- **Consecutive failure count** — providers with sustained failures are deprioritized
- **Response latency** — slow providers receive higher penalty scores
- **Quota consumption** — exhausted providers are excluded from rotation

---

## Failure Scenarios

| Scenario | System Response |
|----------|----------------|
| Primary provider down | Automatic failover to next-priority provider |
| All providers down | Queue processing pauses; jobs remain queued for retry when providers recover |
| Provider quota exhausted | Provider excluded from rotation; remaining providers absorb workload |
| Provider credentials expired | Send failures logged; provider deprioritized until credentials are updated |
| Network timeout | Retry with exponential backoff; attempt next provider if retries exhausted |

---

## Business Implications

- **Zero single-provider dependency** — the organization's email delivery is never held hostage by one vendor
- **Self-healing operations** — provider failures are handled automatically with no human intervention
- **Cost optimization** — workload distribution prevents quota overruns that could incur additional costs
- **Vendor flexibility** — providers can be added, removed, or replaced without system downtime

---

## Risk Controls

| Risk | Control |
|------|---------|
| Provider outage | Multi-provider architecture with automatic failover |
| Quota exhaustion | Real-time tracking with automatic provider exclusion |
| Credential compromise | Provider deletion and replacement without system disruption |
| Performance degradation | Penalty scoring deprioritizes slow or failing providers |

---

## Operational Boundaries

- At least one active provider is required for any email operation
- Provider priority rankings must be manually configured by the administrator
- Daily quotas are provider-imposed constraints tracked by GPMAS, not enforced by GPMAS
- Provider health recovery is gradual — deprioritized providers are not immediately restored to full priority

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
