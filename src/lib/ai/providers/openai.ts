import { AIProvider, GroundedRequest } from "../types";
import { buildSystemPrompt, buildUserPrompt } from "../prompt";

export const openaiProvider: AIProvider = {
  name: "openai",
  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  },
  async generate(request: GroundedRequest): Promise<string> {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: 512,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(request) },
      ],
    });
    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("OpenAI returned no content");
    return text;
  },
};
