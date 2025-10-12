// app/api/recommendations/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 1️⃣ Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // 2️⃣ Extract the content
    const content = completion.choices[0].message?.content?.trim() || "[]";

    // 3️⃣ Parse AI response safely
    let aiData: any[] = [];
    try {
      aiData = JSON.parse(content);
    } catch {
      aiData = [];
    }

    // 4️⃣ Fallback if OpenAI fails or gives invalid JSON
    if (!aiData?.length) {
      aiData = [
        {
          title: "Munnar, Kerala",
          description: "Beautiful hill station in Kerala, ideal for nature lovers.",
        },
      ];
    }

    return NextResponse.json({ data: aiData });
  } catch (err: any) {
    console.error("OpenAI API error:", err);
    return NextResponse.json({ error: "Failed to fetch AI recommendations" }, { status: 500 });
  }
}
