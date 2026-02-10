import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function summarizeMeeting(text: string): Promise<string> {
  const { text: summary } = await generateText({
    model: openrouter("google/gemini-2.5-flash-lite"),
    system:
      "You summarize meeting notes into 3-5 concise markdown bullet points. Only output the bullet points, nothing else.",
    prompt: text,
  });

  return summary.trim();
}
