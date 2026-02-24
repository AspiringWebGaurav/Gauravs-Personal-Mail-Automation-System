# GPMAS — Security Posture

> **Version:** 1.0 · **Classification:** Security Documentation  
> **Last Updated:** February 2026

---

## Security Philosophy

Security in GPMAS is not a bolt-on layer — it is a structural property of the system. Every boundary, every data flow, and every state transition is designed with the assumption that it will be tested by adversarial conditions.

---

## Authentication Model

| Property | Implementation |
|----------|---------------|
| **Method** | OAuth 2.0 via Google Identity Platform |
| **Session management** | Token-based; session expires on sign-out |
| **Account restriction** | Single pre-authorized account only |
| **Unauthorized access** | Detected at sign-in; session is immediately terminated |

---

## Authorization Boundaries

Every API route and server action enforces authorization independently:

| Check | Enforcement Point |
|-------|-------------------|
| **Is the user authenticated?** | Every API entry point |
| **Is the user the authorized owner?** | Every API entry point (UID verification) |
| **Does the requested resource belong to the user?** | Every database query (owner field filtering) |

There is no "trust" inherited from previous successful requests. Each request is evaluated independently.

---

## Data Security

| Measure | Application |
|---------|-------------|
| **Invitation tokens** | Cryptographically generated + hashed before storage |
| **Provider credentials** | Stored in database with access restricted to owner only |
| **Environment variables** | Sensitive configuration stored outside codebase |
| **Transport security** | HTTPS enforced on all communications |
| **Database access** | Row-level security rules restrict access to authenticated owner |

---

## Threat Surface Awareness

| Attack Vector | Mitigation |
|--------------|-----------|
| **Unauthorized access** | Single-account lock; unknown users are rejected at session creation |
| **Session hijacking** | Token-based auth with secure session management |
| **Invitation link brute-force** | Cryptographic token generation; infeasible to guess |
| **Replay attacks** | One-time-use tokens; accepted invitations cannot be re-used |
| **CSRF** | Next.js framework-level protections + server-side validation |
| **Data exfiltration** | All database queries scoped to authenticated owner |
| **Concurrent manipulation** | Distributed locking on critical operations |

---

## Principle of Least Privilege

- The system requests only the minimum OAuth scopes necessary for authentication
- Database rules restrict each user to only their own data
- API routes validate ownership before any operation
- No administrative backdoor or override mechanism exists

---

## Security Boundaries Explicitly Not Covered

| Area | Status | Rationale |
|------|--------|-----------|
| **End-to-end email encryption** | Not implemented | Email content is transmitted via third-party providers; E2E encryption requires recipient-side support |
| **DDoS protection** | Delegated | Handled by the hosting platform (edge network) |
| **WAF (Web Application Firewall)** | Delegated | Handled by the hosting platform |
| **Penetration testing** | Not conducted | Planned for V2 audit cycle |

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
