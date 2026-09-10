import { AIProvider, AIProviderName, GroundedAnswer, GroundedRequest } from "./types";
import { mockProvider } from "./providers/mock";
import { anthropicProvider } from "./providers/anthropic";
import { openaiProvider } from "./providers/openai";
import { googleProvider } from "./providers/google";

const PROVIDERS: Record<Exclude<AIProviderName, "mock">, AIProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  google: googleProvider,
};

function resolveProvider(): AIProvider {
  const preferred = (process.env.AI_PROVIDER as AIProviderName | undefined) ?? "mock";
  if (preferred !== "mock") {
    const provider = PROVIDERS[preferred as Exclude<AIProviderName, "mock">];
    if (provider?.isConfigured()) return provider;
  }
  // Auto-detect: use the first configured real provider, else fall back to mock.
  for (const provider of Object.values(PROVIDERS)) {
    if (provider.isConfigured()) return provider;
  }
  return mockProvider;
}

/**
 * Output validation: reject anything that reads like a direct system
 * action rather than an explanation. The AI has no tool wired to mutate
 * application state, so this is defense in depth, not the only control —
 * see docs/security.md.
 */
const FORBIDDEN_ACTION_PATTERNS = [
  /\bi (hereby )?approve\b/i,
  /\bapplication (is|has been) approved\b/i,
  /\byour application is now approved\b/i,
];

function validateAnswer(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Empty AI response");
  if (FORBIDDEN_ACTION_PATTERNS.some((p) => p.test(trimmed))) {
    throw new Error("AI response contained a disallowed direct-action claim");
  }
  return trimmed;
}

export async function askCivicAssistant(request: GroundedRequest): Promise<GroundedAnswer> {
  const provider = resolveProvider();
  try {
    const raw = await provider.generate(request);
    const answer = validateAnswer(raw);
    return { agent: request.agent, answer, evidence: request.evidence, provider: provider.name, usedFallback: false };
  } catch {
    const fallback = await mockProvider.generate(request);
    return { agent: request.agent, answer: fallback, evidence: request.evidence, provider: "mock", usedFallback: true };
  }
}
