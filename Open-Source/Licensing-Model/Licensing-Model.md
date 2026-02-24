# GPMAS — Open Source Licensing Strategy

> **Version:** 1.0 · **Classification:** Strategic · Future-Oriented  
> **Status:** Exploratory — Not Active  
> **Last Updated:** February 2026

---

## Context

GPMAS may transition to an open-source model in a future version. This document evaluates licensing options and strategic considerations for such a transition. **No open-source license is currently active.** GPMAS remains under a Private Use License.

---

## License Options Evaluation

### MIT License
| Aspect | Assessment |
|--------|------------|
| **Permissiveness** | Maximum — allows commercial use, modification, redistribution |
| **Patent grant** | None |
| **Copyleft** | None |
| **Attribution** | Required (copyright notice must be included) |
| **Suitability for GPMAS** | High — if the goal is maximum adoption and community contribution |
| **Risk** | Competitors can fork and monetize without contribution back |

### Apache License 2.0
| Aspect | Assessment |
|--------|------------|
| **Permissiveness** | High — similar to MIT with additional protections |
| **Patent grant** | Explicit — contributors grant patent licenses |
| **Copyleft** | None |
| **Attribution** | Required (with NOTICE file) |
| **Suitability for GPMAS** | High — balanced protection with openness |
| **Risk** | Lower than MIT; patent grant provides additional legal clarity |

### GNU GPL v3
| Aspect | Assessment |
|--------|------------|
| **Permissiveness** | Moderate — copyleft requires derivative works to use same license |
| **Patent grant** | Implied |
| **Copyleft** | Strong — modifications must be open-sourced |
| **Attribution** | Required |
| **Suitability for GPMAS** | Medium — protects against proprietary forks but limits commercial adoption |
| **Risk** | May discourage enterprise adoption |

---

## Strategic Recommendation

If open-sourcing is pursued, the recommended approach is:

1. **Apache 2.0** for the core platform — balances openness with patent protection
2. **Contributor License Agreement (CLA)** — ensures IP clarity for all contributions
3. **Dual licensing consideration** — open-source community edition with proprietary enterprise features

---

## Pre-Transition Requirements

Before any open-source transition:

| Requirement | Status |
|------------|--------|
| Remove all proprietary secrets from repository | Required |
| Implement contribution guidelines | Draft prepared |
| Establish governance model | Draft prepared |
| Legal review of license compatibility | Not started |
| Security audit of codebase | Not started |
| Community management plan | Not started |
| IP assignment or licensing structure | Not started |

---

## Timeline

**No active timeline.** Open-source transition is a V3+ consideration. This document exists to inform future decision-making, not to commit to a specific path.

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
