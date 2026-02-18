# Deployment Guide

## Production Deployment (Vercel)

### 1. Prerequisites
- Vercel Account
- GitHub Repository connected to Vercel

### 2. Environment Configuration
Ensure the following variables are set in Vercel Project Settings:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 3. Build Settings
- **Framework Preset**: Next.js
- **Root Directory**: `./`
- **Build Command**: `next build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### 4. Deploy
Push to `main` branch to trigger automatic deployment.

---

## Firebase Cloud Functions

### 1. Setup
```bash
npm install -g firebase-tools
firebase login
```

### 2. Deploy Functions
```bash
cd functions
npm run build
firebase deploy --only functions
```

### 3. Deploy Firestore Rules & Indexes
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

## Rollback
In case of critical failure:
1. **Vercel**: Go to Deployments -> select previous working deployment -> Redeploy.
2. **Firebase**: Use `firebase hosting:channel:deploy` for preview or manually revert via CLI.
