# GPMAS V1 — Compliance Statement

> **Classification:** Compliance & Policy  
> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Maintained By:** Gaurav Patil

---

## 1. Data Handling Summary

GPMAS handles personal data with a principle of **minimum collection, purpose limitation, and secure processing**.

| Data Category | Collected | Stored | Shared Externally |
|--------------|-----------|--------|-------------------|
| Owner email & name | ✅ Via Google Auth | ✅ Session-scoped | ❌ Never |
| Invitee email address | ✅ At invite creation | ✅ Until event deletion | ✅ With email provider for delivery only |
| Event details | ✅ At event creation | ✅ Until deletion | ❌ Never |
| Send logs & audit records | ✅ Automatically | ✅ Retained for operations | ❌ Never |
| Email content body | ✅ At composition | ⚠️ Temporarily during send | ✅ With email provider for delivery only |
| Provider API credentials | ✅ At configuration | ✅ Encrypted at rest | ✅ With provider API for authentication |

**Key commitments:**
- No data is sold, traded, or monetized
- No advertising trackers or third-party analytics
- Data deletion is available to the owner at any time
- Audit records are maintained for compliance and accountability

---

## 2. Provider Dependency Disclosure

GPMAS relies on third-party email delivery services to transmit communications. This creates an inherent dependency:

| Aspect | GPMAS Responsibility | Provider Responsibility |
|--------|---------------------|------------------------|
| Email composition & rendering | ✅ GPMAS | — |
| Recipient targeting | ✅ GPMAS | — |
| Network transmission | — | ✅ Provider |
| Delivery to inbox | — | ✅ Provider |
| Spam filter traversal | — | ✅ Provider / Recipient |
| Quota enforcement | ✅ GPMAS tracks | ✅ Provider enforces |
| Uptime & availability | — | ✅ Provider |

**Disclosure:** GPMAS cannot guarantee the uptime, performance, or delivery success of any third-party email provider. The multi-provider architecture mitigates this risk but does not eliminate it entirely.

---

## 3. Usage Boundaries

GPMAS is designed and licensed for specific use cases within defined boundaries:

| Boundary | Description |
|----------|-------------|
| **User scope** | Single authorized owner only (V1) |
| **Communication type** | Professional, consensual, lawful correspondence |
| **Volume** | Within provider-imposed daily quotas |
| **Content** | Compliant with applicable laws and AUP |
| **Access** | Authenticated access only; no public API |
| **Invitations** | Time-limited (24 hours); single-use tokens |

Any use outside these boundaries constitutes a violation of the Terms of Service and Acceptable Use Policy.

---

## 4. Email Compliance Awareness

GPMAS operates with awareness of global email compliance requirements:

### Anti-Spam Stance
- GPMAS is **not** a bulk email marketing platform
- The system is designed for **targeted, consensual, professional correspondence**
- Unsolicited mass emails (spam) are explicitly prohibited under the AUP
- Provider quotas and system guardrails limit sending volume

### Regulatory Awareness
GPMAS respects the following regulatory frameworks:

| Regulation | Relevance |
|-----------|-----------|
| **CAN-SPAM Act (USA)** | All communications must be truthful, non-deceptive, and from an identifiable sender |
| **GDPR (EU)** | Personal data collected minimally, processed lawfully, deletable on request |
| **CASL (Canada)** | Electronic communications require consent |
| **PECR (UK)** | Marketing communications require explicit opt-in |

**Note:** Compliance with specific regulations is the responsibility of the system owner. GPMAS provides the tools and guardrails to support compliance but does not substitute for legal counsel.

---

## 5. Ethical Communication Clause

GPMAS is built on a foundation of ethical communication principles:

- **Consent:** Communications are only sent to recipients who have been explicitly invited or who have given consent
- **Transparency:** All emails clearly identify the sender and include branding attribution
- **Respect:** The system supports recipient autonomy — invitations can only be accepted voluntarily
- **Accountability:** Every operation is audited with full traceability
- **Proportionality:** System guardrails prevent excessive or disproportionate sending volumes
- **Honesty:** Email subject lines and content must accurately represent their purpose

---

## 6. Incident Response

In the event of a suspected compliance incident:

1. **Detection:** System audit logs provide immediate diagnostic context
2. **Containment:** Emergency Stop instantly halts all email operations
3. **Investigation:** Full audit trail enables root cause analysis
4. **Resolution:** System settings allow precise control over resumption
5. **Notification:** Owner is responsible for any required external notifications

---

**© 2024–2026 Gaurav Patil. All Rights Reserved.**
