# Domain model

Full source of truth: `prisma/schema.prisma`. This document explains the *why* behind the shape, not a field-by-field
restatement.

## Entities

| Entity | Purpose |
|---|---|
| `User` | Identity + `Role` (`CITIZEN`, `CASE_WORKER`, `SERVICE_ADMIN`, `SYSTEM_ADMIN`). |
| `CitizenProfile` | Structured facts about a citizen used by the eligibility engine. One-to-one with a `CITIZEN` user. Deliberately minimal — see "Data minimization" below. |
| `Department` | A demo government department (e.g. "Department of Education"). |
| `Service` | A synthetic public service/scheme. Belongs to a `Department`, has a `category`, `priority`, and `processingDays`. |
| `EligibilityRuleSet` | The versioned, JSON-encoded rule tree for a `Service` (see `docs/eligibility-engine.md`). |
| `Requirement` | A document or field a `Service` needs, with a `necessity` of `REQUIRED` / `OPTIONAL` / `CONDITIONAL`. |
| `Application` | A citizen's application to a `Service`. Owns a `status` constrained by the state machine. |
| `ApplicationDocument` | The join between an `Application` and a `Requirement`, carrying its own verification `status`. |
| `ApplicationEvent` | Append-only timeline entry (who did what, when). |
| `ApplicationBlocker` | A historical record of a blocker (seed data only — live reads always recompute via `deriveBlockers`, see `docs/architecture.md`). |
| `Deadline` | A real date tied to a `Service` and/or `Application`. Never fabricated at read time. |
| `Benefit` | Created when an `Application` reaches `APPROVED`. |
| `CaseNote` | Free-text note a staff member attaches to an application. |
| `AIRecommendation` | Every AI answer, with its evidence and a human review `status` (see `docs/ai-architecture.md`). |
| `AuditEvent` | Append-only audit trail for every consequential mutation (see `docs/security.md`). |
| `Notification` | Simple per-user notification record. |

## Why a `CitizenProfile` separate from `User`

`User` carries only identity + auth. `CitizenProfile` carries only eligibility-relevant facts. This split means:

- Staff accounts (`CASE_WORKER`, `SERVICE_ADMIN`, `SYSTEM_ADMIN`) never accidentally get eligibility fields.
- It is easy to reason about what data actually flows into the eligibility engine — it is exactly the field set of
  `CitizenProfile`, nothing implicit.

## Data minimization

`CitizenProfile` only collects the fields actually referenced by at least one service's eligibility rules or
requirements (age, location, residency, income, employment, education, household size, dependents, business
ownership, housing status, disability status, student status, agricultural land). There is no field for anything
not used downstream — see build brief §13.

## Why blockers are not trusted from the database at read time

`ApplicationBlocker` rows exist so seed data can demonstrate realistic historical state and so an audit trail is
possible. But the *live* "why is this application blocked?" view (`GET /api/applications/[id]`) always recomputes
blockers from the current `ApplicationDocument` statuses via `deriveBlockers()`. If it trusted a stored blocker row,
a stale row could show a blocker that a citizen already resolved. See `docs/architecture.md`.

## Indexes

Indexes are added on foreign keys used in list/filter queries (`Application.status`, `Application.citizenProfileId`,
`Deadline.dueAt`, `AuditEvent.entityType/entityId`, etc.) — see `@@index` declarations in `schema.prisma`. At this
data scale (tens of thousands of rows for a demo) these matter less than at production scale, but the query
patterns they support (case worker queue filters, deadline sorting, audit lookups) are already exercised by the
API routes.
