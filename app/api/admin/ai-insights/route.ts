// ✅ Force Next.js to treat this API route as dynamic
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// /app/api/admin/ai-insights/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { generateAdminInsights } from "@/lib/ai/adminInsights";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(request: Request) {
  try {
    // ✅ ensure Firebase Admin is initialized dynamically
    getFirebaseAdmin();

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);

    const role = (decoded as any).role || "partner";
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await generateAdminInsights();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("AI Insights Error:", error);
    return NextResponse.json(
      { error: "Failed to generate admin insights" },
      { status: 500 }
    );
  }
}
