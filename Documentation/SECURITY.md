# Security & Data Protection

## Secrets Management
- **Client-Side**: Only `NEXT_PUBLIC_FIREBASE_*` keys are exposed. All other secrets must be server-side.
- **Server-Side**: API Keys (EmailJS Private Keys) are stored in Firebase Functions Environment Configuration `functions/.env`.
- **Repo Safety**: `.env.local` and `functions/.env` are strictly git-ignored.

## Authentication
- **Firebase Auth**: Google Sign-In is the primary authentication method.
- **Session Management**: Handled via Firebase SDK.

## Database Security (Firestore Rules)
- **Default Deny**: All access is denied by default.
- **Row Level Security**: Users can only read/write their own data (`request.auth.uid == dependencies`).
- **Validation**: Schema validation is enforced at the application level (Zod/TypeScript) and partially in rules.

## Compliance
- **Data Minimization**: Only essential user data (email, name) is stored.
- **Access Control**: Strict separation between user resources.

## Incident Response
1. Rotate compromised keys immediately in Firebase/Vercel.
2. Trigger redeploy to propagate new keys.
3. Review logs in Firebase Console.
