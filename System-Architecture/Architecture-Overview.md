# GPMAS V1 — System Architecture Overview

> **Classification:** System Architecture Documentation  
> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Audience:** Business stakeholders, investors, technology evaluators

---

## What is GPMAS?

**GPMAS (Gaurav's Personal Mail Automation System)** is a private, enterprise-grade personal mail automation platform. It enables its owner to schedule, manage, and deliver professional email communications with automated reliability — without requiring manual intervention for each send.

GPMAS is not a generic email marketing tool. It is a purpose-built, single-tenant system designed for controlled, professional transactional correspondence.

---

## The Problem It Solves

Managing personal professional email communications at scale presents several challenges:

- **Reliability:** Manual email sending is prone to human error, inconsistency, and forgetting
- **Provider Risk:** Depending on a single email service creates a single point of failure
- **Visibility:** Without centralized logging, it's difficult to know if emails were actually delivered
- **Coordination:** Inviting participants to events and tracking their responses requires manual follow-up
- **Cost Awareness:** Cloud service usage can silently escalate beyond free-tier limits

GPMAS addresses all of these by providing an intelligent automation layer between the user and their email delivery providers.

---

## Core Concepts

### Scheduling
GPMAS operates on an **event-driven scheduling model**:
- The admin creates events that represent communication occasions
- Each event can have invitations sent to recipients
- Email deliveries are queued and processed automatically by the system's execution engine

### Reliability Model
Reliability is achieved through a **multi-layer defense architecture**:

1. **Provider Redundancy:** Multiple email providers can be configured, each independently monitored
2. **Intelligent Rotation:** The system dynamically selects the best provider for each send based on real-time health and capacity
3. **Automatic Failover:** If a provider fails, the system falls back to the next available provider
4. **Retry Logic:** Failed sends are automatically retried with backoff intervals
5. **Queue Persistence:** No email is lost — all sends are persisted in a processing queue until confirmed delivered or exhausted all retry attempts

### Invite System Integration
GPMAS includes a complete invitation lifecycle:

1. **Creation:** Admin creates an invite for a recipient; the system generates a secure, time-limited link
2. **Delivery:** The invitation email is queued and delivered through the provider pipeline
3. **Acceptance:** The recipient clicks the secure link on a server-rendered page and accepts
4. **Tracking:** The invite status is tracked in real-time (pending, sent, accepted, expired, revoked)

All invite operations are protected by atomic database transactions, distributed locking, and duplicate prevention.

### Execution Without Cron Dependency
GPMAS's mail queue can be processed by:
- **Production cron triggers** for automated interval-based processing
- **Built-in development polling** that automatically checks for pending jobs during local development

This ensures consistent execution regardless of the deployment environment.

### Observability Design
Every operation in GPMAS is observable:

- **Sent Tracker:** Real-time log of all email operations with status, timestamps, provider, and diagnostics
- **Audit Service:** Financial-grade logging of every significant action for compliance and debugging
- **Provider Health Dashboard:** Live visibility into each provider's status, success rate, and quota consumption
- **Burn Monitor:** Resource usage tracking against platform limits to prevent cost overruns

---

## Technology Foundation

| Layer | Purpose |
|-------|---------|
| **Frontend** | Modern web application with responsive design and real-time updates |
| **Server Logic** | Server-side API routes with authentication, validation, and business logic |
| **Database** | Cloud-hosted NoSQL database with real-time subscriptions and atomic transactions |
| **Email Delivery** | Multi-provider integration with intelligent routing and failover |
| **Authentication** | Google OAuth with single-owner access enforcement |
| **Hosting** | Cloud-native serverless deployment |

---

## Security Posture

- **Single-owner access:** Only one pre-authorized Google account can access the system
- **API-level enforcement:** Every API endpoint independently validates authorization
- **Token security:** Invitation tokens are cryptographically generated and hashed before storage
- **Atomic operations:** Critical database operations use transactions to prevent data corruption
- **Distributed locking:** Concurrent access to the same resource is serialized to prevent race conditions
- **No public API exposure:** All APIs are internal and not designed for third-party consumption

---

## Operational Boundaries

- Single-tenant (owner-only) system
- Requires at least one active email provider
- Provider quotas and availability are subject to third-party constraints
- Invitation links expire after 24 hours
- All operations are logged for audit compliance

---

*This document is proprietary to GPMAS. Unauthorized reproduction or distribution is prohibited.*
