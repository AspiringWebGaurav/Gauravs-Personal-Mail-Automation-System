# GPMAS — Scalability Model

> **Version:** 1.0 · **Classification:** Strategic  
> **Last Updated:** February 2026

---

## Current Scale (V1)

| Dimension | V1 Capacity |
|-----------|------------|
| **Users** | 1 (single-owner) |
| **Providers** | Unlimited (practically 3-5) |
| **Events** | Limited by database tier |
| **Invitations per event** | Limited by database transaction batch size (500 operations) |
| **Daily email volume** | Sum of all provider quotas |
| **Concurrent sessions** | 1 |

---

## Scaling Dimensions

### Vertical Scaling (Within V1)
| Dimension | Mechanism |
|-----------|-----------|
| **More email volume** | Add more providers with higher quotas |
| **Faster processing** | Increase cron trigger frequency |
| **More storage** | Upgrade database tier |
| **Better performance** | CDN caching optimization |

### Horizontal Scaling (V2+)
| Dimension | Mechanism |
|-----------|-----------|
| **Multiple users** | Role-based access control with user isolation |
| **Parallel processing** | Concurrent queue workers with distributed locking |
| **Multi-region** | Database replication across regions |
| **API access** | External integration layer for third-party consumers |

---

## Architectural Readiness

GPMAS V1 is designed with clean boundaries that enable future scaling:

| Boundary | Why It Enables Scaling |
|----------|----------------------|
| **Owner-scoped queries** | Adding multi-user requires only adding user context to existing query filters |
| **Queue-based execution** | Adding parallel workers requires only deploying additional processing instances |
| **Provider abstraction** | Adding new provider types requires implementing a consistent interface |
| **Audit pipeline** | Scaling observability requires only extending existing logging infrastructure |
| **API route isolation** | Each route is independently deployable and scalable |

---

## Scaling Constraints

| Constraint | Impact | Resolution Path |
|-----------|--------|-----------------|
| **Database free tier** | Operational ceiling on reads/writes/deletes per day | Tier upgrade |
| **Single-threaded processing** | Queue throughput ceiling | Parallel worker deployment |
| **Transaction batch limit** | 500 operations per atomic batch | Chunked processing with continuation tokens |
| **Provider quotas** | Daily sending ceiling per provider | Additional providers or quota upgrades |

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
