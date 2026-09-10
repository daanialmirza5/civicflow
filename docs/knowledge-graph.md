# Knowledge graph

Source: `src/lib/graph/`. UI: `src/app/graph/[id]/page.tsx` (React Flow).

## Entities and relationships

```
Citizen --ELIGIBLE_FOR--> Service --PROVIDED_BY--> Department
Service --REQUIRES--> EligibilityRule (leaf condition labels)
Service --REQUIRES--> Requirement --SATISFIED_BY--> Document
Application --APPLICATION_FOR--> Service
Application --REQUIRES--> Document
```

## Why the graph is computed, not stored

There is no separate graph database. `buildServiceGraph()` (`src/lib/graph/build.ts`) is a pure function that takes
already-loaded relational data (a `Service` with its department, rule labels, requirements, and optionally a live
`Application`'s documents) and produces `{ nodes, edges }`. At this data scale, a real graph database would add
operational complexity without a performance benefit — this is documented as the deliberate trade-off (see
`docs/architecture.md`#what-was-deliberately-not-built).

## Layout

`src/lib/graph/layout.ts` assigns each node a deterministic column based on its `kind` (`CITIZEN`, `APPLICATION`,
`SERVICE`, `DEPARTMENT`, `RULE`, `REQUIREMENT`, `DOCUMENT`) and a row within that column, so the same service always
renders in the same layout without needing a force-directed layout library.

## Rendering

`src/app/graph/[id]/page.tsx` feeds the computed nodes/edges into `reactflow`, colors nodes by `kind`, and shows a
detail panel on node click (build brief §17/§45: "click nodes to inspect details").
