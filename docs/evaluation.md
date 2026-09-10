# Evaluation

## Eligibility engine (build brief §57)

`tests/unit/eligibility.test.ts` is a table of cases with known expected outcomes, covering:

- `AND` logic: all-satisfied -> `MATCH`; a known failure -> `NOT_MATCH` even with other fields missing; a missing
  field with nothing yet failed -> `INCOMPLETE`.
- `OR` logic: any-satisfied -> `MATCH`; one failed + one missing -> `INCOMPLETE` (not `NOT_MATCH` — the engine
  never guesses); both known-failed -> `NOT_MATCH`.
- `NOT` logic, including that a missing underlying field still propagates as `INCOMPLETE` rather than an
  arbitrary default.
- `IN`/`NOT_IN` membership.
- Nested `AND(OR(...))` composition (a realistic multi-branch rule).

`tests/unit/discovery.test.ts` covers the service-ranking formula: a full `MATCH` outranks an `INCOMPLETE` service,
and a `NOT_MATCH` service sinks to the bottom without being removed from the result set.

Run: `npm run test`. As of this writing: **31/31 unit tests passing** (also covering the state machine, blocker
engine, deadline classifier, and bottleneck aggregation — see those files under `tests/unit/`).

## AI assistant (build brief §56)

**What exists:** `tests/e2e/ai-assistant.spec.ts` drives a real browser through asking "Why is my application
blocked?" against the seeded flagship blocked application, and asserts that (a) an answer is returned, (b) the
provider badge is shown (`mock` in CI, since no API key is configured), and (c) the evidence panel — sourced from
`STRUCTURED_APPLICATION_RECORD` and `STRUCTURED_DOCUMENT_RECORD` — is visible and non-empty. This is a grounding
smoke test, not a scored evaluation harness.

**What does not exist, honestly:** a real evaluation suite that runs a bank of synthetic questions (the kind listed
in build brief §56: "Why am I potentially eligible?", "What documents are missing?", "Which rule prevented
eligibility?") against a real LLM provider and scores evidence grounding / unsupported-claim rate / structured
output validity was **not built**. Building it meaningfully requires either a real provider (which needs an API key
this environment doesn't have — see `docs/ai-architecture.md`#what-was-not-empirically-verified) or scoring the mock
provider (whose answers are template-generated from the evidence and therefore trivially "grounded" by
construction, making a real evaluation score meaningless). Fabricating pass/fail numbers here would violate the
build brief's own instruction (§56/§75: "Never invent evaluation results").

**Next engineering milestone:** wire a real provider key into a CI secret, write ~15 synthetic Q&A cases covering
each agent, and score them with a simple rubric (does the answer reference the evidence's specific values; does it
avoid unsupported claims outside the evidence). Track the unsupported-claim rate as a regression gate.

## Security (build brief §58)

Exercised informally through the route implementations described in `docs/security.md` and `docs/threat-model.md`
(row-level `assertApplicationAccess`, RBAC via `requireRole`, state-machine transition guards). A dedicated
automated security test suite (hitting every route unauthenticated / as the wrong role / with tampered payloads and
asserting the correct 401/403/409) was **not built** — see `docs/threat-model.md`'s "Known gaps" for the specific
item ("no static enforcement that every route checks auth").
