# GPMAS V1 — How to Use GPMAS from Start to Finish

> **Classification:** Onboarding Walkthrough  
> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Audience:** Non-technical stakeholders, first-time users

---

## Welcome to GPMAS

This guide takes you through the complete journey of using GPMAS (Gaurav's Personal Mail Automation System) — from your very first login to monitoring delivered communications. By the end of this walkthrough, you will understand exactly how to operate every feature of the platform.

---

## 🚪 Getting Started

### Opening the Application
Launch GPMAS in your web browser. You will be greeted by the Login screen — a clean, branded interface with a single action: **Sign in with Google**.

### Signing In
Click **"Sign in with Google"** and select the authorized Google account. GPMAS is a private system; only one pre-approved account has access. If your account is not authorized, you will see an "Unauthorized" message, and the session will end.

Upon successful sign-in, you arrive at the **Home Dashboard** — the central hub of the application.

---

## 🏠 The Home Dashboard

Your Home Dashboard shows an overview of all your events. From here, you can:

- View existing events and their statuses
- Create new events
- Access event details for invite management

The **bottom navigation bar** provides quick access to the five main areas of the application:

| Tab | What It Does |
|-----|-------------|
| 🏠 **Home** | Events overview and quick actions |
| 📄 **Templates** | Email template management |
| 🖥️ **Providers** | Email provider configuration |
| 📊 **Tracker** | Live delivery logs |
| ⚙️ **Settings** | System controls |

---

## 🖥️ Setting Up Your First Provider

**Before you can send any emails**, you need at least one email provider.

1. Tap the **Providers** tab in the bottom navigation
2. Click **"Add Provider"**
3. Enter the provider's name, service credentials, and daily quota
4. Click **Save**

Your provider is now active and ready to deliver emails. For maximum reliability, consider adding a second provider as a backup.

---

## 📄 Creating a Template (Optional)

Templates let you create reusable email formats. GPMAS includes built-in starter templates, but you can create custom ones too.

1. Tap the **Templates** tab
2. Click **"Create Template"**
3. Define a name, subject format (use `{{variable}}` for dynamic values), and message body
4. Save your template

Templates are now available when composing emails.

---

## 📅 Creating Your First Event

Events are the foundation of GPMAS — they represent communication occasions.

1. From the **Home** dashboard, click **"Create Event"**
2. Fill in:
   - **Title:** What's this event about?
   - **Description:** Additional details
   - **Date & Time:** When the event occurs
   - **Location:** Where the event takes place (optional)
3. Click **Create**

Your event now appears on the Home dashboard.

---

## ✉️ Sending Your First Invitation

With an event created and a provider active, you're ready to invite participants.

1. Click on your event from the Home dashboard to open the **Event Detail** page
2. Enter the invitee's email address in the invitation field
3. Click **"Send Invite"**

**Behind the scenes, GPMAS:**
- Verifies your provider is active
- Checks for duplicate invitations
- Generates a secure, one-time invitation link (expires in 24 hours)
- Queues the invitation email for delivery
- Logs the entire operation

The invite will appear in the event's invite list as **"Pending"** until the email is delivered.

---

## 📬 What Your Invitee Experiences

1. They receive a professional, branded invitation email
2. They click the **"Accept"** link in the email
3. They arrive at a clean, server-rendered page showing the event details
4. They click **"Accept Invitation"**
5. They see a confirmation: **"Confirmed"**

No account creation is required. The link is secure, one-time use, and expires after 24 hours.

---

## 📊 Monitoring Your Deliveries

1. Tap the **Tracker** tab in the bottom navigation
2. View the live feed of all email operations
3. Each entry shows:
   - ✅ **Green = Sent successfully**
   - ❌ **Red = Failed** (click to expand for error details)
   - 🟡 **Amber = Pending or retrying**
4. Click any entry to expand full diagnostic details

The Tracker updates in real-time — no need to refresh.

---

## ⚙️ Managing System Settings

Navigate to the **Settings** tab for system-wide controls:

- **🛑 Emergency Stop:** Instantly halt all email processing. Use this if you detect an issue and need to pause everything immediately. Deactivate to resume.
- **🧪 Simulation Mode:** Test the entire pipeline without sending real emails. All operations are logged but no emails leave the system. Perfect for verifying templates and provider configurations.
- **🚪 Sign Out:** End your session securely.

---

## 📌 Daily Workflow Summary

Here is the typical daily workflow for an active GPMAS user:

```
Sign In
   ↓
Check Home Dashboard for event status
   ↓
(Optional) Add or adjust providers
   ↓
Create events or open existing ones
   ↓
Send invitations to participants
   ↓
Monitor delivery via Tracker tab
   ↓
Review provider health
   ↓
Sign Out
```

---

## 🔒 Your Legal Pages

GPMAS provides complete legal documentation accessible from the footer on every page:

| Link | Route | Description |
|------|-------|-------------|
| **Terms** | `/terms` | Terms of Service |
| **Privacy** | `/privacy` | Privacy Policy |
| **License** | `/license` | Use License Information |
| **Cookies** | `/cookies` | Cookie Policy |
| **AUP** | `/acceptable-use` | Acceptable Use Policy |

All links are functional, server-rendered, and accessible without authentication.

---

## 🎯 Key Takeaways

1. **One provider minimum** — always have at least one active email provider
2. **Multi-provider is better** — add backups for automatic failover
3. **24-hour invites** — invitation links expire for security
4. **Tracker is your friend** — always check deliveries here
5. **Emergency stop works instantly** — use it if you ever need to pause operations
6. **Simulation mode is risk-free** — test changes without sending real emails

---

*This document is proprietary to GPMAS. Unauthorized reproduction or distribution is prohibited.*
