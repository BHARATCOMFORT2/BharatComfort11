import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const session = cookie
      .split("; ")
      .find((c) => c.startsWith("__session="))
      ?.replace("__session=", "");

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { adminAuth, adminDb } = getFirebaseAdmin();
    const decoded = await adminAuth.verifySessionCookie(session, true);

    // 🔒 optional: admin-only check
    // if (decoded.role !== "admin") throw new Error("Forbidden");

    const snap = await adminDb.collection("listings").get();
    const listings = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({ success: true, listings });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
