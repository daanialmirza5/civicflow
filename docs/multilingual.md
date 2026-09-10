# Multilingual architecture

Build brief §51 asks for a UI that can support English, Hindi, and Marathi without hardcoded English strings
everywhere. This is documented honestly as a **partial implementation with a clear extension point**, not a
finished i18n system — see "What is not done" below.

## What exists

- **AI layer language support end-to-end.** `GroundedRequest.language` (`src/lib/ai/types.ts`, `en` | `hi` | `mr`)
  flows through `buildUserPrompt()` (`src/lib/ai/prompt.ts`), which tells the model the target response language
  by name ("Hindi", "Marathi"), and the `/api/ai/ask` route accepts a `language` parameter validated by `zod`. A
  real provider (Anthropic/OpenAI/Google) will genuinely respond in the requested language; the mock provider
  returns English templates regardless of the requested language (documented limitation, not a silent failure).
- **A `TRANSLATION_AGENT`** exists in the agent enum as the intended place to route "translate this structured
  explanation" requests, per build brief §26.

## What is not done

- The **UI chrome itself** (nav labels, buttons, static page copy) is English-only. There is no `next-intl` /
  `next-i18next` setup, no locale-routing (`/hi/dashboard`), and no translation JSON files. Wiring the AI-side
  language support to actual UI language switching was out of scope for this build pass given the prioritization in
  build brief §73 (working domain engine and workflow over advanced infrastructure).
- Eligibility rule `label` strings and service `name`/`description` fields are stored in English only in the seed
  data; a real localization pass would need either per-locale columns or a translation table.

## Recommended extension path

1. Add `next-intl` (or similar) with `en`/`hi`/`mr` message catalogs for static UI strings.
2. Add a user-selectable language preference (stored on `User` or as a cookie), read by both the UI chrome and
   passed as `language` to `/api/ai/ask`.
3. For rule/service label localization, add a `translations` JSON column (or a `Translation` join table keyed by
   entity + locale) rather than duplicating `Service`/`Requirement` rows per language.
