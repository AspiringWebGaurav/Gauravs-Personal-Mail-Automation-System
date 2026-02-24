# GPMAS — Data Retention Policy

> **Version:** 1.0 · **Classification:** Policy  
> **Last Updated:** February 2026

---

## Retention Principles

1. Data is retained only as long as it serves an operational or compliance purpose
2. The system owner has full authority to delete any user-generated data at any time
3. System-generated data (audit logs) is retained for accountability and compliance
4. No data is retained for marketing, profiling, or speculative future use

---

## Retention Schedule

| Data Type | Retention Period | Deletion Trigger |
|-----------|-----------------|-----------------|
| **Events** | Until owner deletes | Manual deletion by owner |
| **Participants** | Lifecycle of parent event | Cascade deletion with event |
| **Invitations** | Lifecycle of parent event | Cascade deletion with event; auto-expiry after 24 hours |
| **Queue jobs** | Until terminal state + retention period | Automatic after completion/permanent failure |
| **Audit logs** | Indefinite (compliance) | Not automatically deleted; owner can request purge |
| **Provider configuration** | Until owner modifies/deletes | Manual deletion by owner |
| **Templates** | Until owner deletes | Manual deletion by owner |
| **Burn metrics** | Rolling window (daily reset) | Automatic daily reset |
| **Session data** | Until sign-out | Automatic on session termination |

---

## Owner Rights

The system owner has full control over data lifecycle:
- **View** any data stored in the system
- **Modify** user-generated data at any time
- **Delete** any user-generated data at any time (cascade rules apply)
- **Export** — not available in V1; planned for future versions

---

## Cascade Deletion Rules

When an event is deleted, the following data is atomically removed:
- All associated participants
- All associated invitations (pending, accepted, expired)
- All associated queue jobs (pending, completed, failed)
- Event metadata and configuration

This cascade occurs as an atomic transaction — either all records are deleted or none are.

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
