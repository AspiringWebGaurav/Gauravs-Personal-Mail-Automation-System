# GPMAS — High-Level System Design

> **Version:** 1.0 · **Classification:** Architecture  
> **Last Updated:** February 2026

---

## System Topology

GPMAS follows a **three-tier serverless architecture** with edge distribution:

```
┌──────────────────────────────────────────────────────────────────┐
│                    Presentation Tier                              │
│  PWA Client · Mobile-first UI · SSR Legal Pages · SSR Invites    │
├──────────────────────────────────────────────────────────────────┤
│                    Application Tier                               │
│  API Routes · Server Actions · Orchestration Logic               │
│  Provider Engine · Execution Engine · Lock Manager               │
├──────────────────────────────────────────────────────────────────┤
│                    Data Tier                                      │
│  Cloud Firestore · Provider APIs · Audit Store                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Component Catalog

### Presentation Components
| Component | Responsibility |
|-----------|---------------|
| **App Shell** | Layout container with navigation, theming, and loading states |
| **Bottom Navigation** | Five-tab primary navigation (Home, Templates, Providers, Tracker, Settings) |
| **System Footer** | Global footer with legal links and version identifier |
| **SSR Shell** | Standalone shell for server-rendered pages (legal, invitations) |

### Application Components
| Component | Responsibility |
|-----------|---------------|
| **Provider Engine** | Multi-provider routing, health monitoring, penalty scoring, failover |
| **Execution Engine** | Queue processing, retry scheduling, simulation mode |
| **Lock Manager** | Distributed locking for concurrent access control |
| **Invite Manager** | Token generation, expiry management, atomic acceptance |
| **Burn Engine** | Resource usage tracking, predictive forecasting, tier alerting |
| **Audit Service** | Financial-grade logging of all system operations |

### Data Components
| Component | Responsibility |
|-----------|---------------|
| **Event Store** | Event lifecycle management (create, read, update, delete) |
| **Provider Store** | Provider configuration and credential storage |
| **Queue Store** | Mail queue with job state management |
| **Template Store** | Email template library with variable support |
| **Settings Store** | System configuration and feature flags |

---

## Cross-Cutting Concerns

| Concern | Implementation |
|---------|---------------|
| **Authentication** | OAuth 2.0 via Google Identity; enforced on every route |
| **Authorization** | Owner UID verification on every API boundary |
| **Observability** | Audit service + Sent Tracker + Burn Monitor |
| **State management** | Zustand stores for client state; Firestore for persistent state |
| **Error handling** | Structured error responses with diagnostic context |

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
