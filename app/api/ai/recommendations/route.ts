export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/ai/recommendations/route.ts
export const runtime = "nodejs"; // ✅ ensure full Node runtime for OpenAI SDK

import { NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * 🤖 AI Destination Recommendations
 * Accepts a user prompt and returns a curated list of destinations.
 */
export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  /* -------------------------------------------------------------
     🚫 1. Fallback if API key missing
  ------------------------------------------------------------- */
  if (!apiKey) {
    console.warn("⚠️ Missing OPENAI_API_KEY — using fallback data");
    return NextResponse.json({
      ok: true,
      data: [
        {
          title: "Munnar, Kerala",
          description: "Beautiful hill station in Kerala surrounded by tea gardens.",
        },
        {
          title: "Manali, Himachal Pradesh",
          description: "Snow-covered mountains and adventure sports in North India.",
        },
      ],
      warning: "Using static fallback data (no API key).",
    });
  }

  /* -------------------------------------------------------------
     ⚙️ 2. Initialize OpenAI SDK
  ------------------------------------------------------------- */
  const openai = new OpenAI({ apiKey });

  try {
    const { prompt } = await req.json();
    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({
        ok: false,
        error: "Prompt is required",
      });
    }

    /* -------------------------------------------------------------
       💬 3. Request completion
    ------------------------------------------------------------- */
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are BharatComfort11’s AI travel planner. Reply in JSON array format with travel destination suggestions, each having title and description fields only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const content = completion.choices[0].message?.content?.trim() || "[]";

    /* -------------------------------------------------------------
       🧠 4. Parse response or fallback gracefully
    ------------------------------------------------------------- */
    let aiData: any[] = [];
    try {
      aiData = JSON.parse(content);
    } catch {
      console.warn("⚠️ AI response not valid JSON, using fallback data");
      aiData = [
        {
          title: "Munnar, Kerala",
          description: "Beautiful hill station in Kerala surrounded by tea gardens.",
        },
      ];
    }

    if (!Array.isArray(aiData) || aiData.length === 0) {
      aiData = [
        {
          title: "Munnar, Kerala",
          description: "Beautiful hill station in Kerala surrounded by tea gardens.",
        },
      ];
    }

    return NextResponse.json({ ok: true, data: aiData });
  } catch (error: any) {
    console.error("❌ OpenAI API error:", error);
    return NextResponse.json({
      ok: false,
      error: "Failed to generate AI recommendations",
      data: [
        {
          title: "Munnar, Kerala",
          description: "Beautiful hill station in Kerala surrounded by tea gardens.",
        },
      ],
    });
  }
}
