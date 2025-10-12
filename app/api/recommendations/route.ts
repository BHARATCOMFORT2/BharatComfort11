import { NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

export async function POST(req: Request) {
  if (!apiKey) {
    return NextResponse.json({
      data: [
        { title: "Munnar, Kerala", description: "Beautiful hill station in Kerala." },
      ],
      warning: "OpenAI API key missing",
    });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const { prompt } = await req.json();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0].message?.content?.trim() || "[]";

    let aiData: any[] = [];
    try {
      aiData = JSON.parse(content);
    } catch {
      aiData = [];
    }

    if (!aiData.length) {
      aiData = [{ title: "Munnar, Kerala", description: "Beautiful hill station in Kerala." }];
    }

    return NextResponse.json({ data: aiData });
  } catch (err) {
    console.error("OpenAI API error:", err);
    return NextResponse.json({
      data: [{ title: "Munnar, Kerala", description: "Beautiful hill station in Kerala." }],
      error: "Failed to fetch AI recommendations",
    });
  }
}
