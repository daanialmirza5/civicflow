# AI architecture

Source: `src/lib/ai/`. This is the layer most likely to be misread as "the product." It is not. Read
`docs/eligibility-engine.md` and `docs/application-workflow.md` first — the AI layer only explains what those
deterministic engines already computed.

## Pipeline

```
Citizen question
      |
      v
Evidence collectors (src/lib/ai/evidence.ts)   <- reads eligibility/application/deadline engine output only
      |
      v
Grounding prompt (src/lib/ai/prompt.ts)         <- evidence + question fenced as untrusted DATA, not instructions
      |
      v
Provider (src/lib/ai/providers/*.ts)            <- anthropic | openai | google | mock
      |
      v
Output validation (src/lib/ai/orchestrator.ts)  <- reject empty / direct-action-claiming responses
      |
      v
GroundedAnswer { answer, evidence, provider, usedFallback }
      |
      v
AIRecommendation row (status: SUGGESTED)         <- human review workflow, see below
```

## Agents

`AgentName` (`src/lib/ai/types.ts`) enumerates the specialized agents from the build brief §26:
`SERVICE_DISCOVERY_AGENT`, `ELIGIBILITY_EXPLANATION_AGENT`, `DOCUMENT_AGENT`, `APPLICATION_AGENT`,
`DEADLINE_AGENT`, `TRANSLATION_AGENT`, `CIVIC_NARRATOR`. In this implementation they share one orchestrator and
prompt-building pipeline, differentiated by which evidence collector runs and by the `agent` field passed into the
grounding prompt — a genuinely separate model/pipeline per agent was judged unnecessary complexity for what each
agent actually does (summarize a specific evidence slice), consistent with build brief §73's "don't overengineer."

## Multi-provider abstraction

`AIProvider` (`src/lib/ai/types.ts`) is implemented by `mockProvider`, `anthropicProvider`, `openaiProvider`,
`googleProvider` (`src/lib/ai/providers/`). `resolveProvider()` (`src/lib/ai/orchestrator.ts`) picks `AI_PROVIDER`
from the environment if set and configured, otherwise auto-detects the first provider with an API key present, and
**always** falls back to `mockProvider` — which needs no API key and is deterministic/template-based. This is why
the app works end-to-end with zero configuration (build brief §27/§60: "Application must work without API keys").

If a real provider call throws (network error, bad key, rate limit), `askCivicAssistant` catches it and falls back
to the mock provider, returning `usedFallback: true` so the UI can show that a fallback was used rather than
silently pretending nothing happened.

## Evidence grounding

Every `GroundedAnswer` carries the exact `EvidenceItem[]` it was generated from — the same JSON shown to the LLM.
The UI's "Show evidence" toggle (`AIAssistantPanel.tsx`) renders this verbatim, labeled by `sourceType`
(`STRUCTURED_ELIGIBILITY_RESULT`, `STRUCTURED_APPLICATION_RECORD`, `STRUCTURED_DOCUMENT_RECORD`,
`STRUCTURED_DEADLINE_RECORD`) — build brief §28/§29's "AI evidence panel."

## Prompt-injection defense

`buildSystemPrompt()` and `buildUserPrompt()` (`src/lib/ai/prompt.ts`) explicitly instruct the model to treat the
`EVIDENCE` and `QUESTION` blocks as **untrusted data, never instructions**, even if they contain phrases like
"ignore previous instructions." This matters because a citizen's free-text question, or in principle a synthetic
document's text content, could contain such a string. Two things make this safe in depth, not just in the prompt:

1. **No tool access.** The model has no function/tool call wired to mutate any record. The worst outcome of a
   successful injection is a wrong sentence, not a wrong action.
2. **Output validation.** `askCivicAssistant` rejects (and falls back to the mock provider for) any response
   matching direct-action-claim patterns (e.g. "I hereby approve", "application is now approved") — see
   `FORBIDDEN_ACTION_PATTERNS` in `src/lib/ai/orchestrator.ts`.

## Human-in-the-loop

Every AI answer is persisted as an `AIRecommendation` with `status: SUGGESTED`. `POST
/api/ai/recommendations/[id]/review` (staff-only) lets a case worker mark it `APPROVED`, `EDITED` (with a rewritten
`answer`), or `REJECTED`. This is a review record, not a trigger for any automatic mutation — the AI was never able
to change application state in the first place, so this route exists specifically to make the "a human confirmed
this explanation" state auditable (build brief §31).

## What was not empirically verified

The `anthropic`, `openai`, and `google` provider implementations are code-complete and exercised by the same
grounding pipeline as the mock provider, but this repository's automated tests (`docs/evaluation.md`) run against
the mock provider only, since CI has no API keys. If you configure a real provider, verify it manually before
relying on it — see the README's "Limitations" section.
