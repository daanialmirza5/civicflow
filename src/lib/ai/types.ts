// AI layer contracts. The LLM only ever explains evidence that was already
// computed by deterministic engines (eligibility, workflow, blockers,
// deadlines) — it never originates facts. See docs/ai-architecture.md.

export type EvidenceSourceType =
  | "STRUCTURED_ELIGIBILITY_RESULT"
  | "STRUCTURED_APPLICATION_RECORD"
  | "STRUCTURED_DOCUMENT_RECORD"
  | "STRUCTURED_DEADLINE_RECORD";

export interface EvidenceItem {
  sourceType: EvidenceSourceType;
  label: string;
  data: Record<string, unknown>;
}

export type AgentName =
  | "SERVICE_DISCOVERY_AGENT"
  | "ELIGIBILITY_EXPLANATION_AGENT"
  | "DOCUMENT_AGENT"
  | "APPLICATION_AGENT"
  | "DEADLINE_AGENT"
  | "TRANSLATION_AGENT"
  | "CIVIC_NARRATOR";

export interface GroundedRequest {
  agent: AgentName;
  question: string;
  evidence: EvidenceItem[];
  /** ISO 639-1 code; defaults to "en". */
  language?: string;
}

export interface GroundedAnswer {
  agent: AgentName;
  answer: string;
  evidence: EvidenceItem[];
  provider: AIProviderName;
  /** true when the provider call failed and a deterministic fallback summary was used instead. */
  usedFallback: boolean;
}

export type AIProviderName = "anthropic" | "openai" | "google" | "mock";

export interface AIProvider {
  readonly name: AIProviderName;
  isConfigured(): boolean;
  generate(request: GroundedRequest): Promise<string>;
}
