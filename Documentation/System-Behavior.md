# GPMAS V1 — System Behavior Explanation

> **Classification:** Client Documentation  
> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Audience:** Business stakeholders, investors, compliance reviewers

---

## Overview

GPMAS is built on a set of intelligent automation principles designed to maximize delivery reliability, minimize human intervention, and ensure transparent operations. This document explains how the system behaves under the hood — in business terms — without disclosing proprietary technical details.

---

## 🔄 Smart Provider Rotation

GPMAS does not rely on a single email delivery service. Instead, it operates a **multi-provider architecture** where multiple email service providers are registered and managed simultaneously.

**How it works:**
- When an email needs to be sent, the system evaluates all available providers rather than defaulting to one.
- Providers are ranked dynamically based on their current performance, available capacity, and historical reliability.
- The system automatically distributes sending load across providers to avoid overloading any single service.

**Business benefit:** No single point of failure for email delivery. If one provider slows down, others absorb the workload seamlessly.

---

## 🩺 Provider Health Awareness

Every registered provider is continuously monitored for operational health.

**What the system tracks:**
- Whether the provider has recently experienced failures
- How quickly the provider responds to send requests
- Whether the provider's daily sending capacity has been reached
- Whether the provider is currently in a cooldown period after errors

**How it responds:**
- Providers that show degraded performance are automatically deprioritized
- Providers experiencing consecutive failures enter a temporary suspension period
- Once a provider recovers, it is gradually reintroduced into the sending rotation

**Business benefit:** The system is self-healing. Unhealthy providers are sidelined automatically, and healthy ones take over — no manual intervention required.

---

## 🔀 Automatic Fallback

If the primary (highest-ranked) provider fails to deliver an email, the system does not stop. It **automatically falls back** to the next available provider and retries the delivery.

**How it works:**
- The system maintains an ordered list of viable providers
- If the first provider fails, the system immediately tries the next one
- This continues until either the email is successfully sent or all providers have been exhausted
- Failed attempts are logged with full diagnostic details

**Business benefit:** Maximum delivery success rate. A failure at one provider does not mean the email is lost — it is rerouted instantly.

---

## 📊 Quota Protection

Each email provider has a daily sending limit (quota). GPMAS tracks usage against these limits in real-time.

**What the system does:**
- Monitors how many emails each provider has sent today
- Providers that approach or reach their quota are automatically excluded from the rotation
- The system redistributes remaining sends to providers with available capacity
- Daily quotas reset automatically

**Business benefit:** Prevents quota overruns that could result in delivery failures or service suspensions from third-party providers.

---

## ⏱️ Cron-Independent Execution

GPMAS supports **two execution models** for processing its email queue:

1. **Scheduled Processing (Production):** A cron-based trigger invokes the queue processor at regular intervals
2. **Development Polling:** In local development, the system uses a built-in polling mechanism that automatically checks for pending jobs

**Key safeguard:** Before processing any emails, the system checks:
- Whether the global system halt flag is active (emergency stop)
- Whether at least one email provider is configured and available
- Whether the system is operating in sandbox (simulation) mode

**Business benefit:** The system processes emails reliably regardless of the deployment environment, with multiple safety checks before any send operation.

---

## 🔁 Duplicate Prevention

GPMAS implements multiple layers of duplicate prevention throughout the system:

**At the invitation level:**
- Before creating a new invite, the system checks for existing pending invitations to the same recipient for the same event
- Duplicate invites are rejected with a clear notification

**At the acceptance level:**
- Invite acceptance uses atomic database transactions to prevent race conditions
- If two acceptance requests arrive simultaneously (e.g., user double-clicks), only one will succeed
- The system checks if the invitee is already a participant before adding them

**At the email delivery level:**
- Each email job in the queue has a unique identifier
- Jobs that have already been processed are not re-sent

**Business benefit:** Recipients never receive duplicate emails or invitations. The system is safe against double-clicks, network retries, and concurrent access.

---

## 📋 Sent Tracker Observability

Every email operation in GPMAS is fully auditable through the **Sent Tracker**.

**What is logged:**
- Every send attempt (successful or failed)
- The provider used for each delivery
- Timestamps for creation, processing, and completion
- Error details for any failures
- Invitation creation and acceptance events
- System-level actions (halt activations, simulation toggles)

**How it's displayed:**
- Live-updating dashboard accessible from the "Tracker" tab
- Expandable detail rows for each log entry
- Color-coded status indicators (green for success, red for failure, amber for pending)
- Most recent entries shown first

**Business benefit:** Complete operational transparency. Every email that enters the system can be traced from creation to delivery (or failure) with full diagnostic context.

---

## 🧪 Sandbox vs. Live Mode

GPMAS supports a **simulation mode** that allows the admin to test the entire email pipeline without actually sending any emails.

**In Simulation Mode:**
- All email operations are processed normally through the pipeline
- Template rendering, variable interpolation, and provider selection all execute as they would in production
- However, the final send step is simulated — no actual email leaves the system
- All operations are still logged to the Sent Tracker for review

**In Live Mode:**
- All operations execute fully, including actual email delivery through the selected provider

**Switching modes:** Toggle between modes from the Settings page. Changes take effect immediately.

**Business benefit:** Risk-free testing. New templates, provider configurations, or workflow changes can be validated without sending unintended emails.

---

## 🛡️ System Halt (Emergency Stop)

GPMAS includes a global **emergency stop** mechanism.

**When activated:**
- All queue processing is immediately paused
- No new emails will be dispatched
- Existing scheduled jobs remain in the queue but are not processed
- The system clearly indicates it is in a suspended state

**When deactivated:**
- Queue processing resumes from where it left off
- No emails are lost; suspended jobs are picked up normally

**Business benefit:** Instant operational control. If an issue is detected, the entire sending pipeline can be halted with a single action, and resumed just as easily.

---

## 🔥 Usage Monitoring (Burn Engine)

GPMAS includes an intelligent **resource usage monitor** that tracks system operations against the hosting platform's free-tier limits.

**What it monitors:**
- Database read operations per day
- Database write operations per day
- Predicted monthly resource consumption based on current usage trends

**Status levels:**
- **Safe:** Operating well within limits
- **Warning:** Approaching 70% of daily limits
- **Critical:** Exceeding 90% of daily limits

**Business benefit:** Proactive cost awareness. The system alerts the admin before operational costs could escalate beyond the free tier, enabling informed decisions about scaling.

---

*This document is proprietary to GPMAS. Unauthorized reproduction or distribution is prohibited.*
