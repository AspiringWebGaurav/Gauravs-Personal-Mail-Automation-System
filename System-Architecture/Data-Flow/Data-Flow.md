# GPMAS — Data Flow

> **Version:** 1.0 · **Classification:** Architecture  
> **Last Updated:** February 2026

---

## Primary Data Flows

### 1. Event Creation Flow
```
User creates event → API validation → Authorization check
→ Atomic write (event + metadata) → Dashboard updates via listener
```

### 2. Invitation Flow
```
Admin triggers invite → Duplicate check → Token generation
→ Token hashing → Atomic write (invite record + queue job)
→ Provider Engine selects provider → Email delivered
→ Invitee clicks link → SSR page validates token
→ Acceptance atomic write (participant + invite status update)
```

### 3. Mail Execution Flow
```
Trigger fires → Safety checks (halt? simulation? providers?)
→ Fetch pending queue jobs → For each job:
  → Provider Engine evaluates available providers
  → Optimal provider selected (penalty-based)
  → Template rendered with variable interpolation
  → Delivery attempted → Audit entry created
  → Success: job marked complete
  → Failure: retry scheduled with backoff
```

### 4. Provider Health Flow
```
Send attempt → Provider responds → Response evaluated
→ Success: penalty reduced → Provider maintains priority
→ Failure: penalty increased → Provider deprioritized
→ Quota check → If exhausted: provider excluded from rotation
```

---

## Data Boundaries

| Data | Created By | Consumed By | Stored In |
|------|-----------|-------------|-----------|
| **Events** | Admin (UI) | Dashboard, Invitation flow | Database |
| **Providers** | Admin (Settings) | Provider Engine, Tracker | Database |
| **Templates** | Admin (Templates) | Execution Engine | Database |
| **Queue jobs** | Invite/Send flows | Execution Engine | Database |
| **Audit entries** | All operations | Sent Tracker, compliance | Database |
| **Invitations** | Invite flow | SSR acceptance pages | Database |
| **Burn metrics** | All database operations | Burn Monitor dashboard | Database |

---

## Data Integrity Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| No orphaned records | Cascade deletion with atomic transactions |
| No duplicate sends | Multi-layer deduplication at invite, queue, and delivery levels |
| No partial state | Atomic batches for multi-step operations |
| No concurrent corruption | Distributed locking on critical paths |

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
