export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const sessionCookie = cookie
      .split("; ")
      .find((c) => c.startsWith("__session="))
      ?.replace("__session=", "");

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    /* ---------------------------------------------------
       1️⃣ STAFF — HIGHEST PRIORITY
    ----------------------------------------------------*/
    const staffSnap = await adminDb.collection("staff").doc(uid).get();
    if (staffSnap.exists) {
      const staff = staffSnap.data();

      if (staff?.isApproved === false || staff?.isActive === false) {
        return NextResponse.json(
          { success: false, error: "Staff not approved" },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          role: "staff",
          ...staff,
        },
      });
    }

    /* ---------------------------------------------------
       2️⃣ PARTNER
    ----------------------------------------------------*/
    const partnerSnap = await adminDb.collection("partners").doc(uid).get();
    if (partnerSnap.exists) {
      return NextResponse.json({
        success: true,
        user: { role: "partner", ...partnerSnap.data() },
      });
    }

    /* ---------------------------------------------------
       3️⃣ USER (LOWEST PRIORITY)
    ----------------------------------------------------*/
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (userSnap.exists) {
      return NextResponse.json({
        success: true,
        user: { role: "user", ...userSnap.data() },
      });
    }

    /* ---------------------------------------------------
       4️⃣ FALLBACK
    ----------------------------------------------------*/
    return NextResponse.json({
      success: true,
      user: { role: "user" },
    });
  } catch (e: any) {
    console.error("AUTH ME ERROR:", e);
    return NextResponse.json(
      { success: false, error: "Invalid session" },
      { status: 401 }
    );
  }
}
