# GPMAS — Contribution Guidelines (Future)

> **Version:** 1.0 · **Classification:** Strategic · Future-Oriented  
> **Status:** Draft — Not Active  
> **Last Updated:** February 2026

---

## Purpose

This document outlines the contribution model that would govern community participation if GPMAS transitions to open source. **Contributions are not currently accepted.** This framework is prepared for future readiness.

---

## Contribution Model

### Types of Contributions
| Type | Description | Review Process |
|------|-------------|---------------|
| **Bug reports** | Issue identification with reproducible steps | Triage by maintainer |
| **Feature requests** | Proposals for new capabilities | Review against roadmap and design principles |
| **Code contributions** | Pull requests with implementation | Code review + automated testing + maintainer approval |
| **Documentation** | Improvements to existing docs or new guides | Content review by maintainer |
| **Security reports** | Responsible disclosure of vulnerabilities | Private communication channel; no public disclosure |

### Contribution Requirements
1. **Contributor License Agreement** — all contributors must sign a CLA before contributions are merged
2. **Code quality** — contributions must pass linting, type checking, and automated tests
3. **Design alignment** — contributions must align with the engineering philosophy and design principles
4. **Security review** — contributions affecting authentication, authorization, or data handling require security review
5. **Documentation** — code changes must include corresponding documentation updates

### What Will Not Be Accepted
- Changes that compromise reliability for performance
- Changes that weaken security controls
- Changes that expose internal implementation details
- Changes that introduce unnecessary external dependencies
- Changes that violate the engineering philosophy's priority order

---

## Review Process

```
Contribution Submitted → Automated Checks (lint, build, test)
→ Maintainer Review → Design Alignment Check
→ Security Review (if applicable) → Merge or Request Changes
```

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
