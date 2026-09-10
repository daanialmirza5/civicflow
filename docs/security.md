# Security

## Authentication

Password-based, `bcryptjs` hashing (`src/lib/auth/password.ts`), JWT session tokens (`jose`, HS256) signed with
`AUTH_SECRET` (`src/lib/auth/session.ts`). The session is stored in an `httpOnly`, `sameSite=lax` cookie. `Secure`
is opt-in via `COOKIE_SECURE=true` (only when actually deployed behind HTTPS) — an earlier version of this app
defaulted `Secure` to `NODE_ENV === "production"`, which silently broke login for anyone running `npm run start`
over plain `http://localhost` (a Secure cookie is never sent over an insecure origin). Fixed before this was shipped
— see the git history for `src/lib/auth/session.ts`.

## Authorization (RBAC + scoped access)

`src/lib/auth/rbac.ts`: `requireSession()` (any authenticated user) and `requireRole(...roles)` (specific roles),
used at the top of every protected API route. Beyond role checks, `src/lib/workflow/access.ts`'s
`assertApplicationAccess(session, applicationId)` enforces **row-level scoping**: a citizen may only read/act on an
`Application` tied to their own `CitizenProfile`; staff may access any. Every application-scoped route
(`/api/applications/[id]`, `/documents`, `/submit`, the AI `/ask` route when an `applicationId` is supplied) calls
this before touching the record — this is the "unauthorized application access" control tested informally via the
route implementations and exercised by the e2e suite's role-switching tests.

## Input validation

Every API route validates its request body with `zod` before touching the database. Validation failures surface as
structured `400`s via `src/lib/errors.ts`, not raw exceptions.

## Structured errors, no stack traces

`src/lib/errors.ts`'s `toErrorResponse()` maps known domain errors (`UnauthorizedError`, `ForbiddenError`,
`InvalidTransitionError`, `AppError`) to `{ error: { code, message } }` with the right HTTP status, and any
unrecognized error to a generic `500` with `console.error` server-side logging only — never a leaked stack trace or
internal message to the client.

## Audit trail

`src/lib/audit.ts`'s `recordAuditEvent()` is the only way to write an `AuditEvent`, and there is deliberately no
update/delete helper exported from that module. Every consequential mutation (profile update, application created,
status transition, document uploaded/verified, AI recommendation reviewed) calls it once, after the underlying
write succeeds, recording actor, action, entity, previous/next state, and an optional reason.

## Prompt-injection defense

See `docs/ai-architecture.md`#prompt-injection-defense. Summary: evidence and user questions are explicitly fenced
as untrusted data in the system prompt; the model has no tool access to mutate anything; and output is validated
against direct-action-claim patterns before being returned or stored.

## Secrets

No secret is committed. `.env` is gitignored; `.env.example` documents every variable with no real values. AI
provider keys are read from environment variables only, never hardcoded, and the app runs correctly with none of
them set (`AI_PROVIDER=mock`).

## Human-in-the-loop for consequential AI output

See `docs/ai-architecture.md`#human-in-the-loop. The AI cannot approve, reject, or otherwise mutate an application;
only a case worker (`POST /api/applications/[id]/transition`) or the owning citizen (`POST
/api/applications/[id]/submit`) can.

## Known limitation: `prisma` CLI dev-dependency vulnerabilities

`npm audit` reports high-severity advisories in `deepmerge-ts` and `mysql2`, both transitive dev-time dependencies
of the `prisma` CLI's config loader (`@prisma/config`), not of `@prisma/client` (what actually runs in the deployed
app). These affect `prisma migrate`/`db push` tooling, not runtime request handling, and this app doesn't use MySQL
at all. Pinning to an older `prisma` version doesn't resolve it either — `npm audit fix` recommends progressively
older 6.x releases with no fixed version currently published (checked at build time: 2026-09). Documented here
rather than silently ignored.

## Demo-only document "upload"

There is no real file storage. `ApplicationDocument.synthesizedContent` is a short text stand-in supplied by the
citizen (build brief §3/§19's synthetic-data requirement). This content is treated as inert data throughout — it is
never executed, and if ever surfaced to the AI layer, it would be evidence data, fenced the same way as any other
untrusted input (see prompt-injection defense above). A real deployment would need actual file storage with
antivirus scanning and content-type validation before this becomes anything but a demo.
