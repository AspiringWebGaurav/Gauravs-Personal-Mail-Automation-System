# GPMAS — Edge Cases Guide

> **Version:** 1.0 · **Classification:** User Journey  
> **Last Updated:** February 2026

---

## Purpose

This guide documents edge case scenarios and unusual situations that administrators or invitees may encounter. Each scenario describes what happens and how the system responds.

---

## Administrator Edge Cases

### Sending Invites With No Providers
**Scenario:** Admin tries to send an invitation but no providers are configured.  
**System Response:** Operation is blocked. The system displays a clear message requiring at least one active provider before invitations can be sent.

### Deleting an Event With Pending Invitations
**Scenario:** Admin deletes an event that has outstanding pending invitations.  
**System Response:** All pending invitations are atomically deleted alongside the event, participants, and queue jobs. Pending invites become void — clicking them will show "event not found."

### Sending Duplicate Invitations
**Scenario:** Admin tries to send a second invitation to the same email for the same event.  
**System Response:** The system detects the existing pending invitation and prevents duplication. The admin is notified that an invite is already pending.

### Rapid Sequential Sends
**Scenario:** Admin clicks "Send" multiple times quickly before the first request completes.  
**System Response:** Distributed locking prevents race conditions. Only one invitation is created; subsequent clicks receive appropriate feedback.

### Provider Credentials Changed Externally
**Scenario:** Provider API credentials are rotated outside of GPMAS.  
**System Response:** The next send attempt through that provider will fail. The provider's penalty score increases, and the system falls back to other providers. The admin should update credentials in the Providers settings.

### Emergency Stop During Active Processing
**Scenario:** Admin activates Emergency Stop while emails are being processed.  
**System Response:** The current processing cycle checks the halt status before each job. Jobs not yet started are skipped. Jobs mid-execution complete their current attempt, then processing stops. No new cycles begin until the halt is deactivated.

---

## Invitee Edge Cases

### Clicking an Expired Link
**Scenario:** Invitee clicks an invitation link more than 24 hours after it was sent.  
**System Response:** The server-rendered page detects the expired token and displays "This invitation has expired." No acceptance is possible.

### Clicking an Already-Accepted Link
**Scenario:** Invitee clicks the same invitation link a second time after already accepting.  
**System Response:** The system detects the invitation has already been accepted and displays a confirmation page indicating they are already registered.

### Clicking a Link for a Deleted Event
**Scenario:** Invitee clicks a link for an event that has been deleted by the admin.  
**System Response:** The server-rendered page cannot find the referenced event and displays an appropriate error message.

### Simultaneous Acceptance by Different People
**Scenario:** Two people somehow access the same invitation link and try to accept simultaneously.  
**System Response:** Atomic transactions with distributed locking ensure only one acceptance succeeds. The second attempt receives "already accepted."

### Accepting Without Any Internet Connection
**Scenario:** Invitee clicks "Accept" but their network drops during the request.  
**System Response:** The acceptance fails client-side. No database state is changed. The invitee can retry once connectivity is restored (if the link hasn't expired).

---

## System Edge Cases

### All Providers Exhausted Mid-Queue
**Scenario:** During queue processing, all providers hit their daily quota.  
**System Response:** Remaining queue jobs are preserved. Processing pauses. When quotas reset (next day), processing resumes automatically.

### Database Temporarily Unavailable
**Scenario:** Cloud Firestore experiences a brief outage.  
**System Response:** API calls return errors. Client-side error handling displays appropriate messages. No data is corrupted. Operations resume automatically when the database recovers.

### Burn Monitor Reaches Critical
**Scenario:** Projected monthly usage exceeds free-tier limits.  
**System Response:** Burn Monitor displays "Critical" status with red indicators. The system continues to operate but the admin should reduce usage or upgrade their plan.

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
