# GPMAS V1 — Invitee Guide

> **Classification:** User Journey Documentation  
> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Audience:** Event invitees (external users)

---

## Your Journey as a GPMAS Invitee

This guide explains what happens when you receive an invitation through GPMAS and how to accept it.

---

## Step 1: Receive the Invitation Email

**What happens:** You receive a professionally branded email with an invitation to participate in an event.

**What the email contains:**
- The event name
- A brief invitation message
- A secure **"Click here to Accept"** link
- An expiry notice (the link is valid for 24 hours)

---

## Step 2: Click the Invitation Link

**What you do:** Click the acceptance link in the email.

**What the system does:** Opens a server-rendered Invitation page that validates your link in real-time.

**What you see:** A clean, centered invitation card displaying:
- The event name
- Your email address (the identity you were invited as)
- An **"Accept Invitation"** button

---

## Step 3: Accept the Invitation

**What you do:** Click the **"Accept Invitation"** button.

**What the system does:**
1. Validates that the invitation link is still active and not expired
2. Verifies the invitation has not been previously accepted or revoked
3. Adds you as a participant to the event
4. Marks the invitation as accepted
5. All of this happens atomically — protected against double-clicks or simultaneous requests

**What you see:** A confirmation message: **"You have successfully accepted this invitation."**

---

## What If Something Goes Wrong?

| Scenario | What You See |
|----------|-------------|
| **Link is invalid or deleted** | "Invalid or deleted invitation link." |
| **Invitation has expired** (after 24 hours) | "This invitation has expired." |
| **Invitation was revoked** by the admin | "This invitation has been revoked." |
| **Already accepted** | "You have already accepted this invitation!" |
| **Event no longer exists** | "The associated event no longer exists." |

All error states display a clear, descriptive message. No action is required from you — simply contact the event organizer for a new invitation if needed.

---

## Key Details

- **No account required:** You do not need to create a GPMAS account to accept an invitation
- **One-time link:** Each invitation link is unique and can only be used once
- **Time-limited:** Links expire 24 hours after creation for security
- **Secure:** The link uses cryptographically generated tokens; it cannot be guessed or forged

---

*This document is proprietary to GPMAS. Unauthorized reproduction or distribution is prohibited.*
