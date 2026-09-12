# CivicFlow — Engineering Guide & Mastery Document

## 1. What Is CivicFlow?
CivicFlow is an **intelligent GovTech public service navigation and citizen journey platform**. It transforms confusing bureaucratic welfare, housing, licensing, and grant applications into transparent, step-by-step citizen pathways. It models government administrative rules as a directed knowledge graph, computes personalized eligibility criteria, generates required document checklists, and provides multi-lingual guidance.

*Disclaimer: CivicFlow is a demonstration GovTech prototype operating on synthetic administrative schemas.*

## 2. Real-World Problem Solved
1. **Administrative Friction & Exclusion**: Low-income citizens fail to access entitled social benefits due to opaque legalese and confusing requirements.
2. **Missing Prerequisite Documentation**: Citizens arrive at physical government offices missing prerequisite affidavits or proofs of residency.
3. **Language & Literacy Barriers**: Administrative portals lack localized, clear language adaptations for diverse demographic groups.
4. **Siloed Public Service Data**: Benefits across municipal, state, and federal levels are disconnected with zero unified journey tracking.

## 3. High-Level Architecture
- **Frontend & App**: Next.js 14, TypeScript, Tailwind CSS, Radix UI.
- **Core Domain Engines**:
  - `eligibility-engine.ts`: Rule-based evaluation engine evaluating household income, residency duration, and family size constraints.
  - `knowledge-graph.ts`: Directed graph of public programs, qualifying criteria, prerequisite documents, and application steps.
  - `application-workflow.ts`: State machine managing multi-stage application progression (Draft, Evidence Gathering, Ready, Submitted).
- **AI Assistant**: Grounded multilingual administrative guide explaining application steps using deterministic rule graph context.
- **Data & Testing**: Prisma ORM with SQLite/PostgreSQL; Vitest unit suite and Playwright E2E tests.

## 4. Algorithmic Complexity & Rule Engine Logic
- **Eligibility Rule Graph**: Boolean expression tree traversal evaluating criteria nodes in O(N) time where N is the number of program conditions.
- **Document Prerequisite Resolution**: Topological ordering ensuring foundation documents (e.g., Birth Certificate, ID) are requested before dependent permits.

## 5. Security & Citizen Privacy
- Client-side data minimization: Citizen financial and demographic records are evaluated in-session without persistent cloud profiling.
- Zero PII passed to third-party LLM providers.

## 6. Testing Strategy
- Vitest unit tests covering eligibility edge cases (income thresholds, age gates, residency requirements) and application state transitions.
