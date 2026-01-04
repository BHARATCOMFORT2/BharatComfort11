import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import admin from "firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------------------------------
   GET LEADS BY STATUS (STAFF)
   status = interested | callback
---------------------------------------- */
export async function GET(req: Request) {
  try {
    /* -------------------------------
       1️⃣ AUTHORIZATION
    -------------------------------- */
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // ✅ FIX: revocation check OFF (stable for dashboard APIs)
    const decoded = await adminAuth.verifyIdToken(token);
    const staffId = decoded.uid;

    /* -------------------------------
       2️⃣ READ QUERY PARAM
    -------------------------------- */
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    if (!status || !["interested", "callback"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid status" },
        { status: 400 }
      );
    }

    /* -------------------------------
       3️⃣ FIRESTORE QUERY
       - primary query with orderBy
       - fallback without orderBy (index safe)
    -------------------------------- */
    let snap;

    try {
      let queryRef = adminDb
        .collection("leads")
        .where("assignedTo", "==", staffId)
        .where("status", "==", status);

      if (status === "callback") {
        queryRef = queryRef.orderBy("followupDate", "asc");
      } else {
        queryRef = queryRef.orderBy("updatedAt", "desc");
      }

      snap = await queryRef.get();
    } catch (err) {
      console.error("⚠️ Firestore index missing, using fallback", err);

      // 🔁 Fallback without orderBy (no index required)
      snap = await adminDb
        .collection("leads")
        .where("assignedTo", "==", staffId)
        .where("status", "==", status)
        .get();
    }

    /* -------------------------------
       4️⃣ MAP RESPONSE
       - frontend compatible fields
    -------------------------------- */
    const leads = snap.docs.map((doc) => {
      const d = doc.data();

      return {
        id: doc.id,
        name: d.name || null,
        businessName: d.businessName || null,

        // ✅ frontend compatibility
        phone: d.phone || d.mobile || null,
        mobile: d.mobile || d.phone || null,

        city: d.city || null,
        status: d.status || null,

        followupDate: d.followupDate
          ? d.followupDate.toDate().toISOString()
          : null,

        updatedAt: d.updatedAt
          ? d.updatedAt.toDate().toISOString()
          : null,

        lastNote: d.lastNote || null,
      };
    });

    /* -------------------------------
       5️⃣ RESPONSE
    -------------------------------- */
    return NextResponse.json({
      success: true,
      leads,
    });
  } catch (error) {
    console.error("❌ by-status API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch leads",
      },
      { status: 500 }
    );
  }
}
