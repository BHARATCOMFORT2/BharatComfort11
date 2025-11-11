// /app/api/admin/ai-insights/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { generateAdminInsights } from "@/lib/ai/adminInsights";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);

    const role = (decoded as any).role || "partner";
    if (role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const result = await generateAdminInsights();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("AI Insights Error:", err);
    return NextResponse.json(
      { error: "Failed to generate admin insights" },
      { status: 500 }
    );
  }
}
