import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { generatePartnerInsights } from "@/lib/ai/partnerCoach";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const insights = await generatePartnerInsights(uid);
    return NextResponse.json({ success: true, insights });
  } catch (err) {
    console.error("Partner AI insights error:", err);
    return NextResponse.json(
      { error: "Failed to generate partner AI insights" },
      { status: 500 }
    );
  }
}
