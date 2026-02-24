# GPMAS — Environment Strategy

> **Version:** 1.0 · **Classification:** Operational  
> **Last Updated:** February 2026

---

## Environment Model

GPMAS operates across two distinct environments with functional parity to ensure that testing accurately reflects production behavior.

---

## Environment Definitions

| Environment | Purpose | Execution Model | Data |
|-------------|---------|-----------------|------|
| **Development** | Local testing, feature validation, debugging | Polling-based queue processing | Live database (owner responsibility to manage test data) |
| **Production** | User-facing deployment | Cron-based cloud function triggers | Production data with full audit logging |

---

## Environment Parity

Both environments share:
- Identical authentication flow (Google OAuth)
- Identical provider routing logic
- Identical template rendering pipeline
- Identical audit logging behavior
- Identical invitation token generation and validation

The critical difference is the execution trigger: development uses client-side polling while production uses server-side scheduled functions. This difference is invisible to the application logic.

---

## Simulation Mode (Cross-Environment)

Simulation mode is available in **both** environments. When active:
- The full email pipeline executes normally (template rendering, provider selection, queue processing)
- The final delivery step is simulated — no email leaves the system
- All operations are logged identically to live mode
- This enables safe testing without risk of accidental sends

---

## Configuration Management

| Configuration Type | Storage | Environment-Specific |
|-------------------|---------|---------------------|
| **Secret keys** | Environment variables (`.env.local`) | Yes — different per environment |
| **Provider credentials** | Database | Shared (same providers in dev/prod) |
| **System settings** | Database | Shared |
| **Feature flags** | System settings (simulation mode, halt) | Shared |

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
