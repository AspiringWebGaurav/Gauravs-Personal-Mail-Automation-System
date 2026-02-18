# System Architecture

## Overview
GMSS (Gaurav's Automation Mails Sender System) is a Next.js-based application for managing events, sending automated email reminders, and handling RSVPs. It leverages Firebase for backend services (Auth, Firestore, Functions) and EmailJS for multi-provider email dispatch.

## Core Components

### Frontend (Next.js 15)
- **App Router**: Uses modern Next.js 15 App Router architecture.
- **State Management**: Zustand for global state (Auth, UI).
- **Styling**: Tailwind CSS + Framer Motion for animations.
- **PWA**: Fully offline-capable Progressive Web App.

### Backend (Firebase)
- **Authentication**: Google Auth provider.
- **Firestore**: NoSQL database for Events, Participants, Reminders, Templates.
- **Cloud Functions**: Serverless triggers for email dispatch and scheduled tasks.

### Email Infrastructure (EmailJS)
- **Multi-Provider**: Supports dynamic switching between multiple EmailJS services.
- **Load Balancing**: Custom logic to distribute load and handle failovers.
- **Templating**: Dynamic templates with variable injection ({{title}}, {{time}}, etc.).

## Data Flow
1. **Event Creation**: User creates event -> Firestore `events` collection.
2. **Participant Add**: User adds participant -> Firestore `participants` subcollection.
3. **Email Trigger**:
   - Immediate: Callable Function -> EmailJS API.
   - Scheduled: Scheduled Function (Pub/Sub) -> Scans `scheduledReminders` -> EmailJS API.

## Security
- **Firestore Rules**: Strict RLS (Row Level Security) based on `request.auth.uid`.
- **API Keys**: Stored in environment variables, never exposed to client side (except public keys needed for initialization).
