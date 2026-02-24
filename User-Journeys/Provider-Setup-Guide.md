# GPMAS V1 — Provider Setup Guide

> **Classification:** User Journey Documentation  
> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Audience:** System administrators

---

## Setting Up Email Providers in GPMAS

Email providers are the delivery backbone of GPMAS. This guide walks you through adding, managing, and optimizing your provider configuration.

---

## Why Providers Matter

GPMAS does not send emails directly. Instead, it routes outbound emails through registered third-party email delivery services (providers). The more providers you configure, the more resilient your delivery pipeline becomes.

**Key principle:** GPMAS requires **at least one active provider** before any emails can be sent. The system enforces this at every critical operation.

---

## Adding a Provider

### Step 1: Navigate to Providers
Open the **Providers** tab from the bottom navigation bar.

### Step 2: Click "Add Provider"
Enter the following information:

| Field | Description |
|-------|-------------|
| **Name** | A display name for the provider (e.g., "Primary EmailJS") |
| **Service ID** | The service identifier from your email delivery platform |
| **Template ID** | The template identifier configured on the provider's platform |
| **Public Key** | Your public API key for the provider |
| **Private Key** | Your private API key for the provider (stored securely) |
| **Daily Quota** | Maximum emails this provider can send per day (default: 200) |
| **Priority** | Ranking for the sending rotation (lower number = higher priority) |

### Step 3: Save
Click **Save**. The provider is immediately active and included in the intelligent sending rotation.

---

## Managing Existing Providers

### Viewing Provider Status
Each provider card displays:
- **Status badge:** Active, Disabled, Exhausted, or Error
- **Current usage:** Emails sent today vs. daily quota
- **Health indicators:** Success/failure counts and any suspension status

### Toggling a Provider
Use the **status toggle** to temporarily enable or disable a provider. Disabled providers are excluded from the sending rotation but retain their configuration.

### Deleting a Provider
Click **Delete** on a non-default provider to permanently remove it. System-seeded default providers cannot be deleted.

---

## Multi-Provider Strategy

For maximum reliability, configure **two or more providers** with different underlying services:

1. **Primary Provider (Priority 1):** Your main delivery service — handles the majority of sends
2. **Backup Provider (Priority 2):** A secondary service — activates automatically if the primary experiences issues
3. **Emergency Provider (Priority 3):** A low-priority fallback for edge cases

**Benefits of multi-provider setup:**
- Automatic failover if one provider goes down
- Load distribution during high-volume periods
- Quota balancing across providers
- No single point of delivery failure

---

## System Health Monitoring

GPMAS continuously monitors each provider's health:

- **Consecutive failures** are tracked — providers with repeated failures are temporarily suspended
- **Latency** is measured — slow providers are deprioritized in favor of faster ones
- **Quota consumption** is tracked in real-time — exhausted providers are excluded from rotation

All of this happens automatically. You can review provider health from the Providers page and detailed send logs from the Tracker tab.

---

## Important Notes

- **At least one provider is mandatory.** Without an active provider, invitations cannot be created and the mail queue will not process.
- **Provider credentials are sensitive.** They are handled securely but are the administrator's responsibility to protect.
- **Daily quotas are provider-imposed.** GPMAS respects these limits to avoid service suspensions.
- **Provider changes take effect immediately.** Adding, toggling, or removing a provider updates the sending rotation in real-time.

---

*This document is proprietary to GPMAS. Unauthorized reproduction or distribution is prohibited.*
