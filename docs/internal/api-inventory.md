# GMSS API Inventory & Risk Assessment

## Risk Classification Legend
- **LOW**: Read-only or low-impact write. Safe for public/auth use.
- **MEDIUM**: Standard transactional write. Requires validation.
- **HIGH**: Complex orchestration, potential for race conditions or cost spikes.
- **CRITICAL**: System-critical infrastructure. Failure stops the service.

## 1. Next.js API Routes (`src/app/api/...`)

| Endpoint | Method | Functionality | Risk | Cost Impact | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/dev/process-reminders` | GET | Triggers scheduler manually | **MEDIUM** | Medium (Reads/Writes Reminders) | Dev only. Checks `emergencyStop`. Uses Circuit Breaker. |
| `/api/invite/create` | POST | Creates new token invite | **MEDIUM** | Medium (Rate Limited) | **HARDENED**: Uses IP Rate Limiting + Zod Validation + Atomic Transaction. |
| `/api/invite/[token]/accept` | POST | Accepts invite, adds participant, schedules reminder | **HIGH** | Medium (Optimized) | **HARDENED**: Uses IP Rate Limiting + Transactional Consistency + Inheritance Logic. |
| `/api/invite/claim` | POST | Alternative invite acceptance | **REMOVED** | N/A | **DELETED**: Consolidated into `accept` route. |
| `/api/invite/cleanup` | POST | Triggers cleanup of expired invites | **LOW** | Low | Background maintenance. |
| `/api/test-auth` | GET | Anonymous Auth for testing | **LOW** | Low | Dev/Test only. |

## 2. Firebase Functions (`functions/src/...`)

| Function Name | Trigger | Functionality | Risk | Cost Impact | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `reminderScheduler` | Schedule (1m) | Main orchestration loop | **CRITICAL** | High (Freq 1/min) | Reads pending reminders. Claims transactionally. |
| `disasterBankProcessor` | Schedule (5m) | Retries failed jobs | **CRITICAL** | Medium | Failsafe layer. |
| `systemHealthCheck` | Schedule (15m) | Validates system state | **LOW** | Low | Self-healing. |
| `cleanupEventData` | Firestore (Delete) | Cascading delete of event data | **MEDIUM** | High (Batch Delete) | Triggered on Event delete. |

## 3. Cost & Optimization Opportunities

### Priority 1: `invite/create` Rate Limiting
- **Current**: `count()` query on `tokenInvites` collection.
- **Problem**: Costs 1 read per document counted. Scaling hazard.
- **Fix**: [x] Implemented IP-based Fixed Window Rate Limiter in `src/lib/rate-limiter.ts`. Uses optimistic locking.

### Priority 2: Provider Balancing (`selectProvider`)
- **Current**: Reads *all* active providers + their usage docs.
- **Problem**: N+1 reads per email send attempt? (Need to verify if `selectProvider` is cached or called per reminder).
- **Fix**: [x] Implemented In-Memory Caching (60s TTL) in `functions/src/providerBalancer.ts` to reduce reads.

### Priority 3: `invite/claim` redundancy
- **Current**: Exists alongside `accept`.
- **Fix**: [x] Removed `invite/claim` route.

## 4. Security Hardening Tasks

- [x] Consolidate `invite/claim` and `invite/accept`.
- [x] Add Input Validation (Zod) to all POST endpoints.
- [x] Ensure `emergencyStop` check exists in all Write endpoints (Handled via CircuitBreaker/RateLimiter).
