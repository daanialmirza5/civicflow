# Application workflow

Source: `src/lib/workflow/`. Tests: `tests/unit/stateMachine.test.ts`, `tests/unit/blockers.test.ts`,
`tests/unit/deadlines.test.ts`.

## State machine

```
DRAFT -> SUBMITTED -> UNDER_REVIEW -> DOCUMENT_VERIFICATION -> ADDITIONAL_INFORMATION_REQUIRED -> RESUBMITTED -> UNDER_REVIEW -> APPROVED
                                    \-> APPROVED / REJECTED                                                                   \-> REJECTED
any non-terminal state -> CANCELLED
```

`src/lib/workflow/stateMachine.ts` is the single source of truth for legal transitions (`canTransition`,
`assertTransition`). Two API routes are the only place `Application.status` is ever written:

- `POST /api/applications/[id]/submit` — citizen-only, `DRAFT -> SUBMITTED`.
- `POST /api/applications/[id]/transition` — staff-only, any other legal transition.

Both call `assertTransition` before writing, so an illegal transition (e.g. `DRAFT -> APPROVED`, skipping review)
throws `InvalidTransitionError`, mapped to HTTP 409 by `src/lib/errors.ts`.

## Blocker engine

`src/lib/workflow/blockers.ts` exports `deriveBlockers(input)`, a pure function over `{ status, documents[] }` that
returns the reasons an application currently cannot advance:

| `reasonCode` | Trigger | `owner` |
|---|---|---|
| `DOCUMENT_MISSING` | a `REQUIRED` document is `NOT_PROVIDED` | `CITIZEN` |
| `DOCUMENT_REJECTED` | a document was rejected during verification | `CITIZEN` |
| `DOCUMENT_CORRECTION_REQUIRED` | a case worker requested a correction | `CITIZEN` |
| `REVIEW_PENDING` | all documents are in order but no citizen-owned blocker exists, and the application is `UNDER_REVIEW`/`DOCUMENT_VERIFICATION` | `DEPARTMENT` |
| `AWAITING_CITIZEN_RESPONSE` | status is `ADDITIONAL_INFORMATION_REQUIRED` | `CITIZEN` |

Each blocker also carries a `chain: string[]` — the causal chain rendered in the "why is this stuck?" UI (build
brief §21/§49), e.g. `["Application", "Required document: Income certificate", "Document not provided",
"Verification cannot start", "Application blocked"]`.

Blockers are **always recomputed from live data**, never trusted from a stored row — see
`docs/architecture.md`#data-flow-example.

## Deadlines

`src/lib/workflow/deadlines.ts` classifies a `Deadline` into `OVERDUE` / `DUE_SOON` (within 7 days) / `UPCOMING` /
`COMPLETED` purely from `dueAt`/`completedAt` vs. the current time — never a fabricated status. `priorityForUrgency`
maps that to `HIGH`/`MEDIUM`/`LOW` for the "what needs attention?" dashboards.

## Human-in-the-loop document verification

A citizen can only move a document to `UPLOADED`. Only staff (`POST
/api/applications/[id]/documents/[requirementId]/verify`) can move it to `VERIFIED` / `REJECTED` /
`CORRECTION_REQUIRED`. There is no automatic verification path — see build brief §19/§31.
