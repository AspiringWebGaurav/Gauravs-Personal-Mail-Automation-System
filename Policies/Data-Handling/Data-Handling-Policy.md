# GPMAS — Data Handling Policy

> **Version:** 1.0 · **Classification:** Policy  
> **Last Updated:** February 2026

---

## Data Classification

| Classification | Examples | Handling |
|---------------|----------|---------|
| **Owner identity** | Email, display name, profile photo | Collected via OAuth; retained during active session |
| **Recipient data** | Invitee email addresses | Collected at invitation; retained with event lifecycle |
| **Operational data** | Event details, template content, scheduling info | User-generated; retained until user deletion |
| **System data** | Audit logs, send records, burn metrics | System-generated; retained per retention policy |
| **Configuration data** | Provider settings, system preferences | User-configured; retained until modification |

---

## Data Lifecycle

```
Collection → Validation → Processing → Storage → Usage → Retention → Deletion
```

| Phase | Principle |
|-------|-----------|
| **Collection** | Minimum necessary for function; no speculative gathering |
| **Validation** | Input sanitization and type checking at every boundary |
| **Processing** | Data is processed only for its stated purpose |
| **Storage** | Secure database with row-level access restrictions |
| **Usage** | Data is used only within the scope of the operation that collected it |
| **Retention** | Data is retained only as long as operationally necessary |
| **Deletion** | Owner can delete any user-generated data at any time |

---

## Data Sharing

| Recipient | Data Shared | Purpose | Legal Basis |
|-----------|-------------|---------|-------------|
| Email providers | Recipient email, email content | Delivery execution | Legitimate interest |
| Identity provider | Authentication tokens | User verification | Contractual necessity |
| No other parties | — | — | — |

**GPMAS does not sell, trade, or monetize user data under any circumstances.**

---

## Data Security Controls

| Control | Implementation |
|---------|---------------|
| Access restriction | Row-level security; owner-only data access |
| Transport encryption | HTTPS enforced on all communications |
| Authentication | OAuth 2.0 with session management |
| Input validation | Server-side validation on all data inputs |
| Token security | Cryptographic generation + hashing |

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
