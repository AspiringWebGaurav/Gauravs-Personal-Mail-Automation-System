# GPMAS V1 — API Overview

> **Classification:** Client Documentation  
> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Audience:** Non-technical stakeholders, investors, compliance reviewers

---

## Overview

GPMAS (Gaurav's Personal Mail Automation System) exposes a controlled set of internal APIs that power message scheduling, event coordination, invitation workflows, and delivery execution. All APIs require authenticated access, are owner-locked, and enforce strict validation at every boundary.

This document provides a business-level summary of each API module, what triggers it, what it does, and what happens on success or failure. **No technical endpoints, payloads, or schemas are disclosed.**

---

## 🔐 Authentication

| Field | Details |
|-------|---------|
| **API Name** | Google Authentication |
| **Purpose** | Authenticate the system owner via Google Sign-In |
| **Triggered By** | Clicking "Sign in with Google" on the Login page |
| **What It Does** | Validates the Google account against the authorized owner identity. Only one pre-approved account is permitted to access the system. |
| **Success Outcome** | Owner is authenticated and gains full access to the dashboard |
| **Failure Outcome** | Access is denied with an "Unauthorized" message. The session is immediately terminated. |
| **Related Module** | Authentication Guard, Session Management |

| Field | Details |
|-------|---------|
| **API Name** | Development Authentication |
| **Purpose** | Provide token-based authentication in local development environments |
| **Triggered By** | Automatic login during local development mode |
| **What It Does** | Issues a time-limited custom token for development testing. Only active when the system is running in development mode; completely disabled in production. |
| **Success Outcome** | Developer is authenticated with a temporary session |
| **Failure Outcome** | Blocked entirely in non-development environments |
| **Related Module** | Development Tools |

---

## 📧 Provider Management

| Field | Details |
|-------|---------|
| **API Name** | Add Email Provider |
| **Purpose** | Register a new email delivery provider into the system |
| **Triggered By** | Admin clicks "Add Provider" on the Providers page |
| **What It Does** | Registers the provider's credentials, sets an initial daily sending quota, assigns a priority ranking, and marks the provider as active. |
| **Success Outcome** | Provider appears in the Providers list with an "Active" status |
| **Failure Outcome** | Validation error is displayed; provider is not added |
| **Related Module** | Provider Engine, Provider Health Monitor |

| Field | Details |
|-------|---------|
| **API Name** | Toggle Provider Status |
| **Purpose** | Enable or disable an existing email provider |
| **Triggered By** | Admin toggles the provider's status switch on the Providers page |
| **What It Does** | Changes the provider's operational status between active and disabled. Disabled providers are excluded from the sending rotation. |
| **Success Outcome** | Provider status is updated in real-time across the system |
| **Failure Outcome** | Error notification; status remains unchanged |
| **Related Module** | Provider Engine |

| Field | Details |
|-------|---------|
| **API Name** | Delete Provider |
| **Purpose** | Permanently remove a provider from the system |
| **Triggered By** | Admin clicks "Delete" on a non-default provider |
| **What It Does** | Removes the provider record. System-seeded default providers cannot be deleted. |
| **Success Outcome** | Provider is removed from the list and excluded from all future operations |
| **Failure Outcome** | Error notification if the provider is a protected default |
| **Related Module** | Provider Engine |

---

## 📅 Event Creation

| Field | Details |
|-------|---------|
| **API Name** | Create Event |
| **Purpose** | Create a new scheduled communication event |
| **Triggered By** | Admin fills in and submits the "Create Event" form |
| **What It Does** | Creates a new event record with title, description, date/time, and location. The admin is automatically registered as the event owner. |
| **Success Outcome** | Event appears on the Events dashboard with full management controls |
| **Failure Outcome** | Validation error; event is not created |
| **Related Module** | Event Management, Participant Tracking |

| Field | Details |
|-------|---------|
| **API Name** | Delete Event |
| **Purpose** | Permanently remove an event and all associated data |
| **Triggered By** | Admin clicks "Delete Event" on the Event Detail page |
| **What It Does** | Atomically removes the event, all its participants, all associated invitations, and any pending mail queue jobs — ensuring no orphaned data remains. |
| **Success Outcome** | Event and all related records are permanently removed |
| **Failure Outcome** | Error if event has too many associated records for a single transaction |
| **Related Module** | Event Management, Database Transactions |

---

## ✉️ Invite System

| Field | Details |
|-------|---------|
| **API Name** | Create Invite |
| **Purpose** | Send a secure, time-limited invitation email to a recipient |
| **Triggered By** | Admin enters an invitee email and clicks "Send Invite" on the Event Detail page |
| **What It Does** | Generates a cryptographically secure one-time token, creates an invite record with a 24-hour expiry, queues the invitation email for delivery, and prevents duplicate invites to the same recipient for the same event. Also verifies at least one active provider exists before proceeding. |
| **Success Outcome** | Invitation email is queued for delivery; invite appears in the event's invite list as "Pending" |
| **Failure Outcome** | Specific error messages for: no provider configured, duplicate invite detected, event not found, or validation failure |
| **Related Module** | Invite Engine, Mail Queue, Provider Engine |

---

## ✅ Invite Acceptance

| Field | Details |
|-------|---------|
| **API Name** | Claim Invite |
| **Purpose** | Allow an invitee to accept their invitation |
| **Triggered By** | Invitee clicks the "Accept" button on the server-rendered Invitation page |
| **What It Does** | Validates the invitation token, checks expiry and revocation status, adds the invitee as a participant to the event, and marks the invitation as accepted. All operations execute atomically to prevent race conditions. |
| **Success Outcome** | Invitee is added as a participant; invitation status changes to "Accepted" |
| **Failure Outcome** | Clear error messages for: invalid token, expired invite, already accepted, or revoked invite |
| **Related Module** | Invite Engine, Database Transactions, Participant Management |

---

## ⚙️ Execution Engine

| Field | Details |
|-------|---------|
| **API Name** | Process Mail Queue |
| **Purpose** | Execute pending email deliveries from the sending queue |
| **Triggered By** | Automated scheduler (cron trigger) or development-mode polling |
| **What It Does** | Reads all pending and retrying jobs from the mail queue, selects the optimal provider based on health and capacity, executes the email delivery through the provider, updates job status upon completion, and applies retry logic with exponential backoff for failures. Checks the global system halt flag before processing and verifies provider availability. |
| **Success Outcome** | Pending emails are delivered; sent logs are recorded in the tracker |
| **Failure Outcome** | Failed jobs are scheduled for retry with backoff; providers with consecutive failures are deprioritized |
| **Related Module** | Mail Runner, Provider Engine, Sent Tracker |

| Field | Details |
|-------|---------|
| **API Name** | Quick Send |
| **Purpose** | Send a one-off email immediately using a template |
| **Triggered By** | Admin clicks "Send" on a composed email from the dashboard |
| **What It Does** | Authenticates the request, interpolates template variables into the subject and body, renders a fully branded HTML email, and dispatches it through the Provider Engine's intelligent routing. |
| **Success Outcome** | Email is delivered; the sending provider is identified in the response |
| **Failure Outcome** | Delivery failure with a descriptive error message |
| **Related Module** | Provider Engine, Email Template Renderer |

---

## 📊 Sent Tracker

| Field | Details |
|-------|---------|
| **API Name** | Sent Log Viewer |
| **Purpose** | Provide real-time observability into all mail operations |
| **Triggered By** | Admin navigates to the "Tracker" tab in the bottom navigation |
| **What It Does** | Displays a live-updating log of all email send attempts, invite operations, and system actions. Each log entry shows the status (sent, failed, pending), the recipient, timestamps, provider used, and diagnostic details. Logs are ordered by most recent and limited to the last 50 entries for performance. |
| **Success Outcome** | Admin has full visibility into all mail operations with expandable detail rows |
| **Failure Outcome** | Graceful empty state if no logs exist |
| **Related Module** | Audit Service, Mail Runner |

---

## 🛠️ Settings

| Field | Details |
|-------|---------|
| **API Name** | System Settings Manager |
| **Purpose** | Manage global system configurations |
| **Triggered By** | Admin navigates to the "Settings" tab in the bottom navigation |
| **What It Does** | Provides controls for system-wide settings including the global service halt toggle (emergency stop), simulation mode activation, and operational preferences. Protected by authentication guard. |
| **Success Outcome** | Settings are applied system-wide in real-time |
| **Failure Outcome** | Changes revert with error notification |
| **Related Module** | System Configuration, Global State |

---

## 📝 Template Management

| Field | Details |
|-------|---------|
| **API Name** | Template Manager |
| **Purpose** | Create, edit, and manage reusable email templates |
| **Triggered By** | Admin navigates to the "Templates" tab and creates/edits a template |
| **What It Does** | Allows the admin to define reusable email templates with variable placeholders (e.g., `{{recipientName}}`), subject line formatting, and custom message bodies. System provides built-in starter templates alongside user-created ones. |
| **Success Outcome** | Template is saved and available for use in email compositions |
| **Failure Outcome** | Validation error; template is not saved |
| **Related Module** | Template Engine, Email Renderer |

---

*This document is proprietary to GPMAS. Unauthorized reproduction or distribution is prohibited.*
