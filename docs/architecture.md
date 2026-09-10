# Architecture

CivicFlow is a single Next.js (App Router) application written in TypeScript. This is a deliberate choice over the
multi-service `apps/api` + `apps/web` layout sometimes used for GovTech platforms: at this scale, a coherent
full-stack TypeScript app is more maintainable than a distributed system with nothing yet to distribute (see
"Recommended technology" in the build brief, which explicitly allows this trade-off).

## Layers

```
                    CITIZEN
                       |
                       v
                PROFILE (CitizenProfile)
                       |
                       v
              ELIGIBILITY ENGINE          <- src/lib/eligibility
                       |
              +--------+--------+
              v                 v
       SERVICE CATALOG      KNOWLEDGE GRAPH   <- src/lib/graph
              |                 |
              +--------+--------+
                       v
                APPLICATION ENGINE          <- src/lib/workflow
                       |
          +------------+------------+
          v            v            v
      Documents     Deadlines    Blockers
          |            |            |
          +------------+------------+
                       v
                 AI ORCHESTRATOR            <- src/lib/ai
                       |
                       v
                 Evidence Layer
                       |
                       v
                Human Approval              <- AIRecommendation.status
                       |
                       v
                 Audit System                <- src/lib/audit.ts
```

## Directory layout

```
civicflow/
  prisma/
    schema.prisma      # domain model (see docs/domain-model.md)
    seed.ts             # synthetic demo data generator
  src/
    app/                # Next.js routes: pages + API route handlers
      api/               # REST-ish JSON API (see route handlers per resource)
      (pages)/           # citizen + staff UI
    lib/
      eligibility/        # deterministic rules engine (docs/eligibility-engine.md)
      workflow/            # application state machine, blocker engine, deadlines
      graph/                # knowledge graph builder + layout (docs/knowledge-graph.md)
      ai/                    # provider abstraction, evidence collectors, orchestrator
      auth/                   # password hashing, JWT sessions, RBAC
      analytics/               # bottleneck/status aggregation (pure functions)
      db.ts                     # Prisma client singleton
      audit.ts                   # append-only audit log writer
      errors.ts                   # structured API error mapping
    components/            # shared UI primitives (Button, Card, Badge, NavBar...)
  tests/
    unit/                 # vitest — engine logic
    e2e/                   # playwright — full user journeys
  docs/                     # this folder
  .github/workflows/ci.yml   # lint, typecheck, unit + e2e tests, build
```

## Why this structure

- **Domain logic is framework-independent.** Everything under `src/lib/eligibility`, `src/lib/workflow`,
  `src/lib/graph`, and `src/lib/analytics` is pure TypeScript with no Next.js or Prisma imports (except the small
  `loadService.ts` / `applicationDetail.ts` data-loading adapters). This is what makes it unit-testable without a
  database and reusable from both API routes and the AI evidence collectors.
- **The database is the source of truth for state; the engines are the source of truth for logic.** An
  `Application.status` column is just data. Whether `DRAFT -> APPROVED` is a legal transition is decided by
  `src/lib/workflow/stateMachine.ts`, not by convention scattered across route handlers.
- **The AI layer is a thin, replaceable shell around the engines.** See `docs/ai-architecture.md`.

## Data flow example: "why is this application blocked?"

1. `GET /api/applications/[id]` loads the `Application` + its `ApplicationDocument[]` from Postgres/SQLite via
   Prisma (`src/lib/workflow/applicationDetail.ts`).
2. It calls `deriveBlockers()` (`src/lib/workflow/blockers.ts`) — a pure function — against the *live* document
   statuses. Blockers are **never** trusted from a stale database column; they are recomputed on every read.
2. The UI (`src/app/applications/[id]/BlockersPanel.tsx`) renders the causal chain returned by that function.
3. If the citizen asks the AI assistant "why is this blocked?", `src/lib/ai/evidence.ts` calls the exact same
   `loadApplicationDetail` + `deriveBlockers` pipeline to build the `EvidenceItem[]` handed to the LLM. The AI
   never has its own view of "blocked" — it can only describe what the engine already computed.

## Switching to PostgreSQL

`prisma/schema.prisma` defaults to `provider = "sqlite"` for zero-setup local development. To run against
PostgreSQL: change that line to `provider = "postgresql"`, point `DATABASE_URL` at a real instance (see
`docker-compose.yml`), and run `npx prisma db push`. No application code changes are required — every model uses
only cross-database-compatible field types.

## What was deliberately not built

Per the build brief's own prioritization (§73: "prioritize a working domain engine over advanced infrastructure"),
the following are documented as roadmap rather than implemented: a real file-storage-backed document upload
(documents are demo text stand-ins, see `docs/security.md`), a dedicated graph database (the knowledge graph is
computed on read from relational data, which is sufficient at this scale), and a job queue for async AI calls
(requests are synchronous, acceptable given the mock-by-default provider and short real-provider latencies).
