# GPMAS — Gaurav's Personal Mail Automation System

<p align="center">
  <strong>Enterprise-Grade Personal Mail Automation Platform</strong>
</p>

<p align="center">
  <em>Built & Engineered by <a href="https://www.gauravpatil.online">Gaurav Patil</a></em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blueviolet" alt="Version" />
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Firebase-11-orange?logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/License-Proprietary-red" alt="License" />
  <img src="https://img.shields.io/badge/Status-Production%20Ready-brightgreen" alt="Status" />
  <img src="https://img.shields.io/badge/PWA-Installable-purple" alt="PWA" />
</p>

---

## Overview

**GPMAS** is a private, production-grade personal mail automation platform engineered for reliable, automated professional email communications. It features intelligent multi-provider routing, automated queue processing, a secure invitation system, and real-time delivery tracking — all delivered through a premium, mobile-first user interface.

> **📖 New here?** Start with the **[Master Index](INDEX.md)** — a complete navigation map with role-based reading paths for clients, architects, legal reviewers, and new users.

---

## 📚 Documentation

### Product
| Document | Description |
|----------|-------------|
| [Product Overview](Documentation/Overview/Product-Overview.md) | What GPMAS is, design philosophy, and product boundaries |
| [Vision & Mission](Documentation/Product-Vision/Vision-and-Mission.md) | Strategic pillars and long-term direction |
| [Product Roadmap](Documentation/Roadmap/Product-Roadmap.md) | V1 → V2 → V3 progression and priorities |

### Feature Modules
| Document | Description |
|----------|-------------|
| [Provider Engine](Documentation/Feature-Modules/Provider-Engine.md) | Multi-provider routing, health monitoring, failover |
| [Invite System](Documentation/Feature-Modules/Invite-System.md) | Secure invitation lifecycle and token management |
| [Execution Engine](Documentation/Feature-Modules/Execution-Engine.md) | Queue processing, retry logic, simulation mode |
| [Sent Tracker](Documentation/Feature-Modules/Sent-Tracker.md) | Real-time observability and audit integration |

### Engineering
| Document | Description |
|----------|-------------|
| [Engineering Philosophy](Documentation/Design-Principles/Engineering-Philosophy.md) | Core principles and decision-making framework |
| [Operational Model](Documentation/Operational-Model/Operational-Model.md) | System states, concurrency, and audit model |
| [Failure & Recovery](Documentation/Failure-Handling/Failure-and-Recovery.md) | Failure classification, recovery mechanisms, priorities |
| [Performance Model](Documentation/Performance-Model/Performance-Model.md) | Performance targets and resource optimization |

### Strategy
| Document | Description |
|----------|-------------|
| [Scalability Model](Documentation/Scalability-Model/Scalability-Model.md) | Current capacity and scaling dimensions |
| [Deployment Strategy](Documentation/Deployment-Strategy/Deployment-Strategy.md) | Pipeline, rollback, zero-downtime model |
| [Environment Strategy](Documentation/Environment-Strategy/Environment-Strategy.md) | Dev/prod parity and simulation mode |
| [Future Scope](Documentation/Future-Scope/Future-Scope.md) | Exploratory capability horizons |

### Security
| Document | Description |
|----------|-------------|
| [Security Posture](Documentation/Security-Posture/Security-Posture.md) | Auth, authorization, threat surface, least privilege |
| [Risk & Threat Model](Documentation/Security-Posture/Risk-and-Threat-Model.md) | Risk register, trust assumptions, residual risks |
| [Trust Assumptions](Documentation/Security-Posture/Trust-Assumptions.md) | Infrastructure, provider, and cryptographic trust |

---

## 🏗️ System Architecture
| Document | Description |
|----------|-------------|
| [High-Level Design](System-Architecture/High-Level-Design/System-Design.md) | System topology, component catalog |
| [Data Flow](System-Architecture/Data-Flow/Data-Flow.md) | Primary flows, data boundaries, integrity guarantees |
| [Execution Flow](System-Architecture/Execution-Flow/Execution-Flow.md) | Lifecycle, safety gates, processing sequence |
| [Reliability Layer](System-Architecture/Reliability-Layer/Reliability-Layer.md) | Five reliability mechanisms |
| [Observability Layer](System-Architecture/Observability-Layer/Observability-Layer.md) | Four observability pillars with coverage matrix |

