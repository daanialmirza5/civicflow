# Threat model

Lightweight STRIDE-style pass over CivicFlow's actual attack surface. This is a demo platform with synthetic data,
so the emphasis is on the controls that would matter if this pattern were extended toward production, not on
exhaustive enterprise threat modeling.

| Threat | Vector | Mitigation | Status |
|---|---|---|---|
| Spoofing | Forged session cookie | JWT signed with `AUTH_SECRET` (HS256), `httpOnly` cookie | Implemented |
| Spoofing | Credential stuffing / weak passwords | `bcrypt` hashing, min-length validation on registration | Implemented; no rate limiting yet (see below) |
| Tampering | Citizen edits another citizen's application via API | `assertApplicationAccess` scoped ownership check on every application route | Implemented |
| Tampering | Citizen or case worker forces an illegal status transition | `assertTransition` state-machine guard, server-side only | Implemented |
| Tampering | AI output used to silently approve/change an application | AI has no mutation tool; output validated against direct-action-claim patterns; human review required for any AI answer to count as "approved" | Implemented |
| Repudiation | A case worker denies having verified a document or changed a status | Append-only `AuditEvent` + `ApplicationEvent` timeline records actor, action, before/after | Implemented |
| Information disclosure | Citizen A reads citizen B's application/profile | Row-level `assertApplicationAccess`; profile routes scoped to `session.userId` | Implemented |
| Information disclosure | Internal error messages/stack traces leaked to the client | `toErrorResponse()` returns only `{ code, message }`, logs full error server-side | Implemented |
| Information disclosure | Prompt injection exfiltrates instructions or other citizens' data via the AI assistant | Evidence collectors only ever fetch data the *current* session is authorized to see (they're called after `assertApplicationAccess`); prompt fences evidence/question as untrusted data | Implemented |
| Denial of service | Unbounded AI or search requests | Not implemented — see "Known gaps" | Documented gap |
| Elevation of privilege | Citizen self-registers as staff | `POST /api/auth/register` hardcodes `role: CITIZEN`; staff accounts only exist via seed data, provisioned out-of-band | Implemented |
| Elevation of privilege | A route forgets its `requireRole`/`requireSession` check | Every route handler under `src/app/api/` calls one at the top; reviewed during development, not statically enforced | Partial — see "Known gaps" |

## Known gaps (documented, not fixed — consistent with build brief §73)

- **No rate limiting.** Login, registration, and AI-ask endpoints have no throttling. In a real deployment this
  would need per-IP/per-account limits, especially on `/api/auth/login` (brute force) and `/api/ai/ask` (cost
  control against a real LLM provider).
- **No CSRF token.** Mutating routes rely on `sameSite=lax` cookies plus JSON `Content-Type` requirements (which
  browsers won't send cross-site without a preflight for state-changing methods), but there is no explicit
  double-submit CSRF token. Acceptable for a same-origin SPA demo; would need hardening for production.
- **No static enforcement that every route checks auth.** The convention ("every handler calls `requireSession`/
  `requireRole` first") is manual, not enforced by a middleware or lint rule. A `middleware.ts` gate or an
  integration test that hits every route unauthenticated and asserts `401` would close this gap — flagged as
  next-engineering-milestone material in the README.
- **No malware/content scanning on "uploaded" documents.** Not applicable yet since there is no real file storage
  (see `docs/security.md`#demo-only-document-upload), but would be required before this becomes a real upload flow.
