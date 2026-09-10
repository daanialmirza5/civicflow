# Eligibility engine

Source: `src/lib/eligibility/`. Tests: `tests/unit/eligibility.test.ts`, `tests/unit/discovery.test.ts`.

## Principle

The eligibility engine is **deterministic**. It is a small boolean-logic interpreter over a JSON rule tree — never
an LLM call. The build brief is explicit about this (§10): "Do NOT ask an LLM: 'Does this person qualify?'"

## Rule tree shape

```ts
type RuleNode = ConditionRule | AllRule | AnyRule | NotRule;

interface ConditionRule {
  field: string;              // e.g. "annualIncome"
  operator: ">=" | "<=" | "=" | "!=" | ">" | "<" | "IN" | "NOT_IN";
  value: string | number | boolean | Array<string | number>;
  label: string;               // human-readable, shown in the UI
}
interface AllRule { all: RuleNode[] }   // AND
interface AnyRule  { any: RuleNode[] }   // OR
interface NotRule  { not: RuleNode }      // NOT
```

Rule trees are stored as JSON on `EligibilityRuleSet.rules` and can nest arbitrarily (`AllRule` containing an
`AnyRule` containing further conditions, etc. — see `tests/unit/eligibility.test.ts`'s nested-composition case).

## Ternary logic, not boolean

Every condition evaluates to one of three outcomes, never just true/false:

- `SATISFIED`
- `NOT_SATISFIED`
- `MISSING_INFORMATION` — the referenced profile field is `null`/`undefined`

This propagates through `AND`/`OR`/`NOT`:

- `AND`: `NOT_SATISFIED` wins over `MISSING_INFORMATION` (a known failure is reported before an unknown one).
- `OR`: `SATISFIED` wins over `MISSING_INFORMATION`.
- `NOT`: inverts `SATISFIED`/`NOT_SATISFIED`; `MISSING_INFORMATION` stays missing.

The overall verdict is one of:

- `MATCH` — root node evaluated `SATISFIED`.
- `NOT_MATCH` — root node evaluated `NOT_SATISFIED` (something is known to fail).
- `INCOMPLETE` — root node evaluated `MISSING_INFORMATION` (nothing has failed yet, but the profile is incomplete).

This is why the UI never says "you are not eligible" when a citizen simply hasn't filled in their income — it says
their profile is incomplete and names the missing field(s).

## Completeness, not a probability

`EligibilityResult.completeness` is `(conditions with a known value) / (total conditions) * 100`. This is
explicitly **not** an approval probability (build brief §12). The UI labels it "eligibility profile N% complete."

## Service ranking (discovery)

`src/lib/eligibility/discovery.ts` ranks services for "what services might apply to me?" with a documented,
non-black-box formula:

```
score = satisfiedCount * 100
      + completeness
      + servicePriority * 5
      - missingFields.length * 10
      - (verdict === "NOT_MATCH" ? 10_000 : 0)
```

`NOT_MATCH` services sink to the bottom of the list but are never hidden — a citizen can still see why a service
didn't match (`tests/unit/discovery.test.ts` asserts this).

## "What if my situation changes?"

`POST /api/services/[id]/eligibility` accepts an optional `overrides` object. The API merges it over the citizen's
real profile fields *in memory only* and re-runs `evaluateEligibility` — it never writes to `CitizenProfile`. This
backs the "what-if" explorer on the service detail page (build brief §50).
