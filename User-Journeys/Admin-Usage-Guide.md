# GPMAS V1 — Admin Usage Guide

> **Classification:** User Journey Documentation  
> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Audience:** System administrators, business operators

---

## Your Complete Journey as a GPMAS Administrator

This guide walks you through every step of operating GPMAS, from first login to monitoring your sent communications.

---

## Step 1: Sign In

**What you do:** Open the GPMAS application and click **"Sign in with Google"**.

**What the system does:** Validates your Google account credentials against the authorized owner identity. Only the pre-approved account is granted access.

**What you see:** Upon successful authentication, you are taken to the Home dashboard.

**Protection:** If any other account attempts to sign in, access is immediately denied. The system enforces single-owner access at every boundary.

---

## Step 2: Add an Email Provider

**Where:** Navigate to the **Providers** tab (bottom navigation).

**What you do:** Click **"Add Provider"** and enter the provider's name, service credentials, template ID, and daily sending quota.

**What the system does:** Registers the provider, sets it as active, assigns a priority ranking, and includes it in the sending rotation. The system begins monitoring the provider's health immediately.

**What you see:** The new provider appears in the Providers list with an "Active" status badge, showing its quota and current usage.

**Why this matters:** GPMAS requires at least one active provider to send any emails. Adding multiple providers enables intelligent rotation and automatic failover.

---

## Step 3: Create an Email Template

**Where:** Navigate to the **Templates** tab (bottom navigation).

**What you do:** Click **"Create Template"** and define a template name, subject line format (with `{{variable}}` placeholders), and message body.

**What the system does:** Saves the template for reuse. The system provides built-in starter templates alongside your custom ones.

**What you see:** Your new template appears in the Templates list, ready for selection when composing emails.

---

## Step 4: Create an Event

**Where:** Navigate to the **Home** dashboard and click **"Create Event"**.

**What you do:** Fill in the event title, description, date/time, and location.

**What the system does:** Creates the event record and automatically registers you as the owner. The event is now ready for invitations.

**What you see:** The event appears on your Home dashboard with management controls.

---

## Step 5: Send Invitations

**Where:** Open an event from the Home dashboard to view the **Event Detail** page.

**What you do:** Enter the invitee's email address and click **"Send Invite"**.

**What the system does:**
1. Checks that at least one email provider is configured
2. Verifies no duplicate pending invite exists for this recipient and event
3. Generates a secure, time-limited invitation link (24-hour expiry)
4. Queues the invitation email for delivery
5. Records the operation in the audit log

**What you see:** The invite appears in the event's invite list with a "Pending" status.

**Failure handling:** If no provider is configured, you'll see a clear message to add one. If a duplicate invite already exists, the system will notify you.

---

## Step 6: Monitor Delivery

**Where:** Navigate to the **Tracker** tab (bottom navigation).

**What you do:** Review the live-updating delivery logs.

**What you see:**
- **Green status:** Email was successfully delivered
- **Red status:** Delivery failed (with error details in the expandable row)
- **Amber status:** Email is pending or being retried
- Each entry shows the recipient, timestamp, provider used, and diagnostic details

**What the system does:** The Tracker provides real-time observability. Logs automatically update as new operations complete.

---

## Step 7: Manage System Settings

**Where:** Navigate to the **Settings** tab (bottom navigation).

**What you can do:**
- **Emergency Stop:** Activate the global system halt to immediately pause all email processing
- **Simulation Mode:** Toggle sandbox mode to test the entire pipeline without sending actual emails
- **Resume Operations:** Deactivate the halt or simulation mode to resume normal operations

**What the system does:** Settings changes take effect immediately across the entire system.

---

## Step 8: Sign Out

**What you do:** Click **"Sign Out"** from the Settings page.

**What the system does:** Terminates your authenticated session. All real-time subscriptions are cleanly disconnected.

**What you see:** You are returned to the Login page.

---

## Quick Reference: Navigation

| Tab | Purpose |
|-----|---------|
| **Home** | Dashboard with events overview and quick actions |
| **Templates** | Create and manage reusable email templates |
| **Providers** | Manage email delivery providers |
| **Tracker** | Live delivery logs and operation history |
| **Settings** | System configuration and controls |

---

*This document is proprietary to GPMAS. Unauthorized reproduction or distribution is prohibited.*
