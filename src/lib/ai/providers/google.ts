import { AIProvider, GroundedRequest } from "../types";
import { buildSystemPrompt, buildUserPrompt } from "../prompt";

export const googleProvider: AIProvider = {
  name: "google",
  isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_API_KEY);
  },
  async generate(request: GroundedRequest): Promise<string> {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
    const model = client.getGenerativeModel({
      model: process.env.GOOGLE_MODEL || "gemini-1.5-flash",
      systemInstruction: buildSystemPrompt(),
    });
    const result = await model.generateContent(buildUserPrompt(request));
    const text = result.response.text();
    if (!text) throw new Error("Google provider returned no content");
    return text;
  },
};
