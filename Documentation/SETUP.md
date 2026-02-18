# Setup & Installation Guide

## Prerequisites
- Node.js 18+
- npm 9+
- Firebase CLI (`npm install -g firebase-tools`)
- Git

## Local Development

1. **Clone Repository**
   ```bash
   git clone <repo_url>
   cd gmss
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create `.env.local` in the root directory:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   Access at `http://localhost:3000`.

## Production Build
```bash
npm run build
npm start
```

## Cloud Functions
Navigate to `functions/`:
```bash
cd functions
npm install
npm run build
# Emulate locally
npm run serve
```
