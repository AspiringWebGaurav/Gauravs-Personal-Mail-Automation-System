# GPMAS — Future Scope

> **Version:** 1.0 · **Classification:** Strategic · Exploratory  
> **Last Updated:** February 2026

---

## Purpose

This document captures capabilities and directions that are **not in scope for V1** but represent potential evolution paths. Items listed here are not commitments — they are recorded to inform future architectural decisions and prevent premature design closure.

---

## Capability Horizons

### Communication Intelligence
- **Delivery prediction** — model delivery success probability based on historical provider/recipient data
- **Optimal send timing** — identify time windows with historically highest acceptance rates
- **Content effectiveness** — template performance comparison based on engagement metrics

### Advanced Scheduling
- **Recurring events** — automatic event regeneration on configurable schedules
- **Conditional sends** — emails triggered by external events or conditions
- **Timezone-aware scheduling** — recipient-timezone-optimized delivery windows

### Integration Ecosystem
- **Calendar sync** — bidirectional synchronization with external calendar platforms
- **CRM integration** — recipient management through external contact databases
- **Webhook API** — real-time event push notifications for external systems
- **Import/export** — bulk operations for events, templates, and recipient lists

### Multi-Tenant Architecture
- **User isolation** — data separation between multiple authorized users
- **Role-based permissions** — granular access control (admin, operator, viewer)
- **Organization model** — team-level resource sharing and management
- **Usage billing** — per-user or per-organization resource accounting

### Self-Hosted Deployment
- **Docker containerization** — portable deployment across infrastructure providers
- **Configuration-driven setup** — environment-specific configuration without code changes
- **Database abstraction** — support for alternative database backends

---

## Governance Considerations

### Open-Source Exploration
A potential open-source transition is being evaluated as a long-term option. Key considerations include:
- License selection (permissive vs. copyleft)
- Contribution model and governance structure
- Intellectual property protection during transition
- Community management requirements

> Detailed exploration is documented in the Open-Source strategy section.

---

## What Future Scope Is NOT

- These items are **not committed features** — no timeline or resource allocation is implied
- Listing an item does not create an obligation to implement it
- Items may be deprioritized or removed based on evolving product needs
- Some items may be superseded by architectural changes that render them unnecessary

---

*© 2024–2026 Gaurav Patil. All Rights Reserved.*
