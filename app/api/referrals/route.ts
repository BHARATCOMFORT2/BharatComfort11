import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const session = cookie.split("__session=")[1]?.split(";")[0];

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(session, true);
    const uid = decoded.uid;

    // Referral code
    const codeDoc = await adminDb.collection("referral_codes").doc(uid).get();
    const referralCode = codeDoc.exists ? codeDoc.data() : null;

    // Referrals
    const refSnap = await adminDb
      .collection("refer_and_earn")
      .where("referrerId", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    const referrals = refSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ referralCode, referrals });
  } catch (err: any) {
    console.error("Referral API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
