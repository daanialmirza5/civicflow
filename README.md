# CivicFlow

### Turn public services into an understandable, actionable journey.

> **Demo / synthetic public-service data.** Every citizen, service, department, and application in this repository
> is fabricated for demonstration. Nothing here is affiliated with, or a determination from, any real government
> agency. See [Limitations](#limitations) and [Disclaimer](#disclaimer).

---

## The problem

Public services and government schemes are fragmented across departments, eligibility rules, document
requirements, application portals, and deadlines. Citizens struggle to answer basic questions: *which services
apply to me, why, what do I need to provide, and what's blocking my application right now?*

## The solution

CivicFlow is a **public-service intelligence platform**, not a chatbot wrapper. It is built on a strict layering:

```
STRUCTURED FACTS -> DETERMINISTIC RULES -> WORKFLOW ENGINE -> EVIDENCE -> AI EXPLANATION -> HUMAN DECISION -> AUDIT TRAIL
```

An AI assistant sits on top of a real service catalog, a deterministic eligibility engine, a validated application
state machine, and a blocker engine — it explains what those systems already computed. It never invents eligibility
rules, and it can never approve or change an application.

## Why CivicFlow is different

- **A real rules engine, not an LLM guess.** Eligibility is evaluated by a small AND/OR/NOT interpreter over a
  structured, versioned rule tree (`src/lib/eligibility/evaluate.ts`) — fully unit tested, fully explainable.
- **A real workflow, not a status label.** Applications move through a validated state machine
  (`src/lib/workflow/stateMachine.ts`); illegal transitions are rejected server-side.
- **"Why is this stuck?" is a first-class feature.** The blocker engine (`src/lib/workflow/blockers.ts`) derives —
  live, from current document/status data — exactly why an application can't proceed, who owns the next action, and
  the causal chain from application to blocker.
- **Evidence-grounded AI.** Every AI answer is generated from, and displayed alongside, the exact structured record
  it was generated from. The AI has no tool that can mutate anything.
- **Human-in-the-loop.** Document verification and application decisions are always a staff action. AI answers are
  reviewable (`AIRecommendation.status`), never self-executing.

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full breakdown. Summary:

```
CITIZEN -> PROFILE -> ELIGIBILITY ENGINE -> SERVICE CATALOG + KNOWLEDGE GRAPH -> APPLICATION ENGINE
                                                                                (documents / deadlines / blockers)
                                                                                        |
                                                                                        v
                                                                                AI ORCHESTRATOR -> Evidence -> Human Approval -> Audit
```

A single Next.js (App Router, TypeScript) application. Domain logic (`src/lib/eligibility`, `src/lib/workflow`,
`src/lib/graph`, `src/lib/analytics`) is framework-independent, pure TypeScript — unit tested without a database.

## Eligibility engine

Deterministic AND/OR/NOT rule evaluation with ternary logic (`SATISFIED` / `NOT_SATISFIED` / `MISSING_INFORMATION`)
so an incomplete profile is never silently read as a pass or a fail. See
[`docs/eligibility-engine.md`](docs/eligibility-engine.md).

## Knowledge graph

Citizen -> Service -> Department / EligibilityRule / Requirement -> Document, computed on read from relational
data and rendered with React Flow. See [`docs/knowledge-graph.md`](docs/knowledge-graph.md).

## Application workflow

`DRAFT -> SUBMITTED -> UNDER_REVIEW -> DOCUMENT_VERIFICATION -> ADDITIONAL_INFORMATION_REQUIRED -> RESUBMITTED ->
APPROVED / REJECTED`, with `CANCELLED` reachable from any non-terminal state. See
[`docs/application-workflow.md`](docs/application-workflow.md).

## AI layer

Multi-provider (`anthropic` / `openai` / `google` / `mock`), evidence-grounded, prompt-injection-resistant, with a
deterministic mock provider as the default so the app works with zero API keys. See
[`docs/ai-architecture.md`](docs/ai-architecture.md).

## Evidence grounding

Every AI answer carries the structured `EvidenceItem[]` it was generated from, shown in a "Show evidence" panel —
see the "Civic assistant" section of any application detail page.

## Human-in-the-loop

Document verification, application decisions, and AI-answer review are all explicit staff actions
(`AIRecommendation.status`: `SUGGESTED` -> `APPROVED` / `EDITED` / `REJECTED`). See
[`docs/security.md`](docs/security.md).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, TanStack Query, React Flow, Recharts, Lucide |
| Backend | Next.js API routes, Zod validation |
| Database | Prisma ORM, SQLite for local dev (PostgreSQL-ready — one line change, see `prisma/schema.prisma`) |
| Auth | `bcryptjs` password hashing, `jose` JWT sessions |
| AI | `@anthropic-ai/sdk`, `openai`, `@google/generative-ai`, plus a dependency-free mock provider |
| Testing | Vitest (unit), Playwright (e2e) |
| CI | GitHub Actions (`.github/workflows/ci.yml`): lint, typecheck, unit tests, build, e2e |

## Setup

```bash
npm install
cp .env.example .env
# generate a real AUTH_SECRET and put it in .env:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

npx prisma generate
npm run db:push
npm run db:seed

npm run dev
# -> http://localhost:3000
```

No AI provider key is required — `AI_PROVIDER=mock` (the default) is fully functional. To use a real provider, set
`AI_PROVIDER` to `anthropic` / `openai` / `google` and the matching `*_API_KEY` in `.env`.

### Running against PostgreSQL

Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`, then:

```bash
docker compose up --build
```

## Demo accounts

All seeded with the password `CivicFlow!2026`:

| Role | Email |
|---|---|
| Citizen | `citizen@civicflow.dev` |
| Case worker | `caseworker@civicflow.dev` |
| Service admin | `admin@civicflow.dev` |
| System admin | `sysadmin@civicflow.dev` |

## Synthetic data

`prisma/seed.ts` generates, deterministically (seeded PRNG): 8 departments, 16 synthetic services (each with an
eligibility rule tree and 2-4 document requirements), 25 citizen profiles (some intentionally incomplete), and 32
applications spanning every workflow status — including hand-authored scenarios for the primary demo journey
(blocked on a missing document, approved, rejected, overdue, pending review, draft). See build brief §37's
requirements, all met or exceeded.

## Testing

```bash
npm run test        # unit tests (vitest) — 31 tests over the eligibility engine, state machine, blocker engine,
                     # deadline classifier, and analytics aggregation
npm run typecheck
npm run lint
npm run build
npm run e2e          # resets + reseeds the local database, then runs the Playwright suite
```

The e2e suite (`tests/e2e/`) covers the four scenarios from the build brief: a citizen's full discovery-to-
application journey, missing-document blocker resolution end-to-end (citizen upload -> case worker verification),
an overdue deadline surfacing on the staff dashboard, and an AI question returning a grounded, evidence-backed
answer.

## Evaluation

See [`docs/evaluation.md`](docs/evaluation.md) — including an honest accounting of what was **not** built (a scored
AI evaluation harness against a real provider) rather than fabricated numbers.

## Security

See [`docs/security.md`](docs/security.md) and [`docs/threat-model.md`](docs/threat-model.md): RBAC, row-level
application-access scoping, a validated state machine, an append-only audit trail, prompt-injection defenses, and a
documented list of known gaps (no rate limiting, no CSRF token, no static enforcement that every route checks auth).

## Limitations

- Document "upload" is a demo text stand-in — there is no real file storage (see `docs/security.md`).
- The `anthropic`/`openai`/`google` providers are implemented but were **not empirically verified against live
  APIs** in this environment (no API keys available). The mock provider was used for all automated testing.
- The UI itself is English-only; the AI layer's multilingual support (`en`/`hi`/`mr`) is not yet wired to a UI
  language switcher — see [`docs/multilingual.md`](docs/multilingual.md).
- No rate limiting, no CSRF token, no automated cross-route auth test suite — see `docs/threat-model.md`.
- GitHub Actions CI has not been independently verified running on GitHub's infrastructure as of this writing (it
  runs the same commands verified locally: lint, typecheck, unit tests, build, e2e).

## Roadmap

- Wire a real AI provider key into CI and build the scored evaluation harness described in `docs/evaluation.md`.
- UI language switcher backed by `next-intl`, connected to the AI layer's existing `language` parameter.
- Rate limiting on auth and AI endpoints.
- A `middleware.ts`-level or automated-test-level guarantee that every API route enforces authentication.
- Real file storage (with content-type validation and scanning) for document uploads.

## Disclaimer

CivicFlow is a demonstration platform. All services, citizens, departments, rules, and applications are synthetic.
No content in this repository represents an actual government program, an actual eligibility determination, or
legal/financial advice. Do not use this software to make real decisions about real public benefits.
