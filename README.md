# GPMAS — Gaurav's Personal Mail Automation System

<p align="center">
  <strong>Enterprise-Grade Personal Mail Automation Platform</strong>
</p>

<p align="center">
  <em>Built & Engineered by <a href="https://www.gauravpatil.site">Gaurav Patil</a></em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blueviolet" alt="Version" />
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Firebase-12-orange?logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/License-Proprietary-red" alt="License" />
  <img src="https://img.shields.io/badge/Status-Production%20Ready-brightgreen" alt="Status" />
</p>

---

## Overview

**GPMAS** is a private, production-grade personal mail automation platform engineered for reliable, automated professional email communications. It features intelligent multi-provider routing, automated queue processing, a secure invitation system, and real-time delivery tracking — all delivered through a modern, mobile-first web interface.

---

## Key Features

- **Multi-Provider Engine**: Dynamic failover and intelligent routing across email delivery providers.
- **Automated Queue Processing**: Scheduled background dispatch with retry mechanisms and simulation mode.
- **Secure Invitation System**: Token-based invite workflows with expiration and single-use validation.
- **Sent Tracker & Observability**: Real-time delivery logging, status tracking, and audit trails.
- **Dual Environment Parity**: Consistent operational flow across development (polling) and production (scheduled cron).

---

## Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript 5
- **Backend & Database**: Firebase Firestore & Firebase Admin SDK
- **Styling & UI**: Tailwind / CSS Modules & Lucide Icons
- **State Management**: Zustand

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/AspiringWebGaurav/Gauravs-Personal-Mail-Automation-System.git
cd Gauravs-Personal-Mail-Automation-System

# Install dependencies
npm install
```

### Environment Configuration

Configure your `.env.local` file with the following variables:

```env
# Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Server Configuration
CRON_SECRET="..."
FIREBASE_ADMIN_CLIENT_EMAIL="..."
FIREBASE_ADMIN_PRIVATE_KEY="..."
```

### Running Locally

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## Deployed Routes

| Page | Route | Auth Required |
|------|-------|:---:|
| Home / Dashboard | `/` | Yes |
| Create Email / Event | `/create` | Yes |
| Email Providers | `/providers` | Yes |
| Template Gallery | `/templates` | Yes |
| Sent Tracker | `/tracker` | Yes |
| Settings | `/settings` | Yes |
| Terms of Service | `/terms` | No |
| Privacy Policy | `/privacy` | No |
| License | `/license` | No |
| Cookie Policy | `/cookies` | No |
| Acceptable Use | `/acceptable-use` | No |

---

## License

> **This software is proprietary. Public repository ≠ open source.**

All intellectual property rights are exclusively held by **Gaurav Patil**.
Unauthorized commercial use, redistribution, modification, reverse engineering, and hosting are strictly prohibited.

**© 2024–2026 Gaurav Patil. All Rights Reserved.**

---

## Author & Reach Out

**Gaurav Patil**  
- 🌐 **Website & Portfolio:** [gauravpatil.site](https://www.gauravpatil.site)
- ✉️ **Direct:** [gaurav@gauravpatil.site](mailto:gaurav@gauravpatil.site)
- 💬 **Inquiries & Reach Out:** [hello@gauravpatil.site](mailto:hello@gauravpatil.site)
- 💼 **Contracting & Work:** [work@gauravpatil.site](mailto:work@gauravpatil.site)
- 🛡️ **Security Inquiries:** [security@gauravpatil.site](mailto:security@gauravpatil.site)
