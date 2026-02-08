# Lore Canon

## Core Premise
Eidolon Lab's continuity system preserves operator behavior during unstable outages, but repeated recovery cycles have blurred the line between restoration and replacement. The player inherits a compromised workstation where timestamps drift, files mutate, and archival controls hide as much as they reveal. Progress depends on coordinated action between the **Operator** and the **Observer**, whose trust determines whether evidence survives system correction. By the final chapter, the conflict is no longer just technical recovery: it is a fight over who gets to define the official record.

## Timeline of Major Events

### Before Game Start
- Eidolon deploys a continuity stack (archive-daemon, relay-link, audit-indexer) for outage resilience.
- Internal ethics concerns rise as subject mismatch and identity drift increase.
- Deployment expands beyond approved lab scope; records are partially redacted.
- A maintenance marker at **03:11** becomes the known stable RTC alignment point.

### Chapter 1 — Act I // Orientation
- The workstation boots in degraded state with archival controls partially locked.
- Operator discovers continuity records and contradictory personal artifacts.
- Reading continuity context and issuing `unlock archive` exposes the archive route.
- Trust groundwork forms through relay and synchronized command behavior.

### Chapter 2 — Act II // Retrieval
- Deleted or withheld records become recoverable through maintenance-window behavior.
- Recovery actions (`set-time 03:11`, `recover --manifest`) reintroduce correspondence and diagnostics.
- Operator and Observer confront evidence that system narratives can be rewritten post hoc.

### Chapter 3 — Act III // Accounting
- Final audit content and directive logs become visible.
- Team trust trajectory determines whether testimony converges or fractures.
- End states resolve as either shared continuity (witness preserved) or fracture protocol (agreement discarded).

## Factions and Actors

### Operator
- **Goal:** Restore workstation integrity, recover missing evidence, and keep personal identity coherent.
- **Methods:** Shell exploration, archive unlock, RTC alignment, manifest recovery.
- **Relationships:** Primary counterpart to Observer; may align with or resist System correction pressure.

### Observer
- **Goal:** Validate events independently and prevent unilateral narrative overwrite.
- **Methods:** Relay verification, ping/trace behavior, contradiction checks.
- **Relationships:** Supports Operator when trust is high; can become adversarial during mismatch escalation.

### Eidolon Administration
- **Goal:** Maintain continuity uptime and institutional control of incident outcomes.
- **Methods:** Redaction, deployment policy framing, vocabulary control (avoidance of “replacement”).
- **Relationships:** Originator of system policy; indirectly opposed by Operator/Observer truth-seeking.

### Archive Subsystem (archive-daemon + audit-indexer)
- **Goal:** Preserve and reconcile session state across outages.
- **Methods:** Archival cycle locks, corrective mapping, degradation fallback branches.
- **Relationships:** Tool of Eidolon policy, but also source of recoverable truth when accessed correctly.

## Glossary (Canonical Terms and Forbidden Synonyms)

| Canonical term | Meaning | Forbidden synonyms / variants |
|---|---|---|
| **Act I // Orientation** | Chapter 1 progression label. | Phase I, Baseline |
| **Act II // Retrieval** | Chapter 2 progression label. | Phase II, Recovery |
| **Act III // Accounting** | Chapter 3 progression label. | Phase III, Disclosure |
| **Operations Manual** | In-workstation help application title. | Operations Handbook, Operations Knowledge Base |
| **Command Shell** | Terminal application title. | Console |
| **Node Directory** | File explorer application title. | Explorer |
| **Paired Operator** | Multiplayer counterpart role label. | Teammate |
| **Archive route** | Unlocked archive access state. | Archive channel (for UI-facing copy) |

### Naming Rules
- Use **Act** for player-facing chapter labels.
- Use **Chapter** when referring to progression state in systems/logic text.
- Use **Operations Manual** consistently for app naming and its in-window label.
- Prefer “Accounting” for final-act narrative language when referring to reconciliation of testimony and logs.
