// lib/openai.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function getAITravelIdeas(prompt: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a travel assistant for BharatComfort users." },
      { role: "user", content: prompt },
    ],
  });

  return response.choices[0].message?.content || "";
}
