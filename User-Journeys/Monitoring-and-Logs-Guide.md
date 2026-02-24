# GPMAS V1 — Monitoring & Logs Guide

> **Classification:** User Journey Documentation  
> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Audience:** System administrators

---

## Understanding GPMAS Monitoring & Observability

GPMAS provides comprehensive monitoring tools to help you understand system operations, track email deliveries, and diagnose issues. This guide covers the Sent Tracker, audit logs, and system health monitoring.

---

## 📊 Sent Tracker

### Accessing the Tracker
Navigate to the **Tracker** tab from the bottom navigation bar. The tracker displays a live-updating feed of all email operations.

### What Each Log Entry Shows

| Field | Description |
|-------|-------------|
| **Status** | Delivery outcome — Sent (green), Failed (red), Pending (amber) |
| **Recipient** | The email address the message was sent to |
| **Timestamp** | When the operation was initiated and completed |
| **Provider** | Which email provider was used for delivery |
| **Event** | The associated event (if applicable) |

### Expandable Details
Click any log entry to expand it and view:
- Full diagnostic information
- Error messages (for failures)
- Retry count and history
- Provider response details

### Live Updates
The Tracker uses real-time subscriptions. New log entries appear automatically as operations complete — no need to refresh the page.

---

## 📋 Audit Trail

GPMAS maintains a **financial-grade audit log** of every significant system operation:

### Tracked Actions
| Action Type | Description |
|-------------|-------------|
| **CREATE** | New email or event created |
| **SEND_SUCCESS** | Email successfully delivered |
| **SEND_FAILURE** | Email delivery failed |
| **RETRY** | Failed email scheduled for retry |
| **INVITE** | Invitation created |
| **CLAIM** | Invitation accepted |
| **SYSTEM_HALT_TOGGLE** | Emergency stop activated/deactivated |
| **SIMULATION_TOGGLE** | Sandbox mode activated/deactivated |
| **DELETE** | Event or record deleted |

### What Each Audit Entry Captures
- **Who:** The user who performed the action
- **What:** The specific operation and its outcome
- **When:** Precise timestamp
- **Where:** Which provider or system module was involved
- **Context:** Associated event, recipient, template, and idempotency key
- **Diagnostics:** Duration, error codes, retry count

---

## 🩺 Provider Health

### Viewing Provider Health
Navigate to the **Providers** tab to see real-time health indicators for each provider:

- **Active:** Operating normally
- **Exhausted:** Daily sending quota reached — will resume tomorrow
- **Error:** Experiencing consecutive failures — temporarily deprioritized
- **Suspended:** Manually disabled or automatically suspended due to persistent failures

### Health Metrics
Each provider displays:
- **Success count:** Total successful deliveries
- **Failure count:** Total failed attempts
- **Daily usage:** Emails sent today vs. daily quota
- **Consecutive failures:** Recent unbroken failure streak

---

## 🔥 Resource Usage (Burn Monitor)

GPMAS tracks system resource consumption against platform limits:

| Metric | Free Tier Limit | Tracked By |
|--------|----------------|------------|
| **Database Reads** | 50,000/day | Read operations from all sources |
| **Database Writes** | 20,000/day | Write operations from all sources |

### Status Levels
- **🟢 Safe:** Well within limits
- **🟡 Warning:** Approaching 70% of daily limits
- **🔴 Critical:** Exceeding 90% of daily limits

Monitor these levels to ensure the system operates within its resource boundaries.

---

## 🔧 Troubleshooting Common Scenarios

### Emails Not Sending
1. Check the **Tracker** for specific error messages
2. Verify at least one provider is **Active** on the Providers page
3. Confirm the **System Halt** is not activated (Settings page)
4. Check the provider's daily quota hasn't been exhausted

### Invitations Showing "Pending"
1. This is normal — invitations are queued for processing
2. Check the Tracker for the invite's delivery status
3. In development mode, emails are processed by the polling mechanism
4. In production, the scheduler processes the queue automatically

### Provider Showing "Error" Status
1. The provider has experienced consecutive delivery failures
2. It has been automatically deprioritized (not excluded)
3. Check the Tracker for specific error details
4. Verify the provider's credentials are still valid
5. The system will gradually reintroduce the provider as it recovers

---

*This document is proprietary to GPMAS. Unauthorized reproduction or distribution is prohibited.*
