export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("__session="))
        ?.split("=")[1] || "";

    let decoded: any = null;
    if (sessionCookie) {
      decoded = await adminAuth.verifySessionCookie(sessionCookie, true).catch(() => null);
    }

    let role: "admin" | "partner" | "user" = "user";
    if (decoded?.admin === true) role = "admin";
    else if (decoded?.partner === true) role = "partner";

    let queryRef = adminDb.collection("listings");

    if (role === "partner" && decoded?.uid) {
      queryRef = queryRef.where("partnerUid", "==", decoded.uid);
    }

    const snap = await queryRef.get();

    const listings = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({
      success: true,
      role,
      count: listings.length,
      firestoreProject: adminDb.app.options.projectId,
      listings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
