# GPMAS — Invite System

> **Module:** Invite System · **Version:** 1.0  
> **Classification:** Feature Module Documentation  
> **Last Updated:** February 2026

---

## What It Is

The Invite System manages the complete lifecycle of participant invitations — from creation through delivery, acceptance, expiration, and revocation. It combines secure token generation, atomic database transactions, and queue-based delivery orchestration into a unified workflow.

---

## Why It Exists

Coordinating event participation via email presents inherent risks: duplicate invitations, expired links being accepted, race conditions during concurrent acceptance, and orphaned data from deleted events. The Invite System exists to provide **atomic, idempotent, and secure** invitation management that eliminates every one of these risks.

---

## How It Behaves

### Invitation Creation
1. The administrator enters a recipient email on the Event Detail page
2. The system verifies at least one active provider is configured
3. The system checks for existing pending invitations (duplicate prevention)
4. A cryptographically secure one-time token is generated
5. An invitation record is created with a 24-hour expiry
6. The invitation email is queued for delivery through the Provider Engine
7. All operations execute as an atomic batch — either all succeed or none do

### Token Security
- Tokens are generated using cryptographic randomness
- Tokens are hashed before storage — the raw token exists only in the invitation link
- Each token is unique, single-use, and time-limited
- Tokens cannot be guessed, predicted, or reused

### Invitation Acceptance
1. The invitee clicks the link in their email
2. A server-rendered page validates the token and displays event details
3. The invitee clicks "Accept"
4. The system atomically: validates the token, checks expiry/revocation, adds the invitee as a participant, and marks the invitation as accepted
5. All operations are protected by database transactions to prevent race conditions

### Status Lifecycle

```
Created → Pending → Sent → Accepted
                         → Expired (after 24 hours)
                         → Revoked (by administrator)
```

---

## Failure Scenarios

| Scenario | System Response |
|----------|----------------|
| No provider configured | Invitation creation is blocked with a clear error message |
| Duplicate invitation attempt | System detects existing pending invite; rejects with notification |
| Simultaneous acceptance (double-click) | Atomic transaction ensures only one succeeds; second receives "already accepted" |
| Expired link clicked | Server-rendered page displays "This invitation has expired" |
| Revoked link clicked | Server-rendered page displays "This invitation has been revoked" |
| Event deleted while invite pending | Associated invitations are cascade-deleted atomically |
| Email delivery failure | Invite remains in queue for retry via the Execution Engine |

---

## Business Implications

- **Zero duplicate invitations** — recipients never receive conflicting or repeated invites
- **Cryptographic assurance** — invitation links cannot be forged or guessed
- **Automatic expiry** — stale links become harmless after 24 hours
- **Atomic acceptance** — no partial state; the participant is either fully registered or not at all
- **Cascade integrity** — when an event is removed, every related record is cleaned atomically

---

## Risk Controls

| Risk | Control |
|------|---------|
| Token forgery | Cryptographic generation + hashing before storage |
| Stale link exploitation | 24-hour automatic expiry |
| Race conditions | Atomic database transactions + distributed locking |
| Duplicate invitations | Pre-creation duplicate check with idempotency keys |
| Orphaned records | Cascade deletion on event removal |

---

## Operational Boundaries

- Invitation links are valid for 24 hours only
- One invitation per recipient per event at a time
- Invitee does not need a GPMAS account to accept
- Acceptance requires the invitee to actively click "Accept" — no auto-enrollment
- Revoked invitations cannot be re-activated; a new invitation must be created

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
