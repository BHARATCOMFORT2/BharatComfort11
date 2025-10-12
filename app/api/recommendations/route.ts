// app/api/ai/recommendations/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit, doc, getDoc } from "firebase/firestore";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // 1️⃣ Get user data
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    // 2️⃣ Get bookings
    const bookingsRef = collection(db, "bookings");
    const bookingsQuery = query(bookingsRef, where("userId", "==", userId), limit(5));
    const bookingSnap = await getDocs(bookingsQuery);

    const pastDestinations = bookingSnap.docs.map((doc) => doc.data().listingName);
    const userInterests = userData?.interests || [];

    // 3️⃣ Prepare AI context
    const context = `
User Name: ${userData?.name || "Traveler"}
Past destinations: ${pastDestinations.join(", ") || "none"}
Interests: ${userInterests.join(", ") || "adventure, beaches, culture"}
Preferred travel type: ${userData?.travelType || "mixed"}
`;

    // 4️⃣ Call OpenAI securely on the server
    const prompt = `
You are BharatComfort's smart travel assistant.
Based on this user context:
${context}

Suggest 3 personalized Indian travel destinations.
Respond in pure JSON format:
[
  {
    "title": "Destination Name",
    "description": "Why it's perfect for this user",
    "image": "Public image URL (if known)"
  }
]
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        { role: "system", content: "You are a travel expert recommending personalized destinations." },
        { role: "user", content: prompt },
      ],
    });

    let content = completion.choices[0].message?.content?.trim() || "[]";
    let aiData: any[] = [];

    try {
      aiData = JSON.parse(content);
    } catch {
      aiData = [];
    }

    // 5️⃣ Fallback (if OpenAI fails or gives invalid JSON)
    if (!aiData?.length) {
      aiData = [
        {
          title: "Munnar, Kerala",
          description: "Perfect for your love of greenery, tea estates, and misty mountains.",
          image: "/ai/munnar.jpg",
        },
        {
          title: "Rajasthan Heritage Trail",
          description: "Explore royal palaces, forts, and deserts — ideal for cultural travelers.",
          image: "/ai/rajasthan.jpg",
        },
        {
          title: "Andaman Islands",
          description: "For your interest in beaches and serene coastal experiences.",
          image: "/ai/andaman.jpg",
        },
      ];
    }

    return NextResponse.json({ success: true, data: aiData });
  } catch (error) {
    console.error("AI recommendations error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
