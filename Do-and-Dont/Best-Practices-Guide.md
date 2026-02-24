# GPMAS V1 — Do's and Don'ts Guide

> **Classification:** Best Practices Guide  
> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Audience:** System administrators, stakeholders

---

## ✅ DO's — Best Practices

### Provider Management
- ✅ **Do** configure at least two email providers for redundancy
- ✅ **Do** set realistic daily quotas that reflect your actual provider plan limits
- ✅ **Do** review provider health indicators weekly on the Providers page
- ✅ **Do** keep provider credentials current — update them immediately if rotated
- ✅ **Do** assign distinct priority levels to each provider for predictable rotation behavior

### Event & Invite Management
- ✅ **Do** verify the recipient's email address before sending invitations
- ✅ **Do** send invitations promptly — links expire in 24 hours
- ✅ **Do** check the Tracker after sending invites to confirm delivery status
- ✅ **Do** use descriptive event names and details for recipient clarity
- ✅ **Do** delete events you no longer need to keep your dashboard clean

### Templates
- ✅ **Do** use variable placeholders (`{{recipientName}}`, `{{eventTitle}}`) for personalization
- ✅ **Do** preview templates before using them in live sends
- ✅ **Do** create purpose-specific templates (event invite, reminder, follow-up)

### System Operations
- ✅ **Do** use Simulation Mode to test new provider configurations before going live
- ✅ **Do** check the Tracker regularly for failed deliveries
- ✅ **Do** use the Emergency Stop if you detect any operational issues
- ✅ **Do** review the Burn Monitor to stay within resource limits
- ✅ **Do** sign out after each session, especially on shared devices

### Compliance
- ✅ **Do** ensure recipients have consented to receive communications
- ✅ **Do** comply with applicable anti-spam regulations (CAN-SPAM, GDPR, etc.)
- ✅ **Do** review legal pages periodically to stay informed of policy updates
- ✅ **Do** maintain accurate and up-to-date recipient information

---

## ❌ DON'Ts — What to Avoid

### Provider Misuse
- ❌ **Don't** rely on a single provider — this creates a single point of failure
- ❌ **Don't** set quotas higher than your provider plan actually allows
- ❌ **Don't** ignore "Exhausted" or "Error" status on providers — investigate and resolve
- ❌ **Don't** share provider credentials outside of GPMAS

### Invite Etiquette
- ❌ **Don't** send invitations to email addresses that haven't been verified
- ❌ **Don't** repeatedly send invitations to recipients who haven't responded — respect their decision
- ❌ **Don't** send duplicate invitations to the same person for the same event
- ❌ **Don't** share raw invitation links through external channels — they are single-use security tokens

### System Misuse
- ❌ **Don't** use GPMAS for mass unsolicited emails (spam)
- ❌ **Don't** use GPMAS for harassment, threats, or any illegal content
- ❌ **Don't** attempt to bypass provider quotas or rate limits
- ❌ **Don't** leave the system running in Simulation Mode when you intend to send real emails
- ❌ **Don't** ignore Critical burn monitor alerts — they indicate you're approaching resource limits

### Security
- ❌ **Don't** expose your account credentials to unauthorized individuals
- ❌ **Don't** attempt to access the system from unauthorized accounts
- ❌ **Don't** disable security features or attempt to bypass authentication

---

## ⚠️ Limitations to Be Aware Of

| Limitation | What It Means |
|-----------|--------------|
| **Single-user system** | Only one authorized Google account can access GPMAS V1 |
| **Provider dependency** | Email delivery speed and success depend on third-party providers |
| **24-hour invite expiry** | Invitation links expire after 24 hours — send new ones if needed |
| **No delivery guarantee** | External factors (spam filters, provider outages) can affect delivery |
| **Free-tier resource limits** | Monitor the Burn Monitor to stay within operational boundaries |

---

## 📋 Quick Reference Card

| Action | Recommended Practice |
|--------|---------------------|
| Before first send | Add 2+ providers, test with Simulation Mode |
| Before sending invites | Verify recipient email, check provider health |
| After sending invites | Check Tracker for confirmation |
| Weekly maintenance | Review provider health, check Burn Monitor |
| On failure detection | Check Tracker details, verify provider credentials |
| Emergency situation | Activate Emergency Stop immediately |

---

*This document is proprietary to GPMAS. Unauthorized reproduction or distribution is prohibited.*
