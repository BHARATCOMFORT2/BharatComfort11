// lib/openai.ts
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Calls OpenAI to get travel recommendations
 */
export async function getAITravelIdeas(context: string) {
  try {
    const prompt = `
You are BharatComfort's AI travel assistant.
Analyze this user's travel history and interests:
"${context}"

Suggest 3 personalized Indian travel destinations.
For each destination, respond in this JSON format:
[
  {
    "title": "Destination Name",
    "description": "Why this is great for the user",
    "image": "Public image URL or path (if known, else empty)"
  }
]
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        { role: "system", content: "You are a smart travel planner." },
        { role: "user", content: prompt },
      ],
    });

    // Try to parse JSON from response
    const content = completion.choices[0].message?.content?.trim() || "[]";
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("OpenAI generation failed:", err);
    return [];
  }
}
