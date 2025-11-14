// app/api/referrals/route.ts
import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseadmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Extract session cookie
    const cookie = req.headers.get("cookie") || "";
    const session = cookie.split("__session=")[1]?.split(";")[0];

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify session
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const uid = decoded.uid;

    // ------------------------------
    // 🔹 1. Fetch User Referral Code
    // ------------------------------
    const codeRef = adminDb.collection("referral_codes").doc(uid);
    const codeSnap = await codeRef.get();

    const referralCode = codeSnap.exists ? codeSnap.data() : null;

    // ------------------------------
    // 🔹 2. Fetch User Referrals
    // ------------------------------
    const refQuery = adminDb
      .collection("refer_and_earn")
      .where("referrerId", "==", uid)
      .orderBy("createdAt", "desc");

    const refSnap = await refQuery.get();

    const referrals = refSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({
      referralCode,
      referrals,
    });
  } catch (error: any) {
    console.error("❌ Referral API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
