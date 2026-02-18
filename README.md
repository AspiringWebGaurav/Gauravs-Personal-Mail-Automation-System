# GMSS — Gaurav's Mail Scheduler System

<p align="center">
  <img src="public/icons/icon.svg" alt="GMSS Logo" width="96" height="96" />
</p>

<p align="center">
  <strong>Smart, Automated Email Scheduling & Reminder System</strong>
</p>

<p align="center">
  <em>Built & Engineered by <a href="https://www.gauravpatil.online">Gaurav Patil</a></em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Firebase-11-orange?logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/License-Proprietary-red" alt="License" />
  <img src="https://img.shields.io/badge/PWA-Installable-purple" alt="PWA" />
</p>

---

## Overview

**GMSS** is a premium, production-grade email scheduling and automation platform. It enables intelligent, time-triggered email delivery with multi-provider load balancing, disaster recovery, and a beautiful dark-themed UI.

### Key Features

- 📧 **Multi-Provider Email System** — Dynamic provider rotation with quota-aware load balancing
- ⏰ **Precision Scheduler** — Cloud Functions (Gen 2) executing at 30-second intervals
- 🏦 **Disaster Bank** — Automatic failover and retry system for failed deliveries
- 📅 **Calendar View** — Visual event timeline with scheduling at a glance
- 🔒 **Secure Auth** — Firebase Authentication with Google sign-in
- 📱 **PWA Install** — Installable on Android, Desktop, and iOS (where supported)
- 🎨 **Premium UI** — Glass morphism, Framer Motion animations, dark theme
- 🧪 **QA Automation** — Comprehensive test suite with journey and stress tests

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), TypeScript, React 19 |
| **Styling** | CSS Modules, CSS Custom Properties, Framer Motion |
| **Auth** | Firebase Authentication (Google OAuth) |
| **Database** | Cloud Firestore |
| **Email** | EmailJS REST API, Multi-Provider Load Balancing |
| **Scheduler** | Firebase Cloud Functions (Gen 2) |
| **State** | Zustand |
| **PWA** | next-pwa, Workbox, Custom Service Worker |
| **Hosting** | Vercel (Frontend), Firebase (Functions) |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client (PWA)                      │
│  Next.js 15 · React 19 · Zustand · Framer Motion    │
├─────────────────────────────────────────────────────┤
│              Firebase Authentication                 │
├───────────────────────┬─────────────────────────────┤
│   Cloud Firestore     │   Firebase Cloud Functions   │
│   (Events, Config)    │   (Scheduler Engine)         │
├───────────────────────┴─────────────────────────────┤
│           EmailJS Multi-Provider System              │
│   Provider 1 ←→ Provider 2 ←→ Provider N (Dynamic)  │
├─────────────────────────────────────────────────────┤
│              Disaster Bank (Retry Layer)              │
└─────────────────────────────────────────────────────┘
```

> For detailed architecture, see [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

> For full setup & deployment instructions, see [SETUP.md](SETUP.md)

---

## Project Structure

```
src/
├── app/                # Next.js App Router pages
│   ├── calendar/       # Calendar view
│   ├── create/         # Event creation
│   ├── events/         # Event detail view
│   ├── settings/       # Settings (providers, templates, categories, themes)
│   ├── terms/          # Terms & Conditions
│   ├── privacy/        # Privacy Policy
│   ├── legal/          # Legal & Disclaimers
│   └── shared/         # Shared events
├── components/         # Reusable UI components
│   ├── layout/         # AppShell, BottomNav, Footer
│   ├── pages/          # Page-level components
│   ├── ui/             # UI primitives (Toast, Loader, InstallPrompt)
│   └── email/          # Email preview & composition
├── services/           # Firebase/Firestore service layer
├── providers/          # React context providers
├── stores/             # Zustand state stores
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── styles/             # Global CSS & design tokens
└── types/              # TypeScript type definitions
```

---

## Security

- **Authentication**: Firebase Auth with Google OAuth 2.0
- **Firestore Rules**: Strict per-user document access control
- **HTTP Headers**: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`
- **Environment Variables**: All secrets stored in `.env.local` (never committed)

---

## ⚠️ License & Usage Restrictions

> **This software is proprietary. Public repository ≠ open source.**

This project is licensed under a **Custom Proprietary License**. See [LICENSE](LICENSE) for full terms.

**Strictly prohibited without written permission:**
- ❌ Commercial use or monetization
- ❌ SaaS resale or white-labeling
- ❌ Redistribution or cloning
- ❌ Modification or derivative works
- ❌ Hosting or deployment by unauthorized parties

**Copyright © 2024–2026 Gaurav Patil. All Rights Reserved.**

---

## Contributing

Contributions are reviewed on a case-by-case basis. See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution policy.

---

## Author

**Gaurav Patil**

- 🌐 Portfolio: [www.gauravpatil.online](https://www.gauravpatil.online)
- 💼 Workspace: [www.gauravworkspace.site](https://www.gauravworkspace.site)
