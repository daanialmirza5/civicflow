import { AIProvider, GroundedRequest } from "../types";
import { buildSystemPrompt, buildUserPrompt } from "../prompt";

export const anthropicProvider: AIProvider = {
  name: "anthropic",
  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },
  async generate(request: GroundedRequest): Promise<string> {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 512,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: buildUserPrompt(request) }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("Anthropic returned no text content");
    return textBlock.text;
  },
};