---

## 🧭 User Journeys
| Document | Description |
|----------|-------------|
| [Admin Usage Guide](User-Journeys/Admin-Usage-Guide.md) | Complete administrator workflow |
| [Invitee Guide](User-Journeys/Invitee-Guide.md) | Invitation acceptance experience |
| [Provider Setup](User-Journeys/Provider-Setup-Guide.md) | Configuring email delivery providers |
| [Monitoring & Logs](User-Journeys/Monitoring-and-Logs-Guide.md) | Tracker, audit trail, health dashboard |
| [Edge Cases](User-Journeys/Edge-Cases/Edge-Cases-Guide.md) | Unusual scenarios and system responses |

---

## 💼 Business
| Document | Description |
|----------|-------------|
| [Executive Summary](Client-Overview/Executive-Summary.md) | High-level platform summary for stakeholders |
| [Value Proposition](Client-Overview/Value-Proposition/Value-Proposition.md) | Value across three personas |
| [Business Model](Client-Overview/Business-Model/Business-Model.md) | Cost structure, revenue considerations, IP value |
| [Risk Mitigation](Client-Overview/Risk-Mitigation/Risk-Mitigation.md) | Technical, operational, and business risk controls |
| [Release Notes (V1)](Release-Notes/V1-Release-Notes.md) | V1.0.0 capabilities and known limitations |

---

## 📜 Legal & Compliance
| Document | Description |
|----------|-------------|
| [Legal Index](Legal/Legal-Index.md) | Central index of all legal documents |
| [Liability Disclaimer](Legal/Liability/Liability-Disclaimer.md) | Limitation of liability and force majeure |
| [IP Notice](Legal/IP-Notice/IP-Notice.md) | Intellectual property ownership and enforcement |
| [Terms & Conditions](License/Terms-and-Conditions.md) | Usage terms, disclaimers, and obligations |
| [Privacy Policy](License/Privacy-Policy.md) | Data collection, usage, and protection |
| [Private Use License](License/Private-Use-License.md) | IP ownership and restrictions |
| [Acceptable Use Policy](License/Acceptable-Use-Policy.md) | Prohibited activities and compliance |
| [Compliance Statement](Compliance/Compliance-Statement.md) | Data handling, email compliance, ethical clause |

---

## 📋 Policies
| Document | Description |
|----------|-------------|
| [Policies Index](Policies/Policies-Index.md) | Central index of all policies |
| [Data Handling](Policies/Data-Handling/Data-Handling-Policy.md) | Classification, lifecycle, sharing, security |
| [Data Retention](Policies/Retention-Policy/Retention-Policy.md) | Retention schedule and cascade rules |
| [Responsible Use](Policies/Responsible-Use/Responsible-Use-Policy.md) | Consent, truthfulness, proportionality |
| [Anti-Abuse](Policies/Anti-Abuse/Anti-Abuse-Policy.md) | Prevention, detection, enforcement |
| [Ethical Communication](Policies/Ethical-Communication/Ethical-Communication.md) | Communication principles and platform enforcement |
| [Best Practices](Do-and-Dont/Best-Practices-Guide.md) | Practical do's and don'ts |

---

## 🔗 Deployed Routes

| Page | Route | Auth Required |
|------|-------|:---:|
| Terms of Service | `/terms` | No |
| Privacy Policy | `/privacy` | No |
| License | `/license` | No |
| Cookie Policy | `/cookies` | No |
| Acceptable Use | `/acceptable-use` | No |

---

## ⚠️ License

> **This software is proprietary. Public repository ≠ open source.**

Licensed under a [Custom Private Use License](License/Private-Use-License.md). All intellectual property rights are exclusively held by **Gaurav Patil**.

- ❌ Commercial use, redistribution, modification, reverse engineering, and unauthorized hosting are **strictly prohibited**

**© 2024–2026 Gaurav Patil. All Rights Reserved.**

---

## 👤 Author

**Gaurav Patil**  
🌐 [Portfolio](https://www.gauravpatil.online) · 💼 [Workspace](https://www.gauravworkspace.site)
