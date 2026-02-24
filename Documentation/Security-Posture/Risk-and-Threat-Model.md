# GPMAS — Risk & Threat Model

> **Version:** 1.0 · **Classification:** Security · Confidential  
> **Last Updated:** February 2026

---

## Scope

This document provides a high-level risk assessment for GPMAS. It identifies primary threat categories, evaluates likelihood and impact, and documents the existing control mechanisms. It does not expose implementation details or describe internal defense architectures.

---

## Risk Register

### Category 1: Access & Identity

| Risk | Likelihood | Impact | Existing Control |
|------|-----------|--------|-----------------|
| Unauthorized account access | Low | Critical | Single-account lock; OAuth 2.0 with Google Identity |
| Session token theft | Low | High | Token-based sessions; secure cookie handling |
| Privilege escalation | Very Low | Critical | No role hierarchy in V1; single-owner model eliminates escalation vectors |

### Category 2: Data Integrity

| Risk | Likelihood | Impact | Existing Control |
|------|-----------|--------|-----------------|
| Concurrent data corruption | Low | High | Distributed locking + atomic transactions |
| Orphaned record creation | Low | Medium | Cascade deletion with transactional batches |
| Duplicate send execution | Low | Medium | Multi-layer deduplication at invite, queue, and delivery stages |

### Category 3: Availability

| Risk | Likelihood | Impact | Existing Control |
|------|-----------|--------|-----------------|
| Single provider outage | Medium | Medium | Multi-provider failover architecture |
| All providers unavailable | Low | High | Queue preservation; automatic retry on provider recovery |
| Database service unavailable | Very Low | Critical | Cloud provider SLA; no mitigation within GPMAS scope |
| Resource quota exhaustion | Medium | Medium | Burn Monitor with predictive forecasting and tiered alerting |

### Category 4: Compliance & Legal

| Risk | Likelihood | Impact | Existing Control |
|------|-----------|--------|-----------------|
| User data mishandling | Low | High | Privacy Policy; minimal data collection; no data selling |
| Unsolicited communications | Low | High | AUP; consent-based invitation model; volume guardrails |
| IP infringement claims | Very Low | High | Private Use License; comprehensive IP notice |

### Category 5: Operational

| Risk | Likelihood | Impact | Existing Control |
|------|-----------|--------|-----------------|
| Configuration error | Medium | Medium | Validation guards; zero-provider checks; clear error messaging |
| Undetected failure accumulation | Low | High | Real-time Sent Tracker; audit trail; provider health monitoring |
| Resource overrun | Medium | Medium | Burn Monitor with Safe / Warning / Critical tier alerting |

---

## Trust Assumptions

The system operates under the following trust assumptions:

| Assumption | Justification |
|------------|---------------|
| Google Identity Platform is reliable and secure | Industry-standard OAuth provider with established security track record |
| The database service maintains data durability | Cloud Firestore provides multi-region replication and durability guarantees |
| Email provider APIs respond honestly | Providers return accurate delivery status; GPMAS trusts but verifies through audit logging |
| The authorized owner acts in good faith | Single-owner system; the owner has complete authority and responsibility |
| The hosting platform handles network-level security | Edge protection, DDoS mitigation, and TLS termination are delegated to the hosting platform |

---

## Residual Risks

The following risks are acknowledged but accepted in V1:

| Risk | Acceptance Rationale |
|------|---------------------|
| Third-party provider data handling | Mitigated by multi-provider architecture; full elimination requires self-hosted mail infrastructure |
| No built-in backup/restore | Data durability is delegated to the database provider's built-in redundancy |
| No multi-factor authentication | Google OAuth provides inherent MFA capabilities through the identity provider |
| Single-point owner dependency | V1 design choice; multi-user access planned for V2 |

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
